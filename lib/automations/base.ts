/**
 * Base interface that every automation must implement.
 *
 * Each automation lives in its own folder:
 *   lib/automations/[key]/
 *     index.ts     ← implements AutomationRunner
 *     workflow.ts  ← system prompt / SOP for Claude
 *     tools.ts     ← deterministic TypeScript functions
 *
 * Adding a new automation:
 *   1. Create the folder + files above
 *   2. Register the class in lib/automations/registry.ts
 *   3. Add the DB record via admin (or SQL)
 *   That's it — no other system changes.
 */

export interface TriggerPayload {
  /** Raw event data from the external webhook */
  [key: string]: unknown;
}

export interface ClientConfig {
  /** The client_id UUID from Supabase */
  client_id: string;
  /** The client's slug (URL identifier) */
  slug: string;
  /** Automation-specific config from automations.config JSONB */
  config: Record<string, unknown>;
}

export interface AutomationResult {
  success: boolean;
  /** Short description of what was done — stored in automation_runs.output_summary */
  summary: string;
  /** Counter increment: how many units of work were done (default 1) */
  increment?: number;
  /** Error message if success = false */
  error?: string;
}

export interface AutomationRunner {
  /** Must match the automation_key in the automations DB table */
  readonly key: string;
  /** Human-readable name for logs */
  readonly name: string;
  /** Execute the automation and return a result */
  run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult>;
}
