import labels from "./i18n-labels.json";

/* ------------------------------------------------------------------ */
/*  Static lookup data                                                 */
/* ------------------------------------------------------------------ */

export const LANG_FLAGS: Record<string, string> = {
  en: "\u{1F1EC}\u{1F1E7}",
  da: "\u{1F1E9}\u{1F1F0}",
  ro: "\u{1F1F7}\u{1F1F4}",
  ru: "\u{1F1F7}\u{1F1FA}",
  de: "\u{1F1E9}\u{1F1EA}",
  fr: "\u{1F1EB}\u{1F1F7}",
  es: "\u{1F1EA}\u{1F1F8}",
  it: "\u{1F1EE}\u{1F1F9}",
  nl: "\u{1F1F3}\u{1F1F1}",
  pl: "\u{1F1F5}\u{1F1F1}",
  pt: "\u{1F1F5}\u{1F1F9}",
  tr: "\u{1F1F9}\u{1F1F7}",
  uk: "\u{1F1FA}\u{1F1E6}",
};

/** All UI label translations -- loaded from i18n-labels.json */
export const UI_LABELS: Record<string, Record<string, Record<string, string>>> =
  labels.ui_labels;

/** Tab name translations (for nav labels) */
const TAB_LABELS: Record<string, Record<string, string>> = labels.tab_labels;

/* ------------------------------------------------------------------ */
/*  Translation helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Resolve a dotted key (e.g. "brief.title") against:
 * 1. DB translations for requested lang
 * 2. Built-in UI_LABELS for requested lang
 * 3. DB translations for English
 * 4. Built-in UI_LABELS for English
 */
export function t(
  key: string,
  lang: string,
  translations: Record<string, Record<string, Record<string, string>>>
): string {
  const [section, ...rest] = key.split(".");
  const field = rest.join(".");

  const val = translations[lang]?.[section]?.[field];
  if (val) return val;

  const builtinVal = UI_LABELS[lang]?.[section]?.[field];
  if (builtinVal) return builtinVal;

  const enVal = translations["en"]?.[section]?.[field];
  if (enVal) return enVal;

  const enDefault = UI_LABELS["en"]?.[section]?.[field];
  if (enDefault) return enDefault;

  return "";
}

/** Get localized tab label for the bottom nav */
export function getTabLabel(tabKey: string, lang: string): string {
  return TAB_LABELS[lang]?.[tabKey] ?? TAB_LABELS["en"]?.[tabKey] ?? tabKey;
}

/* ------------------------------------------------------------------ */
/*  Deep-merge translation data onto base structure                    */
/* ------------------------------------------------------------------ */

/**
 * Deep-merge translation text overrides onto the base data structure.
 *
 * RULES:
 * - Base data is the source of truth for STRUCTURE (arrays, objects, nesting).
 * - Translation data only overrides STRING values at matching paths.
 * - If the base has an array of 3 items and the translation has 5, we use 3 (base wins).
 * - Non-string values (numbers, booleans, nulls) are always taken from base.
 * - If translation has a string at a path where base also has a string, translation wins.
 */
export function mergeTranslation(
  base: unknown,
  translation: unknown
): unknown {
  if (base === null || base === undefined) return base;
  if (typeof base !== "object") {
    if (typeof base === "string" && typeof translation === "string" && translation !== "") {
      return translation;
    }
    return base;
  }

  if (Array.isArray(base)) {
    const transArr = Array.isArray(translation) ? translation : [];
    return base.map((item, i) => mergeTranslation(item, transArr[i]));
  }

  const baseObj = base as Record<string, unknown>;
  const transObj =
    translation !== null && typeof translation === "object" && !Array.isArray(translation)
      ? (translation as Record<string, unknown>)
      : {};
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(baseObj)) {
    result[key] = mergeTranslation(baseObj[key], transObj[key]);
  }
  return result;
}
