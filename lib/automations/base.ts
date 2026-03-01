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
  /**
   * When true, the automation generates content but does NOT send it.
   * The caller is responsible for storing the draft and awaiting approval.
   */
  draftMode?: boolean;
  /**
   * Client-level email connection (IMAP + SMTP credentials).
   * Set on clients.email_account JSONB — shared across all automations for this client.
   * Automations use this for sending/receiving; falls back to config fields if absent.
   */
  emailAccount?: Record<string, unknown> | null;
}

export interface AutomationResult {
  success: boolean;
  /** Short description of what was done — stored in automation_runs.output_summary */
  summary: string;
  /** Counter increment: how many units of work were done (default 1) */
  increment?: number;
  /** Error message if success = false */
  error?: string;
  /**
   * When draftMode was true, the generated content to be reviewed before sending.
   * Not set when draftMode is false (normal run).
   */
  draftContent?: string;
  /**
   * When draftMode was false and the automation sent a message, this is the
   * actual content that was sent. Used to log outbound conversations.
   */
  sentContent?: string;
}

export interface AutomationRunner {
  /** Must match the automation_key in the automations DB table */
  readonly key: string;
  /** Human-readable name for logs */
  readonly name: string;
  /** Execute the automation and return a result */
  run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult>;
}
