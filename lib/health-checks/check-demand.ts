import type { HealthCheck, CheckContext } from "./types";
import { pass, warn } from "./types";

const CAT = "Demand";

export const checkDemand: HealthCheck = {
  category: CAT,
  order: 4,
  run({ tabs }: CheckContext) {
    const results = [];
    const tab = tabs.find((t) => t.tab_key === "demand");
    if (!tab) return results;

    const kr = tab.data?.keyword_research as Record<string, unknown> | undefined;
    if (!kr) return [warn(CAT, "demand.empty", "Demand Data", "keyword_research block is missing")];

    const keywords = kr.keywords as unknown[] | undefined;
    if (!keywords || keywords.length === 0) {
      results.push(warn(CAT, "demand.keywords", "Keywords", "No keywords uploaded (PPC CSV)"));
    } else {
      results.push(pass(CAT, "demand.keywords", "Keywords", `${keywords.length} keywords loaded`));
    }

    if (!kr.currency || kr.currency === "USD") {
      results.push(warn(CAT, "demand.currency", "Currency", `Currency is ${kr.currency || "not set"} -- verify it's correct`));
    }

    return results;
  },
};
