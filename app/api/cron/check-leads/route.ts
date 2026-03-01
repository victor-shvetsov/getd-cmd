import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseLeadEmail } from "@/lib/automations/lead-reply/parse-email";
import { LeadReplyAutomation } from "@/lib/automations/lead-reply";
import { extractSmtpConfig, extractImapConfig } from "@/lib/automations/lead-reply/tools";
import { sendSms } from "@/lib/twilio";

const automation = new LeadReplyAutomation();

/**
 * Fire-and-forget SMS helper.
 * @param phone    E.164 phone from automations.config.notify_phone
 * @param name     Lead's name or email (used in the message body)
 * @param preview  First part of the email content (trimmed to fit SMS)
 * @param isApproval  true = draft waiting, false = auto-sent FYI
 */
async function notifyLeadSms(
  phone: string,
  name: string,
  preview: string,
  isApproval: boolean
): Promise<void> {
  const displayName = name.trim() || "new lead";
  const snippet = preview.slice(0, 80).trim();
  const ellipsis = preview.length > 80 ? "..." : "";
  const body = isApproval
    ? `New lead from ${displayName}: "${snippet}${ellipsis}" — Reply OK to send, SKIP to discard.`
    : `Replied to ${displayName}: "${snippet}${ellipsis}"`;
  await sendSms(phone, body);
}

/**
 * GET /api/cron/check-leads
 *
 * Called by Vercel Cron every 5 minutes (requires Vercel Pro).
 * For each active lead_reply automation with an email account connected:
 *
 *   Phase 1 — Process expired queue:
 *     Pick up automation_runs with status='queued' and process_after <= now.
 *     Generate reply and send (or save as pending_approval if require_approval is on).
 *
 *   Phase 2 — Poll inboxes:
 *     Connect to client's IMAP inbox, fetch unread emails, parse with Claude Haiku.
 *     Returning contacts (already replied to): capture inbound row, skip auto-reply.
 *     New leads: save lead + insert inbound conversation row.
 *     If reply_delay_minutes > 0: save as 'queued' with process_after = now + delay.
 *     Otherwise: generate reply with Claude Sonnet, send, insert outbound conversation row.
 *
 * Email credentials: clients.email_account JSONB (preferred) → automations.config (legacy fallback).
 */
