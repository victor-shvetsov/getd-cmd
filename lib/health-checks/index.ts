/**
 * Health Check Registry
 *
 * To add a new check:
 * 1. Create a new file in lib/health-checks/ (e.g. check-my-feature.ts)
 * 2. Export a HealthCheck object with { category, order, run }
 * 3. Import and add it to the `checks` array below
 *
 * That's it -- the health API and UI will pick it up automatically.
 */

export type { CheckResult, ClientHealth, CheckContext, HealthCheck } from "./types";
export { pass, warn, fail } from "./types";

import type { HealthCheck } from "./types";

import { checkBranding } from "./check-branding";
import { checkTabs } from "./check-tabs";
import { checkDataShape } from "./check-data-shape";
import { checkTranslations } from "./check-translations";
import { checkDemand } from "./check-demand";
import { checkWebsite } from "./check-website";
import { checkKnowledge } from "./check-knowledge";

/**
 * All registered health checks, sorted by order.
 * Add new checks here as the app grows.
 */
export const ALL_CHECKS: HealthCheck[] = [
  checkBranding,
  checkTabs,
  checkDataShape,
  checkTranslations,
  checkDemand,
  checkWebsite,
  checkKnowledge,
].sort((a, b) => a.order - b.order);
