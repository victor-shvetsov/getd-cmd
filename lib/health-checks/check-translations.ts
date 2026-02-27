import { TAB_KEYS } from "@/lib/types";
import { UI_LABELS } from "@/lib/i18n";
import type { HealthCheck, CheckContext } from "./types";
import { pass, warn, fail } from "./types";

const CAT = "Translations";

export const checkTranslations: HealthCheck = {
  category: CAT,
  order: 3,
  run({ client, translations, tabTranslations }: CheckContext) {
    const results = [];
    const langs = (client.available_languages as string[]) ?? ["en"];
    const nonEn = langs.filter((l) => l !== "en");

    if (nonEn.length === 0) {
      return [pass(CAT, "i18n.langs", "Languages", "Single language (en) -- no translations needed")];
    }

    // UI label coverage
    const dbLangs = new Set(translations.map((t) => t.language_code));
    const missingUi = nonEn.filter((l) => !dbLangs.has(l));
    const missingBuiltin = missingUi.filter((l) => !UI_LABELS[l]);
    const coveredByBuiltin = missingUi.filter((l) => UI_LABELS[l]);

    if (missingBuiltin.length > 0) {
      results.push(fail(CAT, "i18n.ui.missing", "UI Labels", `No translations (DB or built-in) for: ${missingBuiltin.join(", ")}`));
    } else if (coveredByBuiltin.length > 0) {
      results.push(pass(CAT, "i18n.ui.builtin", "UI Labels", `All covered (${coveredByBuiltin.join(", ")} via built-in)`));
    } else {
      results.push(pass(CAT, "i18n.ui.db", "UI Labels", "All languages have DB translations"));
    }

    // Tab content translations
    const byLang: Record<string, Set<string>> = {};
    for (const tt of tabTranslations) {
      if (!byLang[tt.language_code]) byLang[tt.language_code] = new Set();
      byLang[tt.language_code].add(tt.tab_key);
    }

    for (const lang of nonEn) {
      const translated = byLang[lang] ?? new Set();
      const missing = TAB_KEYS.filter((k) => !translated.has(k));
      if (missing.length === TAB_KEYS.length) {
        results.push(warn(CAT, `i18n.content.${lang}`, `Content: ${lang.toUpperCase()}`, "No tab content translated yet"));
      } else if (missing.length > 0) {
        results.push(warn(CAT, `i18n.content.${lang}`, `Content: ${lang.toUpperCase()}`, `Missing: ${missing.join(", ")}`));
      } else {
        results.push(pass(CAT, `i18n.content.${lang}`, `Content: ${lang.toUpperCase()}`, "All tabs translated"));
      }
    }

    return results;
  },
};
