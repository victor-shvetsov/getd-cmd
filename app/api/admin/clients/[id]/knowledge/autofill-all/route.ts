import { generateText } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  SECTION_SCHEMAS,
  CONTENT_BLOCK_SHAPES,
  TAB_KEY_TO_SECTION,
} from "@/lib/schema";
import { TAB_KEYS, type TabKey } from "@/lib/types";
import { aiModel, getClientAIContext } from "@/lib/ai-config";

/**
 * POST — batch auto-fill ALL tabs from knowledge bank.
 * Optional body: { onlyEmpty?: boolean }  (default true — skip tabs that already have data)
 * Returns: { results: Record<TabKey, { suggested, existing, hasExisting }> }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const onlyEmpty = body.onlyEmpty !== false; // default: true

  const supabase = createAdminClient();
  const ctx = await getClientAIContext(supabase, id);

  if (!ctx.facts.length) {
    return NextResponse.json(
      {
        error:
          "No processed knowledge entries found. Add some data to the Knowledge Bank first.",
      },
      { status: 400 }
    );
  }

  // 2. Fetch existing tabs
  const { data: existingTabs } = await supabase
    .from("client_tabs")
    .select("tab_key, data")
    .eq("client_id", id);

  const existingByKey: Record<string, Record<string, unknown>> = {};
  for (const tab of existingTabs ?? []) {
    existingByKey[tab.tab_key] = tab.data as Record<string, unknown>;
  }

  // 3. Determine which tabs to fill
  const tabsToFill: TabKey[] = [];
  for (const tabKey of TAB_KEYS) {
    if (tabKey === "assets") continue; // assets are uploaded, not generated
    const existing = existingByKey[tabKey];
    const hasContent = existing && JSON.stringify(existing) !== "{}";
    if (onlyEmpty && hasContent) {
      // Still include it — we'll show the diff. The user decides.
    }
    tabsToFill.push(tabKey);
  }

  // 4. Build the mega-prompt for all tabs at once
  // Build schemas with block keys at top level (NOT wrapped in label/shape)
  const tabSchemas: Record<string, unknown> = {};
  for (const tabKey of tabsToFill) {
    const sectionKey = TAB_KEY_TO_SECTION[tabKey];
    const schema = SECTION_SCHEMAS[sectionKey];
    if (!schema) continue;
    const tabShape: Record<string, unknown> = {};
    for (const block of schema.blocks) {
      const blockShape =
        CONTENT_BLOCK_SHAPES[block.type as keyof typeof CONTENT_BLOCK_SHAPES];
      if (blockShape) tabShape[block.key] = blockShape;
    }
    // Flat structure: { block_key: { ...fields } } — no label/shape wrapper
    tabSchemas[tabKey] = tabShape;
  }

  const prompt = `You are a senior digital marketing strategist at an agency. Using accumulated client knowledge, generate complete marketing dashboard data for ALL tabs at once.

${ctx.promptBlock}

## TABS TO GENERATE (return data for each key):
${JSON.stringify(tabSchemas, null, 2)}

## INSTRUCTIONS:
1. Return a single JSON object where each top-level key is a tab key (brief, marketing_channels, demand, website, execution).
2. Each tab's value must match the structure shown above exactly. The keys inside each tab (like "overview", "marketing_channels", "keyword_research", etc.) are the block keys — use them directly as top-level keys within each tab object. Do NOT wrap them in "label" or "shape" objects.
3. Fill in as many fields as possible using real data from the knowledge.
4. For fields where you have no data, use reasonable professional defaults or empty strings.
5. For arrays, include all relevant items. Don't include placeholder items with empty strings.
6. Be specific — use actual company names, locations, services, keywords from the knowledge.
7. For KPIs, suggest realistic digital marketing KPIs.
8. For marketing channels, recommend channels suitable for this business with suggested budgets.
9. For demand (keyword_research): leave the "keywords" array EMPTY — this data comes from real PPC research CSV uploads, not AI generation. Only set ppc_sheet_link if a sheet URL is found in the knowledge.
10. For website architecture (website_architecture): leave the "pages" array EMPTY — this data comes from real SEO research CSV uploads. Only set seo_sheet_link if a sheet URL is found. Set multi_location to true if client operates in multiple physical locations.
11. For execution, create actionable task items with realistic pricing.
12. Return ONLY the JSON — no markdown, no code fences, no explanations.`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      prompt,
      maxOutputTokens: 16000,
    });

    let allSuggested: Record<string, Record<string, unknown>>;
    try {
      allSuggested = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        allSuggested = JSON.parse(match[1].trim());
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON", raw: result.text.slice(0, 500) },
          { status: 500 }
        );
      }
    }

    // Build the results map with existing data for diff
    const results: Record<
      string,
      {
        suggested: Record<string, unknown>;
        existing: Record<string, unknown>;
        hasExisting: boolean;
      }
    > = {};

    for (const tabKey of tabsToFill) {
      const rawSuggested = allSuggested[tabKey] ?? {};
      // Strip AI prompt artifacts that leak into the response
      const { label: _l, shape: _s, ...suggested } = rawSuggested as Record<string, unknown> & { label?: unknown; shape?: unknown };
      const existing = existingByKey[tabKey] ?? {};
      results[tabKey] = {
        suggested: suggested as Record<string, unknown>,
        existing,
        hasExisting: JSON.stringify(existing) !== "{}",
      };
    }

    return NextResponse.json({ results });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Batch auto-fill failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
