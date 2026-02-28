// CANONICAL EXAMPLE — Lead Reply Automation
// Use this as the template when building new automations.
// File: lib/automations/lead-reply/index.ts

import Anthropic from "@anthropic-ai/sdk";
import type { AutomationRunner, AutomationResult, ClientConfig, TriggerPayload } from "../base";
import { buildSystemPrompt } from "./workflow";
import { sendEmail } from "./tools";

// Payload: what the inbound-lead webhook sends
interface LeadPayload {
  from_email: string;
  from_name: string;
  subject?: string;
  message: string;
}

// Config: what Victor sets per client in automations.config JSONB
interface LeadReplyConfig {
  owner_name: string;
  business_name: string;
  voice_samples: string[];  // min 3 examples of how the owner writes
  signature: string;
  from_email: string;       // verified Resend sender domain
  from_name: string;        // display name
}

export class LeadReplyAutomation implements AutomationRunner {
  readonly key = "lead_reply";       // must match automations.automation_key in DB
  readonly name = "Auto-reply to new leads";

  async run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult> {
    const lead = payload as LeadPayload;
    const cfg = config.config as Partial<LeadReplyConfig>;

    // Validate payload — return early, never throw
    if (!lead.from_email || !lead.message) {
      return { success: false, summary: "", error: "Missing from_email or message in payload" };
    }

    // Validate config — clear message so Victor knows what to set up
    if (!cfg.voice_samples?.length || !cfg.from_email) {
      return {
        success: false,
        summary: "",
        error: "Automation not configured: missing voice_samples or from_email in client config",
      };
    }

    // Build system prompt from workflow.ts
    const systemPrompt = buildSystemPrompt({
      businessName: cfg.business_name ?? "the business",
      ownerName: cfg.owner_name ?? "the owner",
      voiceSamples: cfg.voice_samples,
      signature: cfg.signature ?? "",
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

    // ALWAYS implement draft mode — caller stores draft and awaits approval
    if (config.draftMode) {
      return {
        success: true,
        summary: `Draft created for ${lead.from_name} <${lead.from_email}>`,
        draftContent: replyText,
        increment: 0,  // 0 because nothing was sent yet
      };
    }

    // Send via tool function — check result, never throw
    const result = await sendEmail({
      to: lead.from_email,
      subject: lead.subject ? `Re: ${lead.subject}` : "Thanks for reaching out",
      body: replyText,
      fromName: cfg.from_name ?? cfg.owner_name ?? "Victor",
      fromEmail: cfg.from_email,
    });

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
