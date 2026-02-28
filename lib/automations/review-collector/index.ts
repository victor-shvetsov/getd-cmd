import Anthropic from "@anthropic-ai/sdk";
import type { AutomationRunner, AutomationResult, ClientConfig, TriggerPayload } from "../base";
import { buildSystemPrompt } from "./workflow";
import { sendReviewRequest } from "./tools";

interface ReviewPayload {
  customer_email: string;
  customer_name: string;
  job_description?: string; // e.g. "espresso machine installation"
}

interface ReviewCollectorConfig {
  owner_name: string;
  business_name: string;
  voice_samples: string[];
  review_platform: string; // e.g. "Trustpilot"
  review_link: string;     // e.g. "https://trustpilot.com/review/lucaffe.dk"
  from_email: string;
  from_name: string;
}

export class ReviewCollectorAutomation implements AutomationRunner {
  readonly key = "review_collector";
  readonly name = "Review collector";

  async run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult> {
    const data = payload as ReviewPayload;
    const cfg = config.config as Partial<ReviewCollectorConfig>;

    if (!data.customer_email) {
      return { success: false, summary: "", error: "Missing customer_email in payload" };
    }

    if (!cfg.review_link || !cfg.from_email) {
      return {
        success: false,
        summary: "",
        error: "Automation not configured: missing review_link or from_email",
      };
    }

    const systemPrompt = buildSystemPrompt({
      businessName: cfg.business_name ?? "the business",
      ownerName: cfg.owner_name ?? "the owner",
      voiceSamples: cfg.voice_samples ?? [],
      reviewPlatform: cfg.review_platform ?? "Trustpilot",
      reviewLink: cfg.review_link,
    });

    const client = new Anthropic();

    const userMessage = data.job_description
      ? `Write a review request for ${data.customer_name}. They just had: ${data.job_description}.`
      : `Write a review request for ${data.customer_name}.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const message = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const result = await sendReviewRequest({
      to: data.customer_email,
      customerName: data.customer_name,
      message,
      fromName: cfg.from_name ?? cfg.owner_name ?? "Victor",
      fromEmail: cfg.from_email,
    });

    if (!result.success) {
      return { success: false, summary: "", error: `Email send failed: ${result.error}` };
    }

    return {
      success: true,
      summary: `Sent review request to ${data.customer_name} <${data.customer_email}>`,
      increment: 1,
    };
  }
}