export async function GET() {
  const supabase = createAdminClient();

  // Load all active lead_reply automations, joined with client email_account
  const { data: automations, error } = await supabase
    .from("automations")
    .select("id, client_id, config, require_approval, clients(slug, email_account)")
    .eq("automation_key", "lead_reply")
    .eq("is_enabled", true);

  if (error || !automations?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let totalProcessed = 0;

  // ── Phase 1: Process expired queued runs ────────────────────────────
  for (const auto of automations) {
    const config = (auto.config as Record<string, unknown>) ?? {};
    const clientData = auto.clients as { slug: string; email_account?: Record<string, unknown> | null } | null;
    const slug = clientData?.slug ?? "unknown";

    try {
      const queueProcessed = await processQueuedRuns({
        automationId: auto.id,
        clientId: auto.client_id,
        slug,
        config,
        emailAccount: clientData?.email_account ?? null,
        requireApproval: auto.require_approval === true,
        supabase,
      });
      if (queueProcessed > 0) {
        console.log(`[check-leads] ${slug}: processed ${queueProcessed} queued run(s)`);
        totalProcessed += queueProcessed;
      }
    } catch (err) {
      console.error(`[check-leads] Queue processing failed for ${slug}:`, err);
    }
  }

  // ── Phase 2: Poll IMAP inboxes ───────────────────────────────────────
  for (const auto of automations) {
    const config = (auto.config as Record<string, unknown>) ?? {};
    const clientData = auto.clients as { slug: string; email_account?: Record<string, unknown> | null } | null;
    const slug = clientData?.slug ?? "unknown";
    const emailAccount = clientData?.email_account ?? null;

    // Resolve IMAP credentials: prefer client email_account (new or legacy format), fall back to automation config
    const imapCfg = extractImapConfig(emailAccount ?? {}) ?? extractImapConfig(config);
    if (!imapCfg) continue;

    try {
      const count = await processMailbox({
        automationId: auto.id,
        clientId: auto.client_id,
        slug,
        config,
        emailAccount,
        requireApproval: auto.require_approval === true,
        supabase,
      });
      totalProcessed += count;
      if (count > 0) {
        console.log(`[check-leads] ${slug}: processed ${count} new email(s)`);
      }
    } catch (err) {
      console.error(`[check-leads] Inbox poll failed for ${slug}:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed: totalProcessed });
}

/* ------------------------------------------------------------------ */
/*  Phase 1: Process queued runs                                       */
/* ------------------------------------------------------------------ */

async function processQueuedRuns({
  automationId,
  clientId,
  slug,
  config,
  emailAccount,
  requireApproval,
  supabase,
}: {
  automationId: string;
  clientId: string;
  slug: string;
  config: Record<string, unknown>;
  emailAccount: Record<string, unknown> | null;
  requireApproval: boolean;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<number> {
  const { data: queuedRuns } = await supabase
    .from("automation_runs")
    .select("id, payload")
    .eq("automation_id", automationId)
    .eq("status", "queued")
    .lte("process_after", new Date().toISOString());

  if (!queuedRuns?.length) return 0;

  let processed = 0;

  for (const run of queuedRuns) {
    const payload = (run.payload ?? {}) as Record<string, unknown>;

    try {
      const result = await automation.run(
        {
          from_email: payload.from_email as string,
          from_name: payload.from_name as string,
          subject: payload.subject as string | undefined,
          message: payload.message as string,
        },
        { client_id: clientId, slug, config, draftMode: requireApproval, emailAccount }
      );

      const notifyPhone = (config.notify_phone as string) || null;
      const fromName = (payload.from_name as string) || (payload.from_email as string) || "";

      if (requireApproval && result.draftContent) {
        await supabase
          .from("automation_runs")
          .update({
            status: "pending_approval",
            draft_content: result.draftContent,
            output_summary: result.summary,
          })
          .eq("id", run.id);

        // SMS: notify client a draft is waiting for approval
        if (notifyPhone) {
          await notifyLeadSms(notifyPhone, fromName, result.draftContent, true);
        }
      } else {
        await supabase
          .from("automation_runs")
          .update({
            status: result.success ? "success" : "error",
            output_summary: result.summary,
            error: result.error ?? null,
          })
          .eq("id", run.id);

        if (result.success) {
          await supabase.rpc("increment_automation_counter", {
            p_automation_id: automationId,
            p_increment: 1,
          });
          const leadId = payload.lead_id as string | null;
          if (leadId) {
            await supabase
              .from("leads")
              .update({ replied_at: new Date().toISOString() })
              .eq("id", leadId);
          }

          // Log outbound conversation for voice training corpus
          if (result.sentContent && leadId) {
            const smtpCfg = extractSmtpConfig(emailAccount ?? config);
            await supabase.from("lead_conversations").insert({
              client_id: clientId,
              lead_id: leadId,
              automation_run_id: run.id,
              direction: "outbound",
              from_email: smtpCfg?.user ?? (config.from_email as string) ?? "",
              to_email: payload.from_email as string,
              subject: payload.subject ? `Re: ${payload.subject as string}` : "Thanks for reaching out",
              content: result.sentContent,
              was_ai_generated: true,
              was_edited: false,
              sent_at: new Date().toISOString(),
            });
          }

          // SMS: FYI notification that reply was sent
          if (notifyPhone && result.sentContent) {
            await notifyLeadSms(notifyPhone, fromName, result.sentContent, false);
          }
        }
      }

      processed++;
    } catch (err) {
      console.error(`[check-leads] Failed processing queued run ${run.id} for ${slug}:`, err);
      await supabase
        .from("automation_runs")
        .update({ status: "error", error: err instanceof Error ? err.message : String(err) })
        .eq("id", run.id);
    }
  }

  return processed;
}

/* ------------------------------------------------------------------ */
/*  Phase 2: Poll IMAP inbox                                           */
/* ------------------------------------------------------------------ */

async function processMailbox({
  automationId,
  clientId,
  slug,
  config,
  emailAccount,
  requireApproval,
  supabase,
}: {
  automationId: string;
  clientId: string;
  slug: string;
  config: Record<string, unknown>;
  emailAccount: Record<string, unknown> | null;
  requireApproval: boolean;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<number> {
  // Resolve IMAP credentials: client email_account (new or legacy), then automation config
  const imap = (extractImapConfig(emailAccount ?? {}) ?? extractImapConfig(config))!;

  const replyDelayMinutes =
    typeof config.reply_delay_minutes === "number" ? config.reply_delay_minutes : 0;

  const imapClient = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: true,
    auth: { user: imap.user, pass: imap.pass },
    logger: false,
  });

  await imapClient.connect();
  let processed = 0;

  try {
    const lock = await imapClient.getMailboxLock("INBOX");

    try {
      // Search for unread emails received in the last 24 hours
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const uids = await imapClient.search({ seen: false, since }, { uid: true });

      if (!uids.length) return 0;

      for await (const msg of imapClient.fetch(uids, { source: true, uid: true }, { uid: true })) {
        try {
          const parsed = await simpleParser(msg.source);

          const fromEmail = parsed.from?.value?.[0]?.address ?? "";
          const fromName = parsed.from?.value?.[0]?.name ?? "";
          const subject = parsed.subject ?? "";
          const emailBody = parsed.text || parsed.html?.replace(/<[^>]*>/g, " ") || "";
          const messageId = parsed.messageId ?? null;
          const inReplyTo = parsed.inReplyTo ?? null;
          const emailDate = parsed.date ?? new Date();

          if (!fromEmail || !emailBody) {
            await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            continue;
          }

          // Skip replies we sent ourselves (avoid reply loops)
          if (fromEmail.toLowerCase() === imap.user.toLowerCase()) {
            await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            continue;
          }

          // Deduplicate by Message-ID
          if (messageId) {
            const { data: existingRun } = await supabase
              .from("automation_runs")
              .select("id")
              .eq("automation_id", automationId)
              .contains("payload", { imap_message_id: messageId })
              .maybeSingle();

            if (existingRun) {
              await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
              continue;
            }
          }

          // ── Returning contacts check ─────────────────────────────────────
          // Auto-reply only for first-time leads. If we've replied to this sender
          // before, capture it as an inbound continuation for the training corpus
          // but do NOT trigger another auto-reply.
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("client_id", clientId)
            .eq("from_email", fromEmail.toLowerCase())
            .not("replied_at", "is", null)
            .limit(1)
            .maybeSingle();

          if (existingLead) {
            // Log inbound continuation for voice training (thread context)
            await supabase.from("lead_conversations").insert({
              client_id: clientId,
              lead_id: existingLead.id,
              direction: "inbound",
              from_email: fromEmail,
              to_email: imap.user,
              subject: subject || null,
              content: emailBody.slice(0, 10000),
              message_id: messageId,
              in_reply_to: inReplyTo,
              was_ai_generated: false,
              was_edited: false,
              sent_at: emailDate.toISOString(),
            });
            await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            console.log(`[check-leads] ${slug}: skipped auto-reply for returning contact ${fromEmail}`);
            continue;
          }

          // ── Parse with Claude Haiku ──────────────────────────────────────
          let leadParsed;
          try {
            leadParsed = await parseLeadEmail(
              `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${emailBody}`,
              config.email_example as string | undefined
            );
          } catch (err) {
            console.error(`[check-leads] Parse failed for ${slug}:`, err);
            await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            continue;
          }

          if (!leadParsed.from_email) {
            await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
            continue;
          }

          // ── Save lead to DB ──────────────────────────────────────────────
          const { data: lead } = await supabase
            .from("leads")
            .insert({
              client_id: clientId,
              from_name: leadParsed.from_name || null,
              from_email: leadParsed.from_email,
              subject: leadParsed.subject || subject || null,
              message: leadParsed.message,
              raw_email: emailBody.slice(0, 5000),
            })
            .select("id")
            .single();

          // ── Log inbound conversation ─────────────────────────────────────
          if (lead?.id) {
            await supabase.from("lead_conversations").insert({
              client_id: clientId,
              lead_id: lead.id,
              direction: "inbound",
              from_email: fromEmail,
              to_email: imap.user,
              subject: subject || null,
              content: emailBody.slice(0, 10000),
              message_id: messageId,
              in_reply_to: inReplyTo,
              was_ai_generated: false,
              was_edited: false,
              sent_at: emailDate.toISOString(),
            });
          }

          const notifyPhone = (config.notify_phone as string) || null;
          const leadDisplayName = leadParsed.from_name || leadParsed.from_email;

          // ── Queue or reply ───────────────────────────────────────────────
          if (replyDelayMinutes > 0) {
            // Queue for later processing
            const processAfter = new Date(Date.now() + replyDelayMinutes * 60 * 1000).toISOString();
            await supabase.from("automation_runs").insert({
              automation_id: automationId,
              client_id: clientId,
              status: "queued",
              process_after: processAfter,
              input_summary: `Lead from ${leadParsed.from_email}`,
              payload: {
                from_email: leadParsed.from_email,
                from_name: leadParsed.from_name,
                subject: leadParsed.subject || subject,
                message: leadParsed.message,
                lead_id: lead?.id ?? null,
                imap_message_id: messageId,
              },
            });
            console.log(`[check-leads] ${slug}: queued reply to ${leadParsed.from_email} (delay ${replyDelayMinutes}m)`);
          } else {
            // Run immediately
            const result = await automation.run(
              {
                from_email: leadParsed.from_email,
                from_name: leadParsed.from_name,
                subject: leadParsed.subject || subject,
                message: leadParsed.message,
              },
              { client_id: clientId, slug, config, draftMode: requireApproval, emailAccount }
            );

            if (requireApproval && result.draftContent) {
              const { data: savedRun } = await supabase.from("automation_runs").insert({
                automation_id: automationId,
                client_id: clientId,
                status: "pending_approval",
                draft_content: result.draftContent,
                payload: {
                  from_email: leadParsed.from_email,
                  from_name: leadParsed.from_name,
                  subject: leadParsed.subject || subject,
                  message: leadParsed.message,
                  lead_id: lead?.id ?? null,
                  imap_message_id: messageId,
                },
                input_summary: `Lead from ${leadParsed.from_email}`,
                output_summary: result.summary,
              }).select("id").single();

              // Note: outbound conversation is logged when the draft is approved
              // (see app/api/automations/drafts/[runId]/route.ts and webhooks/twilio/route.ts)
              void savedRun;

              // SMS: notify client a draft is waiting for approval
              if (notifyPhone && result.draftContent) {
                await notifyLeadSms(notifyPhone, leadDisplayName, result.draftContent, true);
              }
            } else {
              // Auto-send path — capture run ID for conversation linkage
              const { data: savedRun } = await supabase.from("automation_runs").insert({
                automation_id: automationId,
                client_id: clientId,
                status: result.success ? "success" : "error",
                input_summary: `Lead from ${leadParsed.from_email}`,
                output_summary: result.summary,
                error: result.error ?? null,
                payload: { imap_message_id: messageId },
              }).select("id").single();

              if (result.success) {
                await supabase.rpc("increment_automation_counter", {
                  p_automation_id: automationId,
                  p_increment: 1,
                });
                if (lead?.id) {
                  await supabase
                    .from("leads")
                    .update({ replied_at: new Date().toISOString() })
                    .eq("id", lead.id);
                }

                // Log outbound conversation for voice training corpus
                if (result.sentContent && lead?.id) {
                  const smtpCfg = extractSmtpConfig(emailAccount ?? config);
                  await supabase.from("lead_conversations").insert({
                    client_id: clientId,
                    lead_id: lead.id,
                    automation_run_id: savedRun?.id ?? null,
                    direction: "outbound",
                    from_email: smtpCfg?.user ?? (config.from_email as string) ?? "",
                    to_email: leadParsed.from_email,
                    subject: (leadParsed.subject || subject) ? `Re: ${leadParsed.subject || subject}` : "Thanks for reaching out",
                    content: result.sentContent,
                    was_ai_generated: true,
                    was_edited: false,
                    sent_at: new Date().toISOString(),
                  });
                }

                // SMS: FYI notification that reply was auto-sent
                if (notifyPhone && result.sentContent) {
                  await notifyLeadSms(notifyPhone, leadDisplayName, result.sentContent, false);
                }
              }
            }
          }

          // Mark as read — prevents re-processing on next cron run
          await imapClient.messageFlagsAdd(String(msg.uid), ["\\Seen"], { uid: true });
          processed++;
        } catch (msgErr) {
          console.error(`[check-leads] Error on message for ${slug}:`, msgErr);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await imapClient.logout();
  }

  return processed;
}

// Export extractSmtpConfig so it's available if needed elsewhere
export { extractSmtpConfig };
