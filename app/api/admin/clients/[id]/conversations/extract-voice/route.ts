import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

/**
 * POST /api/admin/clients/[id]/conversations/extract-voice
 *
 * Reads outbound emails from lead_conversations, runs Claude to distill:
 *   - voice_samples: 8-12 best representative reply bodies (used in automation prompt)
 *   - voice_profile: tone descriptors, signature phrases, summary (displayed in UI)
 *
 * Saves directly into the lead_reply automation's config.voice_samples and
 * config.voice_profile so the extraction immediately improves the live automation.
 *
 * ★-marked rows (was_edited=true) are prioritised — they represent the owner
 * correcting the AI, making them the highest-signal training examples.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clientId } = await params;
  const supabase = createAdminClient();

  // ── Load outbound corpus ──────────────────────────────────────────────
  // Edited rows first (highest signal), then most recent, capped at 60
  const { data: rows, error } = await supabase
    .from("lead_conversations")
    .select("content, subject, was_edited, sent_at")
    .eq("client_id", clientId)
    .eq("direction", "outbound")
    .order("was_edited", { ascending: false })
    .order("sent_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[extract-voice] DB error:", error);
    return NextResponse.json({ error: "Failed to load corpus" }, { status: 500 });
  }

  if (!rows?.length) {
    return NextResponse.json(
      { error: "No outbound conversations yet. Use the upload feature or wait for the automation to capture replies." },
      { status: 422 }
    );
  }

  // ── Load automation config for owner/business name ───────────────────
  const { data: auto } = await supabase
    .from("automations")
    .select("id, config")
    .eq("client_id", clientId)
    .eq("automation_key", "lead_reply")
    .maybeSingle();

  const cfg = (auto?.config ?? {}) as Record<string, unknown>;
  const ownerName = (cfg.owner_name as string) || "the owner";
  const businessName = (cfg.business_name as string) || "the business";

  // ── Build email corpus for Claude ─────────────────────────────────────
  const emailList = rows
    .map(
      (r, i) =>
        `[${i + 1}]${r.was_edited ? " ★ EDITED" : ""}\nSubject: ${r.subject ?? "(no subject)"}\n\n${r.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  // ── Run Claude Sonnet to distill voice profile ────────────────────────
  const claude = new Anthropic();
  let text: string;

  try {
    const response = await claude.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are analyzing outgoing emails written by ${ownerName} from ${businessName} to their customers and leads.

Your task: distill this corpus into the best possible voice training set for an AI that will write in ${ownerName}'s voice.

Here are ${rows.length} outgoing emails (★ = client edited an AI draft — highest training signal):

${emailList}

Output ONLY valid JSON (no explanation before or after):
{
  "voice_samples": ["..."],
  "tone_descriptors": ["..."],
  "signature_phrases": ["..."],
  "summary": "..."
}

Rules for voice_samples (8-12 items):
- Pick the most DIVERSE set — cover different scenarios (price inquiry, enthusiastic lead, complaint, follow-up, referral, etc.)
- Prefer ★ EDITED samples — they show where the AI was corrected, so they carry the most signal
- Trim down to just the reply body — remove quoted previous messages, strip repeated signatures
- If many emails say the same thing ("Thanks, I'll call you"), keep only the single best version
- Each sample should be a complete, polished reply body, not a fragment

Rules for tone_descriptors (3-6 short phrases):
- Describe how this person writes: "casual and warm", "short sentences", "direct, no fluff", "always uses first name"
- Be specific to this person, not generic

Rules for signature_phrases (2-6 items):
- Actual phrases this person uses often that feel characteristic
- Examples: "Happy to sort it out", "Give me a shout", "Looking forward to it"

Rules for summary (1 sentence):
- Capture the overall voice: "Casper writes like a friendly local tradesman — brief, direct, always ends with a clear next step."`,
        },
      ],
    });

    text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error("[extract-voice] Claude error:", err);
    return NextResponse.json({ error: "Claude API call failed" }, { status: 500 });
  }

  // ── Parse JSON response ───────────────────────────────────────────────
  let profile: {
    voice_samples: string[];
    tone_descriptors: string[];
    signature_phrases: string[];
    summary: string;
  };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    profile = JSON.parse(jsonMatch?.[0] ?? text) as typeof profile;

    if (!Array.isArray(profile.voice_samples) || !profile.voice_samples.length) {
      throw new Error("voice_samples missing or empty");
    }
  } catch (err) {
    console.error("[extract-voice] JSON parse error:", err, "\nRaw:", text.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse Claude response" }, { status: 500 });
  }

  // ── Save to automation config ─────────────────────────────────────────
  // voice_samples is directly used by buildSystemPrompt() at inference time
  // voice_profile is displayed in the admin UI Knowledge Hub
  let saved = false;
  if (auto?.id) {
    const { error: saveError } = await supabase
      .from("automations")
      .update({
        config: {
          ...cfg,
          voice_samples: profile.voice_samples,
          voice_profile: {
            tone_descriptors: profile.tone_descriptors,
            signature_phrases: profile.signature_phrases,
            summary: profile.summary,
            extracted_at: new Date().toISOString(),
            source_count: rows.length,
          },
        },
      })
      .eq("id", auto.id);

    if (saveError) {
      console.error("[extract-voice] Save error:", saveError);
    } else {
      saved = true;
    }
  }

  return NextResponse.json({
    ok: true,
    profile,
    saved,
    source_count: rows.length,
    edited_count: rows.filter((r) => r.was_edited).length,
  });
}
