/**
 * Centralized AI configuration.
 *
 * Every AI call in the project imports from here.
 * When a new model drops, change ONE line and the entire app upgrades.
 * When adding a new AI feature, call getClientAIContext() to get
 * the project objective + knowledge automatically.
 *
 * Uses Vercel AI Gateway format: "provider/model-name"
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ── Models ── */

/** Primary model -- used for complex reasoning, content generation, deep review */
export const AI_MODEL_PRIMARY = "openai/gpt-5.2" as const;

/** Fast model -- used for extraction, classification, quick tasks */
export const AI_MODEL_FAST = "openai/gpt-5.2" as const;

/**
 * Helper to pick the right model by task type.
 * Keeps call sites readable:  model: aiModel("primary")
 */
export function aiModel(tier: "primary" | "fast" = "primary"): string {
  return tier === "fast" ? AI_MODEL_FAST : AI_MODEL_PRIMARY;
}

/* ── Client AI Context ── */

export interface ClientAIContext {
  /** Client name */
  name: string;
  /** Project objective (raw text, may be empty) */
  objective: string;
  /** Extracted facts from Knowledge Bank entries */
  facts: unknown[];
  /** Pre-formatted prompt block ready to paste into any system/user prompt.
   *  Includes "## PROJECT OBJECTIVE" and "## ACCUMULATED KNOWLEDGE" sections.
   *  If objective is empty it shows a sensible fallback. */
  promptBlock: string;
}

/**
 * Fetches the standard AI context for a client in one call.
 *
 * Usage in any AI route:
 * ```ts
 * const ctx = await getClientAIContext(supabase, clientId);
 * const prompt = `You are a strategist.\n\n${ctx.promptBlock}\n\nDo something.`;
 * ```
 *
 * This is the single source of truth for what every AI feature receives.
 * Adding a new field here automatically propagates to every AI call.
 */
export async function getClientAIContext(
  supabase: SupabaseClient,
  clientId: string,
): Promise<ClientAIContext> {
  // Fetch client row & knowledge entries in parallel
  const [clientRes, entriesRes] = await Promise.all([
    supabase
      .from("clients")
      .select("name, project_objective")
      .eq("id", clientId)
      .single(),
    supabase
      .from("knowledge_entries")
      .select("extracted_facts")
      .eq("client_id", clientId)
      .eq("status", "done"),
  ]);

  const name = clientRes.data?.name ?? "Unknown";
  const objective = clientRes.data?.project_objective ?? "";
  const facts = (entriesRes.data ?? [])
    .map((e: { extracted_facts: unknown }) => e.extracted_facts)
    .filter(Boolean);

  const objectiveSection = objective
    ? `## PROJECT OBJECTIVE (the north star -- every output must serve this goal):\n${objective}`
    : `## PROJECT OBJECTIVE:\nNot defined yet -- use whatever context is available.`;

  const knowledgeSection = facts.length > 0
    ? `## ACCUMULATED KNOWLEDGE ABOUT THE CLIENT:\n${JSON.stringify(facts, null, 2)}`
    : `## ACCUMULATED KNOWLEDGE ABOUT THE CLIENT:\nNo data collected yet.`;

  const promptBlock = `${objectiveSection}\n\n${knowledgeSection}`;

  return { name, objective, facts, promptBlock };
}
