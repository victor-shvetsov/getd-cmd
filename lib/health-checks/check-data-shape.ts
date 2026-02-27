import type { TabKey } from "@/lib/types";
import { getSectionSchema } from "@/lib/schema";
import type { HealthCheck, CheckContext } from "./types";
import { pass, warn } from "./types";

const CAT = "Data Shape";

export const checkDataShape: HealthCheck = {
  category: CAT,
  order: 2,
  run({ tabs }: CheckContext) {
    const results = [];

    for (const tab of tabs) {
      const tabKey = tab.tab_key as TabKey;
      const schema = getSectionSchema(tabKey);
      if (!schema) continue;

      const data = tab.data ?? {};
      const expectedBlocks = schema.blocks.map((b) => b.key);
      const actualKeys = Object.keys(data);

      const missingBlocks = expectedBlocks.filter((k) => !(k in data));
      const extraKeys = actualKeys.filter((k) => !expectedBlocks.includes(k));

      if (missingBlocks.length > 0) {
        results.push(
          warn(CAT, `data.${tabKey}.missing`, `${tabKey}: Missing Blocks`, `Missing: ${missingBlocks.join(", ")}`)
        );
      }

      if (extraKeys.length > 0) {
        results.push(
          warn(CAT, `data.${tabKey}.extra`, `${tabKey}: Extra Keys`, `Unexpected: ${extraKeys.join(", ")} (possible AI pollution)`)
        );
      }

      // Empty block check
      for (const blockKey of expectedBlocks) {
        const blockData = data[blockKey];
        if (blockData === undefined || blockData === null) continue;
        if (typeof blockData === "object" && !Array.isArray(blockData)) {
          const inner = blockData as Record<string, unknown>;
          const allEmpty = Object.values(inner).every(
            (v) => v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0)
          );
          if (allEmpty) {
            results.push(
              warn(CAT, `data.${tabKey}.${blockKey}.empty`, `${tabKey}.${blockKey}: Empty`, "Block has structure but all fields are empty")
            );
          }
        }
      }

      if (missingBlocks.length === 0 && extraKeys.length === 0) {
        results.push(pass(CAT, `data.${tabKey}.shape`, `${tabKey}: Data Shape`, "Matches expected schema"));
      }
    }

    return results;
  },
};
