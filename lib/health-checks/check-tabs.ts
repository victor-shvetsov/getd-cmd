import { TAB_KEYS } from "@/lib/types";
import type { HealthCheck, CheckContext } from "./types";
import { pass, warn, fail } from "./types";

const CAT = "Tabs";

const EXPECTED_ORDER: Record<string, number> = {
  brief: 0,
  marketing_channels: 1,
  demand: 2,
  website: 3,
  assets: 4,
  execution: 5,
};

export const checkTabs: HealthCheck = {
  category: CAT,
  order: 1,
  run({ tabs }: CheckContext) {
    const results = [];
    const existing = new Set(tabs.map((t) => t.tab_key));

    // Presence
    const missing = TAB_KEYS.filter((k) => !existing.has(k));
    if (missing.length > 0) {
      results.push(fail(CAT, "tabs.missing", "Missing Tabs", `Tabs not found: ${missing.join(", ")}`));
    } else {
      results.push(pass(CAT, "tabs.missing", "All Tabs Present", "All 6 tabs exist"));
    }

    // Sort order
    const wrongOrder = tabs.filter(
      (t) => EXPECTED_ORDER[t.tab_key] !== undefined && t.sort_order !== EXPECTED_ORDER[t.tab_key]
    );
    if (wrongOrder.length > 0) {
      results.push(
        warn(
          CAT,
          "tabs.order",
          "Tab Order",
          `Wrong sort_order: ${wrongOrder.map((t) => `${t.tab_key} is ${t.sort_order}, expected ${EXPECTED_ORDER[t.tab_key]}`).join("; ")}`
        )
      );
    } else {
      results.push(pass(CAT, "tabs.order", "Tab Order", "All tabs in correct order"));
    }

    return results;
  },
};
