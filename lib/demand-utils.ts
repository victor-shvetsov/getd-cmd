import type { PPCKeyword, DemandByPage, DemandSummary } from "@/lib/types";

/**
 * Parse PPC keyword research CSV (your PPC expert's standard template).
 *
 * Expected columns (order matters, headers optional):
 *   Campaign | Ad Group | Keyword | Avg. monthly searches | Top of page bid (low) | Top of page bid (high) | Match type | Landing Page
 *
 * Handles:
 *   - Header row auto-detection (skips if first row contains "campaign" or "keyword")
 *   - Quoted fields with commas inside
 *   - Empty bid values (defaults to 0)
 *   - Tab-separated values (TSV) from Google Sheets paste
 */
export function parsePPCCsv(raw: string): PPCKeyword[] {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Detect separator: tab or comma
  const sep = lines[0].includes("\t") ? "\t" : ",";

  // Parse a single line respecting quoted fields
  function parseLine(line: string): string[] {
    if (sep === "\t") return line.split("\t").map((s) => s.trim());
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const rows = lines.map(parseLine);

  // Detect header row
  let startIdx = 0;
  const firstRow = rows[0].map((s) => s.toLowerCase());
  if (
    firstRow.some(
      (h) =>
        h.includes("campaign") ||
        h.includes("keyword") ||
        h.includes("ad group") ||
        h.includes("monthly")
    )
  ) {
    startIdx = 1;
  }

  const keywords: PPCKeyword[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 7) continue; // skip malformed rows
    const keyword = cols[2]?.trim();
    if (!keyword) continue; // skip empty keyword rows

    keywords.push({
      campaign: cols[0]?.trim() || "",
      ad_group: cols[1]?.trim() || "",
      keyword,
      avg_monthly_searches: parseNum(cols[3]),
      top_bid_low: parseNum(cols[4]),
      top_bid_high: parseNum(cols[5]),
      match_type: cols[6]?.trim() || "Broad",
      landing_page: cols[7]?.trim() || "",
    });
  }

  return keywords;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = val.replace(/[$€£,\s]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Aggregate raw PPC keywords into a page-grouped demand summary.
 * This is the computed view that drives both admin stats and client-facing display.
 */
export function aggregateDemand(keywords: PPCKeyword[]): DemandSummary {
  if (keywords.length === 0) {
    return {
      total_keywords: 0,
      total_monthly_searches: 0,
      avg_cpc_low: 0,
      avg_cpc_high: 0,
      pages_targeted: 0,
      by_page: [],
    };
  }

  // Group by landing page
  const pageMap = new Map<string, PPCKeyword[]>();
  for (const kw of keywords) {
    const page = kw.landing_page || "(no page assigned)";
    if (!pageMap.has(page)) pageMap.set(page, []);
    pageMap.get(page)!.push(kw);
  }

  const byPage: DemandByPage[] = [];
  let totalVol = 0;
  let totalBidLow = 0;
  let totalBidHigh = 0;
  let bidCount = 0;

  for (const [page, kws] of pageMap) {
    const vol = kws.reduce((s, k) => s + k.avg_monthly_searches, 0);
    const bidsLow = kws.filter((k) => k.top_bid_low > 0);
    const bidsHigh = kws.filter((k) => k.top_bid_high > 0);
    const avgLow =
      bidsLow.length > 0
        ? bidsLow.reduce((s, k) => s + k.top_bid_low, 0) / bidsLow.length
        : 0;
    const avgHigh =
      bidsHigh.length > 0
        ? bidsHigh.reduce((s, k) => s + k.top_bid_high, 0) / bidsHigh.length
        : 0;

    const campaigns = [...new Set(kws.map((k) => k.campaign))];
    const adGroups = [...new Set(kws.map((k) => k.ad_group))];

    byPage.push({
      landing_page: page,
      total_volume: vol,
      keyword_count: kws.length,
      avg_cpc_low: avgLow,
      avg_cpc_high: avgHigh,
      campaigns,
      ad_groups: adGroups,
      keywords: kws,
    });

    totalVol += vol;
    for (const k of kws) {
      if (k.top_bid_low > 0 || k.top_bid_high > 0) {
        totalBidLow += k.top_bid_low;
        totalBidHigh += k.top_bid_high;
        bidCount++;
      }
    }
  }

  // Sort by total volume descending
  byPage.sort((a, b) => b.total_volume - a.total_volume);

  return {
    total_keywords: keywords.length,
    total_monthly_searches: totalVol,
    avg_cpc_low: bidCount > 0 ? totalBidLow / bidCount : 0,
    avg_cpc_high: bidCount > 0 ? totalBidHigh / bidCount : 0,
    pages_targeted: pageMap.size,
    by_page: byPage,
  };
}

/** Currency symbols map */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  DKK: "kr",
  SEK: "kr",
  NOK: "kr",
  CHF: "CHF",
  CAD: "C$",
  AUD: "A$",
  PLN: "zł",
  CZK: "Kč",
  JPY: "¥",
  CNY: "¥",
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

/**
 * Format a number as currency (compact).
 */
export function fmtCurrency(n: number, currency = "USD"): string {
  if (n === 0) return "-";
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  // Currencies like DKK/SEK/NOK put symbol after number
  const suffixCurrencies = ["DKK", "SEK", "NOK", "CZK", "PLN"];
  if (suffixCurrencies.includes(currency)) {
    return n.toFixed(2) + " " + sym;
  }
  return sym + n.toFixed(2);
}

/**
 * Format large numbers with K suffix.
 */
export function fmtVolume(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}
