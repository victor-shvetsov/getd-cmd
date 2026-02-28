import type { AutomationRunner } from "./base";
import { LeadReplyAutomation } from "./lead-reply";
import { SocialPosterAutomation } from "./social-poster";
import { ReviewCollectorAutomation } from "./review-collector";

/**
 * Central registry of all available automations.
 * Key = automation_key in the DB.
 *
 * To add a new automation:
 *   1. Create lib/automations/[key]/index.ts
 *   2. Import and add it here
 */
const automations: AutomationRunner[] = [
  new LeadReplyAutomation(),
  new SocialPosterAutomation(),
  new ReviewCollectorAutomation(),
];

export const registry = new Map<string, AutomationRunner>(
  automations.map((a) => [a.key, a])
);

export function getAutomation(key: string): AutomationRunner | undefined {
  return registry.get(key);
}
