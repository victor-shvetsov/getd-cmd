import { generateText } from "ai";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiModel, getClientAIContext } from "@/lib/ai-config";

export interface DeepReviewFinding {
  severity: "critical" | "warning" | "suggestion";
  category: string;
  title: string;
  details: string;
  affectedTab?: string;
}

export interface DeepReviewResult {
  clientId: string;
  clientName: string;
  findings: DeepReviewFinding[];
  summary: string;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  reviewedAt: string;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client_id } = await request.json();
  if (!client_id) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Fetch all tabs
  const { data: tabs } = await supabase
    .from("client_tabs")
    .select("tab_key, data, sort_order")
    .eq("client_id", client_id)
    .order("sort_order");

  // Fetch knowledge bank
  const { data: knowledge } = await supabase
    .from("knowledge_entries")
    .select("*")
    .eq("client_id", client_id);

  // Fetch translations
  const { data: translations } = await supabase
    .from("translations")
    .select("language_code, translations")
    .eq("client_id", client_id);

  // Build a compact data snapshot for the LLM
  const tabSnapshot: Record<string, unknown> = {};
  for (const tab of tabs ?? []) {
    // Truncate large arrays (keywords/pages) to save tokens
    const data = JSON.parse(JSON.stringify(tab.data));
    if (data?.keyword_research?.keywords) {
      const kws = data.keyword_research.keywords;
      data.keyword_research.keywords_count = kws.length;
      data.keyword_research.keywords_sample = kws.slice(0, 5);
      delete data.keyword_research.keywords;
    }
    if (data?.website_architecture?.pages) {
      const pages = data.website_architecture.pages;
      data.website_architecture.pages_count = pages.length;
      data.website_architecture.pages_sample = pages.slice(0, 5);
      delete data.website_architecture.pages;
    }
    tabSnapshot[tab.tab_key] = data;
  }

  const knowledgeSummary = (knowledge ?? []).map((k: Record<string, unknown>) => ({
    type: k.type,
    content: typeof k.content === "string" ? k.content.slice(0, 500) : JSON.stringify(k.content).slice(0, 500),
  }));

  const languagesConfigured = (client.languages as string[]) ?? ["en"];
  const translationLangs = (translations ?? []).map((t: Record<string, unknown>) => t.language_code);

  const prompt = `You are a senior digital marketing QA reviewer. Analyze this client project data and find issues related to content quality, cross-tab consistency, completeness, and translation accuracy.

## CLIENT INFO
Name: ${client.name}
Slug: ${client.slug}
Project Objective: ${client.project_objective || "Not defined"}
Languages configured: ${languagesConfigured.join(", ")}
Translation languages with data: ${translationLangs.join(", ") || "none"}

## TAB DATA
${JSON.stringify(tabSnapshot, null, 2)}

## KNOWLEDGE BANK (${knowledgeSummary.length} entries)
${JSON.stringify(knowledgeSummary, null, 2)}

## REVIEW CHECKLIST
Check for these issues and report each as a finding:

### Cross-Tab Consistency
- Do demand keywords match the services described in the brief?
- Do website pages cover the services in the brief?
- Do marketing channels align with the target audience in the brief?
- Do execution deliverables align with the selected marketing channels?

### Content Quality
- Are descriptions generic/templated filler or specific to this business?
- Are there placeholder texts like "Lorem ipsum", "TBD", "TODO", "[insert here]"?
- Are numbers and metrics realistic (not obviously made up)?
- Is the brief ICP (ideal customer profile) specific enough?

### Completeness
- Are any tabs completely empty (just {} or very minimal data)?
- Are required fields missing in any tab?
- If demand tab has keywords, do they have search volumes and CPC data?
- If website tab has pages, do they have URLs or primary keywords?

### Translation Quality (only if non-English translations exist)
- Are translations actually translated or just copied English text?
- Do translated values make sense in context?

### Objective Alignment (if project objective is defined)
- Does the brief describe a business aligned with the stated objective?
- Do demand keywords serve the project objective (right services, right markets)?
- Does the website architecture support the objective (right pages, right audience)?
- Are marketing channels appropriate for reaching the objective's target audience?
- Do execution deliverables directly advance the objective?

### Overall Coherence
- Does the project tell a coherent story from brief through execution?
- Are there contradictions between tabs?

## RESPONSE FORMAT
Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "findings": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "category": "Cross-Tab Consistency" | "Content Quality" | "Completeness" | "Translation Quality" | "Objective Alignment" | "Coherence",
      "title": "Short title of the issue",
      "details": "Specific explanation of what's wrong and how to fix it",
      "affectedTab": "brief" | "marketing_channels" | "demand" | "website" | "assets" | "execution" | null
    }
  ]
}

Rules:
- Only report real, actionable issues. Do NOT invent problems.
- If a tab is empty, report it once under Completeness -- don't also flag it under other categories.
- Be specific: reference actual field values, not vague observations.
- Grade scale: A = production ready, B = minor polish needed, C = several issues, D = major gaps, F = not usable.
- Return ONLY the JSON object, no markdown fences or extra text.`;

  try {
    const result = await generateText({
      model: aiModel("primary"),
      prompt,
      temperature: 0.3,
    });

    let parsed: {
      summary: string;
      overallGrade: string;
      findings: DeepReviewFinding[];
    };

    try {
      // Try parsing directly
      parsed = JSON.parse(result.text);
    } catch {
      // Try extracting from markdown fences
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON", raw: result.text.slice(0, 500) },
          { status: 500 }
        );
      }
    }

    const reviewResult: DeepReviewResult = {
      clientId: client_id,
      clientName: client.name,
      findings: parsed.findings ?? [],
      summary: parsed.summary ?? "",
      overallGrade: (parsed.overallGrade as DeepReviewResult["overallGrade"]) ?? "C",
      reviewedAt: new Date().toISOString(),
    };

    return NextResponse.json(reviewResult);
  } catch (err) {
    return NextResponse.json(
      { error: "AI review failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}
