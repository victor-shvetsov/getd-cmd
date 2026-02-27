import { generateText } from "ai";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { aiModel } from "@/lib/ai-config";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ro: "Romanian",
  ru: "Russian",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  tr: "Turkish",
  uk: "Ukrainian",
  da: "Danish",
};

/**
 * Translate tab data or a single section.
 * Body: { data, sourceLang, targetLang, nonTranslatableKeys? }
 *
 * `data` can be a full tab data blob or a single block/section object.
 * `nonTranslatableKeys` is an optional list of JSON keys whose values
 *  should be copied as-is (not translated).
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { data, sourceLang, targetLang, nonTranslatableKeys } = body as {
    data: Record<string, unknown>;
    sourceLang: string;
    targetLang: string;
    nonTranslatableKeys?: string[];
  };

  if (!data || !sourceLang || !targetLang) {
    return NextResponse.json(
      { error: "Missing data, sourceLang, or targetLang" },
      { status: 400 }
    );
  }

  const sourceName = LANG_NAMES[sourceLang] ?? sourceLang;
  const targetName = LANG_NAMES[targetLang] ?? targetLang;

  // Build the "do not translate these keys" instruction
  const ntKeysList = nonTranslatableKeys?.length
    ? `\n   - Any values under these JSON keys (copy them exactly): ${nonTranslatableKeys.join(", ")}`
    : "";

  const prompt = `You are a professional translator for a digital marketing agency. Translate the following JSON content from ${sourceName} to ${targetName}.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no code fences, no explanations.
2. Preserve the EXACT same JSON structure and all keys unchanged.
3. Translate only the string VALUES. Do NOT translate:
   - JSON keys
   - URLs, links, email addresses
   - Numbers, currency amounts, percentages
   - Currency codes (EUR, GBP, DKK, USD)
   - Status values (Active, Planned, In Progress, Completed, Paid, Not Paid, Pending, etc.)
   - Priority values (High, Medium, Low, P1, P2, P3)
   - Payment types (One-time, Monthly, Recurring)
   - Action status values (Completed, In Progress, Not Started)
   - Technical/marketing terms (SEO, PPC, CPC, CPM, CPL, KPI, CTR, CTA, ROI, ROAS)
   - Brand names, company names, proper nouns
   - File format references (SVG, PNG, PDF, etc.)
   - Keywords (primary_keyword, secondary_keywords values — these are SEO keywords, keep them in the original language)${ntKeysList}
4. Keep marketing terminology natural in the target language.
5. Maintain the same tone — professional and clear.
6. For short UI-style labels, keep them concise in the target language.

JSON to translate:
${JSON.stringify(data, null, 2)}`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      prompt,
      maxOutputTokens: 16000,
    });

    // Extract JSON from the response
    let translated: Record<string, unknown>;
    try {
      translated = JSON.parse(result.text);
    } catch {
      // Try to extract JSON from markdown code fences
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        translated = JSON.parse(match[1].trim());
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON", raw: result.text },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ translated });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Translation error:", errMsg);
    return NextResponse.json(
      { error: `Translation failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
