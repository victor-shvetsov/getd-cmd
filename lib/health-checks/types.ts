import type { SupabaseClient } from "@supabase/supabase-js";

export interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  details: string;
  category: string;
}

export interface ClientHealth {
  clientId: string;
  clientName: string;
  slug: string;
  checks: CheckResult[];
  score: number;
}

/**
 * Context passed to every health check.
 * Add new fields here as the app grows — all checks get them automatically.
 */
export interface CheckContext {
  client: Record<string, unknown>;
  tabs: {
    tab_key: string;
    sort_order: number;
    is_visible: boolean;
    data: Record<string, unknown>;
  }[];
  translations: {
    language_code: string;
    translations: Record<string, Record<string, string>>;
  }[];
  tabTranslations: {
    tab_key: string;
    language_code: string;
  }[];
  supabase: SupabaseClient;
}

/**
 * A health check module.
 * Drop a new file in lib/health-checks/ that exports this shape,
 * then register it in the registry.
 */
export interface HealthCheck {
  /** Unique category name shown in the UI */
  category: string;
  /** Sort priority (lower = runs first) */
  order: number;
  /** The check function */
  run: (ctx: CheckContext) => CheckResult[] | Promise<CheckResult[]>;
}

/* ── Helper factories ── */
export function pass(category: string, id: string, label: string, details: string): CheckResult {
  return { id, label, status: "pass", details, category };
}
export function warn(category: string, id: string, label: string, details: string): CheckResult {
  return { id, label, status: "warn", details, category };
}
export function fail(category: string, id: string, label: string, details: string): CheckResult {
  return { id, label, status: "fail", details, category };
}
