import Anthropic from "@anthropic-ai/sdk";
import type { AutomationRunner, AutomationResult, ClientConfig, TriggerPayload } from "../base";
import { buildSystemPrompt } from "./workflow";
import { sendEmail, extractSmtpConfig } from "./tools";

interface LeadPayload {
  from_email: string;
  from_name: string;
  subject?: string;
  message: string;
}

interface LeadReplyConfig {
  owner_name: string;
  business_name: string;
  voice_samples: string[];
  signature: string;
  from_email: string;
  from_name: string;
}

export class LeadReplyAutomation implements AutomationRunner {
  readonly key = "lead_reply";
  readonly name = "Auto-reply to new leads";

  async run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult> {
    const lead = payload as LeadPayload;
    const cfg = config.config as Partial<LeadReplyConfig>;

    if (!lead.from_email || !lead.message) {
      return { success: false, summary: "", error: "Missing from_email or message in payload" };
    }

    if (!cfg.voice_samples?.length || !cfg.from_email) {
      return {
        success: false,
        summary: "",
        error: "Automation not configured: missing voice_samples or from_email in client config",
      };
    }

    const systemPrompt = buildSystemPrompt({
      businessName: cfg.business_name ?? "the business",
      ownerName: cfg.owner_name ?? "the owner",
      voiceSamples: cfg.voice_samples,
      signature: cfg.signature ?? "",
      customInstructions: cfg.custom_instructions as string | undefined,
    });

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `New lead from ${lead.from_name} <${lead.from_email}>:\n\nSubject: ${lead.subject ?? "(no subject)"}\n\n${lead.message}`,
        },
      ],
    });

    const replyText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Draft mode: return content without sending — caller stores draft for approval
    if (config.draftMode) {
      return {
        success: true,
        summary: `Draft created for ${lead.from_name} <${lead.from_email}>`,
        draftContent: replyText,
        increment: 0,
      };
    }

    // Prefer client-level email_account over per-automation config
    const rawConfig = config.config as Record<string, unknown>;
    const smtp = extractSmtpConfig(config.emailAccount ?? rawConfig);
    const fromEmail = smtp?.user ?? cfg.from_email ?? "";

    const result = await sendEmail({
      to: lead.from_email,
      subject: lead.subject ? `Re: ${lead.subject}` : "Thanks for reaching out",
      body: replyText,
      fromName: cfg.from_name ?? cfg.owner_name ?? "Victor",
      fromEmail,
    }, smtp);

    if (!result.success) {
      return { success: false, summary: "", error: `Email send failed: ${result.error}` };
    }

    return {
      success: true,
      summary: `Replied to ${lead.from_name} <${lead.from_email}>`,
      increment: 1,
    };
  }
}
