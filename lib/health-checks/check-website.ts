import type { HealthCheck, CheckContext } from "./types";
import { pass, warn } from "./types";

const CAT = "Website";

export const checkWebsite: HealthCheck = {
  category: CAT,
  order: 5,
  run({ tabs }: CheckContext) {
    const results = [];
    const tab = tabs.find((t) => t.tab_key === "website");
    if (!tab) return results;

    const wa = tab.data?.website_architecture as Record<string, unknown> | undefined;
    if (!wa) return [warn(CAT, "website.empty", "Website Data", "website_architecture block is missing")];

    const pages = wa.pages as unknown[] | undefined;
    if (!pages || pages.length === 0) {
      results.push(warn(CAT, "website.pages", "Pages", "No pages uploaded (SEO CSV)"));
    } else {
      results.push(pass(CAT, "website.pages", "Pages", `${pages.length} pages loaded`));

      const incomplete = (pages as Record<string, unknown>[]).filter(
        (p) => !p.full_url_path || !p.primary_keyword
      );
      if (incomplete.length > 0) {
        results.push(
          warn(CAT, "website.pages.incomplete", "Incomplete Pages", `${incomplete.length} pages missing URL or primary keyword`)
        );
      }
    }

    return results;
  },
};
