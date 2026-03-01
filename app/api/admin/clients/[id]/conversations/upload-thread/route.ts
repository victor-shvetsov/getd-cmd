import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { extractImapConfig } from "@/lib/automations/lead-reply/tools";

/**
 * POST /api/admin/clients/[id]/conversations/upload-thread
 *
 * Accepts a pasted email thread (raw text, any format — Gmail, Outlook, etc.)
 * and uses Claude Haiku to:
 *   1. Identify which side is the inbox owner's outgoing replies
 *   2. Extract just the reply bodies (stripping quoted content + signatures)
 *   3. Store each outgoing reply as a lead_conversations row
 *
 * These manually-uploaded rows are treated the same as auto-captured rows
 * and feed directly into the voice extraction pipeline.
 *
 * Body: { raw_thread: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawThread = (body.raw_thread as string)?.trim();
  if (!rawThread) {
    return NextResponse.json({ error: "raw_thread is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Determine the owner's email address ──────────────────────────────
  // Used to identify which emails are outgoing. Falls back to automation config.
  const { data: clientRow } = await supabase
    .from("clients")
    .select("email_account")
    .eq("id", clientId)
    .single();

  const emailAccount = (clientRow?.email_account ?? null) as Record<string, unknown> | null;
  const imapCfg = extractImapConfig(emailAccount ?? {});
  const ownerEmail = imapCfg?.user ?? null;

  // ── Parse thread with Claude Haiku ───────────────────────────────────
  const claude = new Anthropic();
  let text: string;

  try {
    const response = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Extract all OUTGOING replies from this email thread. The inbox owner's email is: ${ownerEmail ?? "(unknown — use context clues to identify who the thread belongs to)"}.

Email thread:
${rawThread.slice(0, 8000)}

Output ONLY a valid JSON array (no explanation):
[
  {
    "from_email": "owner@example.com",
    "to_email": "customer@example.com",
    "subject": "Re: Original subject",
    "content": "The reply body only — no quoted previous messages, no signature block",
    "sent_at": "2025-01-15T10:30:00Z"
  }
]

Rules:
- Include ONLY emails sent BY the inbox owner (outgoing). Skip all inbound emails.
- Strip out quoted/forwarded previous messages (lines starting with >, "On [date] wrote:", etc.)
- Strip email signatures (name, company, phone — keep only the actual reply text)
- If the sent_at date is not visible in the thread, use null
- If you cannot identify any outgoing emails, return an empty array []
- Each content should be the clean reply body — what the person actually wrote, not boilerplate`,
        },
      ],
    });

    text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error("[upload-thread] Claude error:", err);
    return NextResponse.json({ error: "Failed to parse email thread" }, { status: 500 });
  }

  // ── Parse JSON ────────────────────────────────────────────────────────
  type ParsedEmail = {
    from_email?: string;
    to_email?: string;
    subject?: string;
    content?: string;
    sent_at?: string | null;
  };

  let emails: ParsedEmail[];
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    emails = JSON.parse(jsonMatch?.[0] ?? "[]") as ParsedEmail[];
  } catch (err) {
    console.error("[upload-thread] JSON parse error:", err, "\nRaw:", text.slice(0, 300));
    return NextResponse.json({ error: "Could not parse email thread — try re-pasting the thread" }, { status: 422 });
  }

  // Filter out entries without content
  const valid = emails.filter((e) => e.content && e.content.trim().length > 10);

  if (!valid.length) {
    return NextResponse.json(
      { error: "No outgoing replies found in the pasted thread. Make sure the thread includes the owner's sent replies." },
      { status: 422 }
    );
  }

  // ── Store as lead_conversations rows ──────────────────────────────────
  // was_ai_generated=false: these are genuine human-written replies (gold standard)
  const inserts = valid.map((e) => ({
    client_id: clientId,
    direction: "outbound" as const,
    from_email: e.from_email?.trim() || ownerEmail || "",
    to_email: e.to_email?.trim() || "",
    subject: e.subject?.trim() || null,
    content: e.content!.trim(),
    was_ai_generated: false,
    was_edited: false,
    sent_at: e.sent_at ?? new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("lead_conversations")
    .insert(inserts);

  if (insertError) {
    console.error("[upload-thread] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to save conversations" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imported: valid.length });
}
