import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { SECTION_SCHEMAS, CONTENT_BLOCK_SHAPES, TAB_KEY_TO_SECTION } from "@/lib/schema";
import { aiModel, getClientAIContext } from "@/lib/ai-config";
import type { TabKey } from "@/lib/types";

/**
 * POST — auto-fill a specific tab using knowledge bank data.
 * Body: { tabKey: TabKey }
 * Returns: { suggested: Record<string, unknown> }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { tabKey } = (await request.json()) as { tabKey: TabKey };

  const supabase = createAdminClient();
  const ctx = await getClientAIContext(supabase, id);

  if (!ctx.facts.length) {
    return NextResponse.json(
      { error: "No processed knowledge entries found. Add some data to the Knowledge Bank first." },
      { status: 400 }
    );
  }

  // 3. Get the target tab schema
  const sectionKey = TAB_KEY_TO_SECTION[tabKey];
  const schema = SECTION_SCHEMAS[sectionKey];
  if (!schema) {
    return NextResponse.json({ error: `Unknown tab: ${tabKey}` }, { status: 400 });
  }

  // Build the expected data shape for this tab
  const expectedShape: Record<string, unknown> = {};
  for (const block of schema.blocks) {
    const shape = CONTENT_BLOCK_SHAPES[block.type as keyof typeof CONTENT_BLOCK_SHAPES];
    if (shape) {
      expectedShape[block.key] = shape;
    }
  }

  const prompt = `You are a senior digital marketing strategist at an agency. You have accumulated knowledge about a client from discovery calls and notes. Your job is to auto-fill a marketing dashboard tab using this knowledge.

${ctx.promptBlock}

## TAB TO FILL: "${schema.label}" (key: ${tabKey})

## EXPECTED OUTPUT STRUCTURE:
${JSON.stringify(expectedShape, null, 2)}

## INSTRUCTIONS:
1. Return ONLY valid JSON matching the exact structure above.
2. Fill in as many fields as possible using the knowledge provided.
3. For fields where you have no data, use reasonable professional placeholders or leave empty strings.
4. For arrays, include all relevant items from the knowledge. Don't include empty placeholder items.
5. Be specific — use actual data from the knowledge (company names, locations, services, keywords, etc.).
6. For KPIs, suggest realistic digital marketing KPIs based on the client's business type.
7. For budget fields, use the currency mentioned in the knowledge if available.
8. For the funnel diagram, create a customer journey funnel relevant to the client's business.
9. For marketing channels, suggest channels that make sense for this specific business.
  10. For demand data (keyword_research): leave the "keywords" array EMPTY — this data comes from real PPC research uploads, not AI generation. Only set ppc_sheet_link if a Google Sheet link is mentioned in the knowledge.
11. For website architecture (website_architecture): leave the "pages" array EMPTY — this data comes from real SEO research CSV uploads, not AI generation. Only set seo_sheet_link if a sheet URL is found. Set multi_location to true if client has multiple physical locations.
12. For execution items, suggest actionable tasks based on the marketing strategy.
13. Keep all text concise and professional.
14. Return the JSON and nothing else — no markdown, no code fences, no explanations.`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      prompt,
      maxOutputTokens: 8000,
    });

    let rawSuggested: Record<string, unknown>;
    try {
      rawSuggested = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        rawSuggested = JSON.parse(match[1].trim());
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON", raw: result.text.slice(0, 500) },
          { status: 500 }
        );
      }
    }

    // Strip AI prompt artifacts that leak into the response
    const { label: _l, shape: _s, ...suggested } = rawSuggested as Record<string, unknown> & { label?: unknown; shape?: unknown };
    return NextResponse.json({ suggested });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Auto-fill error:", errMsg);
    return NextResponse.json(
      { error: `Auto-fill failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
