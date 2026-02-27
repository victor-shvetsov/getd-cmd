import type { SEOPage, SiteTreeNode } from "@/lib/types";

/**
 * Parse SEO keyword research CSV (your standard SEO template).
 *
 * Expected columns (tab or comma separated):
 *   Cluster Name | Primary Keyword | Search Volume | Intent | Page Type | Full URL Path | Priority | Secondary Keywords
 *
 * Secondary keywords are semicolon-separated within the field.
 */
export function parseSEOCsv(raw: string): SEOPage[] {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Detect separator: tab or comma
  const sep = lines[0].includes("\t") ? "\t" : ",";

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
        h.includes("cluster") ||
        h.includes("keyword") ||
        h.includes("url") ||
        h.includes("volume") ||
        h.includes("intent")
    )
  ) {
    startIdx = 1;
  }

  const pages: SEOPage[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 6) continue;
    const url = cols[5]?.trim();
    if (!url) continue;

    pages.push({
      cluster_name: cols[0]?.trim() || "",
      primary_keyword: cols[1]?.trim() || "",
      search_volume: parseNum(cols[2]),
      intent: cols[3]?.trim() || "",
      page_type: cols[4]?.trim() || "",
      full_url_path: url,
      priority: cols[6]?.trim() || "P2",
      secondary_keywords: (cols[7] || "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
      status: "planned",
      notes: "",
    });
  }

  return pages;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,\s]/g, "").trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

/**
 * Build a site tree from flat SEO pages.
 * 
 * Takes URL paths like:
 *   /uk/dental-implants-abroad/
 *   /uk/dental-implants-abroad/cost/
 *   /uk/dental-implants-abroad/all-on-4/
 *   /uk/dental-tourism/
 * 
 * And builds a hierarchy:
 *   uk/
 *     dental-implants-abroad/     (Pillar, 480/mo)
 *       cost/                     (Service, 170/mo)
 *       all-on-4/                 (Service, 70/mo)
 *     dental-tourism/             (Category, 390/mo)
 */
export function buildSiteTree(pages: SEOPage[]): SiteTreeNode[] {
  const root: SiteTreeNode = {
    segment: "/",
    full_path: "/",
    page: null,
    children: [],
    total_volume: 0,
    total_pages: 0,
    live_pages: 0,
  };

  for (const page of pages) {
    const path = page.full_url_path.replace(/^\//, "").replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);

    let current = root;
    let builtPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      builtPath += "/" + seg;

      let child = current.children.find((c) => c.segment === seg);
      if (!child) {
        child = {
          segment: seg,
          full_path: builtPath + "/",
          page: null,
          children: [],
          total_volume: 0,
          total_pages: 0,
          live_pages: 0,
        };
        current.children.push(child);
      }

      // If this is the last segment, attach the page data
      if (i === segments.length - 1) {
        child.page = page;
      }

      current = child;
    }
  }

  // Recursively aggregate stats
  function aggregate(node: SiteTreeNode): void {
    let vol = 0;
    let pageCount = 0;
    let live = 0;

    if (node.page) {
      vol += node.page.search_volume;
      pageCount += 1;
      if (node.page.status === "live") live += 1;
    }

    for (const child of node.children) {
      aggregate(child);
      vol += child.total_volume;
      pageCount += child.total_pages;
      live += child.live_pages;
    }

    node.total_volume = vol;
    node.total_pages = pageCount;
    node.live_pages = live;
  }

  aggregate(root);

  // Sort children by total volume descending at each level
  function sortTree(node: SiteTreeNode): void {
    node.children.sort((a, b) => b.total_volume - a.total_volume);
    node.children.forEach(sortTree);
  }

  sortTree(root);

  return root.children;
}

/**
 * Get all unique top-level segments (locations) from pages.
 * E.g., from /uk/..., /de/..., /us/... -> ["uk", "de", "us"]
 */
export function getLocationSegments(pages: SEOPage[]): string[] {
  const segments = new Set<string>();
  for (const p of pages) {
    const first = p.full_url_path.replace(/^\//, "").split("/")[0];
    if (first) segments.add(first);
  }
  return [...segments].sort();
}

/**
 * Compute site-wide summary stats.
 */
export function computeWebsiteStats(pages: SEOPage[]) {
  const total = pages.length;
  const totalVolume = pages.reduce((s, p) => s + p.search_volume, 0);
  const live = pages.filter((p) => p.status === "live").length;
  const inProgress = pages.filter((p) =>
    ["copy_ready", "in_design", "in_dev"].includes(p.status)
  ).length;
  const planned = pages.filter((p) => p.status === "planned").length;

  const byType = new Map<string, number>();
  for (const p of pages) {
    const t = p.page_type || "Other";
    byType.set(t, (byType.get(t) || 0) + 1);
  }

  const byIntent = new Map<string, number>();
  for (const p of pages) {
    const i = p.intent || "Other";
    byIntent.set(i, (byIntent.get(i) || 0) + 1);
  }

  const byPriority = new Map<string, number>();
  for (const p of pages) {
    const pr = p.priority || "P2";
    byPriority.set(pr, (byPriority.get(pr) || 0) + 1);
  }

  return {
    total,
    totalVolume,
    live,
    inProgress,
    planned,
    byType: Object.fromEntries(byType),
    byIntent: Object.fromEntries(byIntent),
    byPriority: Object.fromEntries(byPriority),
    progressPercent: total > 0 ? Math.round((live / total) * 100) : 0,
  };
}

/** Page status options for admin dropdown */
export const PAGE_STATUSES = [
  { value: "planned", label: "Planned", color: "#94a3b8" },
  { value: "copy_ready", label: "Copy Ready", color: "#f59e0b" },
  { value: "in_design", label: "In Design", color: "#8b5cf6" },
  { value: "in_dev", label: "In Development", color: "#3b82f6" },
  { value: "live", label: "Live", color: "#059669" },
] as const;

/** Format volume with K suffix */
export function fmtVol(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1) + "K";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}
