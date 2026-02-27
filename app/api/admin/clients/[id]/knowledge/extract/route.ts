import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { aiModel } from "@/lib/ai-config";

/**
 * POST — extract structured facts from a knowledge entry's raw content.
 * Body: { entryId: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { entryId } = await request.json();
  const supabase = createAdminClient();

  // Fetch the entry
  const { data: entry, error: fetchErr } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("id", entryId)
    .eq("client_id", id)
    .single();

  if (fetchErr || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (!entry.raw_content?.trim()) {
    return NextResponse.json({ error: "No content to extract from" }, { status: 400 });
  }

  // Mark as processing
  await supabase
    .from("knowledge_entries")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", entryId);

  const prompt = `You are a digital marketing agency assistant. Analyze the following raw input (it might be a call transcript, notes, chat log, or document) and extract structured facts about the CLIENT and their BUSINESS.

Return a JSON object with these categories (include only categories where you found relevant info):

{
  "business": {
    "company_name": "",
    "industry": "",
    "location": "",
    "website": "",
    "years_in_business": "",
    "business_model": "",
    "revenue_range": "",
    "team_size": "",
    "unique_selling_points": [],
    "services_or_products": [],
    "service_areas": []
  },
  "target_audience": {
    "demographics": "",
    "age_range": "",
    "location": "",
    "pain_points": [],
    "how_they_search": [],
    "buying_timeframe": "",
    "decision_factors": []
  },
  "marketing": {
    "current_channels": [],
    "monthly_budget": "",
    "budget_currency": "",
    "past_campaigns": [],
    "what_worked": [],
    "what_didnt_work": [],
    "competitors": [],
    "goals": [],
    "kpis": []
  },
  "website": {
    "current_url": "",
    "has_website": true,
    "needs_redesign": false,
    "key_pages_needed": [],
    "seo_status": "",
    "target_keywords": []
  },
  "brand": {
    "tone_of_voice": "",
    "brand_values": [],
    "visual_preferences": "",
    "existing_assets": []
  },
  "other_notes": []
}

RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanations.
2. If a field has no data, omit it entirely (don't include empty strings or empty arrays).
3. Be concise but preserve specific numbers, names, and details.
4. If the content is in a non-English language, still extract facts but keep proper nouns in their original form.
5. For arrays, use short clear phrases.

RAW INPUT:
${entry.raw_content}`;

  try {
    const result = await generateText({
      model: aiModel("fast"),
      prompt,
      maxOutputTokens: 4000,
    });

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        extracted = JSON.parse(match[1].trim());
      } else {
        await supabase
          .from("knowledge_entries")
          .update({ status: "error", updated_at: new Date().toISOString() })
          .eq("id", entryId);
        return NextResponse.json(
          { error: "AI returned invalid JSON" },
          { status: 500 }
        );
      }
    }

    // Save extracted facts and mark as done
    const { data: updated, error: updateErr } = await supabase
      .from("knowledge_entries")
      .update({
        extracted_facts: extracted,
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Extraction error:", errMsg);
    await supabase
      .from("knowledge_entries")
      .update({ status: "error", updated_at: new Date().toISOString() })
      .eq("id", entryId);
    return NextResponse.json(
      { error: `Extraction failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
