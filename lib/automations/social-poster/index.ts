import Anthropic from "@anthropic-ai/sdk";
import type { AutomationRunner, AutomationResult, ClientConfig, TriggerPayload } from "../base";
import { buildSystemPrompt } from "./workflow";
import { postToSocial } from "./tools";

interface SocialPayload {
  image_url: string;
  context?: string; // optional context about the photo (e.g. "new espresso machine installed")
}

interface SocialPosterConfig {
  owner_name: string;
  business_name: string;
  voice_samples: string[];
  hashtags: string;
  platforms: string[]; // e.g. ["instagram", "facebook"]
}

export class SocialPosterAutomation implements AutomationRunner {
  readonly key = "social_poster";
  readonly name = "Social media posting";

  async run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult> {
    const data = payload as SocialPayload;
    const cfg = config.config as Partial<SocialPosterConfig>;

    if (!data.image_url) {
      return { success: false, summary: "", error: "Missing image_url in payload" };
    }

    if (!cfg.platforms?.length) {
      return { success: false, summary: "", error: "No platforms configured in client config" };
    }

    const systemPrompt = buildSystemPrompt({
      businessName: cfg.business_name ?? "the business",
      ownerName: cfg.owner_name ?? "the owner",
      voiceSamples: cfg.voice_samples ?? [],
      hashtags: cfg.hashtags ?? "",
    });

    const client = new Anthropic();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: data.context
            ? `Write a caption for this photo. Context: ${data.context}`
            : "Write a caption for this photo.",
        },
      ],
    });

    const caption = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const results = await postToSocial({
      imageUrl: data.image_url,
      caption,
      platforms: cfg.platforms,
    });

    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return {
        success: false,
        summary: "",
        error: `Failed to post to: ${failures.map((f) => f.platform).join(", ")}`,
      };
    }

    return {
      success: true,
      summary: `Posted to ${cfg.platforms.join(", ")}`,
      increment: 1,
    };
  }
}
