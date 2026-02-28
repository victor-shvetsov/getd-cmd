# QA Evaluation Criteria

Exact checklist for each area. "Passing" = code is correct AND DB supports it.

---

## Auth & Security

| Check | Passing | Failing |
|-------|---------|---------|
| PIN hashing | `clients.pin_hash` populated for all clients, `verify-pin` uses bcrypt | `pin_hash` null, plaintext comparison in verify-pin |
| PIN rate limiting | `pin_login_attempts` table exists, verify-pin returns 429 after 5 attempts in 15 min | No rate limit, accepts unlimited attempts |
| Admin auth | `isAdminRequest()` called at top of every admin route | Any admin route missing the check |
| Stripe webhook idempotency | `stripe_webhook_events` table exists, event.id inserted before processing | Missing table or check |

---

## Sales Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Revenue ring renders | ProgressRing SVG shows with correct % | Blank or broken |
| Month navigation | Prev/Next buttons change month, future months disabled | Navigation broken or allows future |
| Locale-aware formatting | `fmtCurrency` and `fmtCompact` use `langToLocale(lang)` | Hardcoded `"da-DK"` |
| Category breakdown | Bars render with correct percentages | Missing or incorrect math |
| Source tagging | Untagged sales show picker, tagged sales show label | Picker doesn't open or save |
| Manual sale entry | FAB opens sheet, sale is saved, list updates | Sheet doesn't open or save fails |
| DB schema | `sales` table has `source`, `customer_name`, `category_name`, `amount` | Missing columns |
| Revenue goal | `client_tabs.data.revenue_goal` read correctly | Shows 0 when goal is set |

---

## Demand Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Keyword data displays | Table/list renders keyword rows | Empty or broken |
| Framing | Language is opportunity-focused ("X people searching"), no marketing jargon | Shows raw SEO metrics |
| Search volume totals | Aggregated correctly | Wrong math |

---

## Activity Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Grouped by month | Entries group under month headers | Flat list or wrong grouping |
| Locale-aware dates | `langToLocale(lang)` used in `getRelativeDate` and `groupByMonth` | Hardcoded locale |
| Category icons | Correct icon per category (seo/ads/website/automation/general) | Wrong icon or missing |
| Swedish locale | `se` maps to `sv-SE` | Falls back to English |
| Empty state | Friendly message shown when no entries | Blank screen |

---

## Assets Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Grid renders | Assets display in grid layout | Blank or list layout |
| Download links work | Tap/click triggers download or opens URL | Link broken |
| Categories visible | Brand kit / Photos / Videos separated | All mixed together |

---

## Automations Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Toggle updates DB | On/off toggle PATCHes automations.is_enabled | Toggle fires but DB unchanged |
| Counter displays | counter_value from DB shows with counter_label | Always 0 or missing |
| Social poster "coming soon" | Badge shown, toggle disabled | Toggle active, can be turned on |
| Approval queue visible | `pending_approval` runs appear as DraftCards | No draft UI |
| Draft approve/discard | PATCH /api/automations/drafts/[runId] called, draft removed | Nothing happens on click |
| 15s draft refresh | SWR polls drafts endpoint every 15s | No polling |
| DB: require_approval | `automations.require_approval` column exists | Column missing |
| DB: draft columns | `automation_runs.draft_content` and `payload` columns exist | Columns missing |

---

## Execution Tab

| Check | Passing | Failing |
|-------|---------|---------|
| Sequential gating | Only first unpaid item shows Pay button; rest show "Pay previous first" | All items show Pay |
| Stripe checkout embeds | Clicking Pay opens Stripe embedded checkout | Opens new tab or fails |
| Price is server-side | `/api/checkout` reads price from DB, not from request body | Price comes from client |
| Completed items show as achievements | Green checkmark, celebration framing | Show as boring list |
| Subscriptions panel | Monthly items in separate Growth section | Mixed with one-time items |
| Investment framing | Shows "Your investment so far: kr X" not "Total paid" | Labelled as cost/expense |

---

## Admin Panel

| Check | Passing | Failing |
|-------|---------|---------|
| Client create seeds 6 tabs | New client gets sales/demand/activity/assets/automations/execution rows | Some tabs missing |
| Tab visibility toggle | is_visible PATCH works, client portal respects it | Toggle fires but nothing changes |
| Automation require_approval | Toggle visible in automations editor Info tab | Missing |
| notify_email field | Input shown when require_approval is on | Always hidden or always shown |
| PIN migration endpoint | `/api/admin/clients/migrate-pins` exists and works | 404 |
| Knowledge Hub editor | Can add/edit knowledge entries, trigger extraction | Missing or broken |

---

## Knowledge Hub → AI Pipeline

| Check | Passing | Failing |
|-------|---------|---------|
| Extraction saves facts | After running extract, `extracted_facts` JSONB populated, status='done' | null facts or wrong status |
| getClientAIContext uses facts | `lib/ai-config.ts` queries `knowledge_entries` where status='done' | Query missing or wrong |
| Autofill uses context | Both autofill routes call `getClientAIContext` and include `ctx.promptBlock` | Hardcoded prompt, no facts |
| Error when no facts | Autofill returns 400 with message if no done entries | Silent failure or empty output |

---

## i18n

| Check | Passing | Failing |
|-------|---------|---------|
| langToLocale in sales-tab | Function exists, used in fmtCurrency, fmtCompact, SaleRow, getMonthLabel | Hardcoded "da-DK" anywhere |
| langToLocale in activity-tab | Function exists, used in getRelativeDate and groupByMonth | Hardcoded locale |
| Swedish support | `se: "sv-SE"` in both langToLocale maps | `se` missing, falls to default |
| No hardcoded UI strings | Client-facing strings use t() helper | Hardcoded English strings |

---

## Known Issues Status (from CLAUDE.md)

Track which known issues are fixed vs open:

| Issue | Status |
|-------|--------|
| PIN plaintext → bcrypt | Should be FIXED — verify |
| No rate limit on verify-pin | Should be FIXED — verify |
| Stripe idempotency | Should be FIXED — verify |
| Admin auth is base64 not JWT | Still OPEN |
| Prices from request body in checkout | Still OPEN — verify |
| Zod missing on API routes | Still OPEN |
| No React error boundaries | Still OPEN |
| No audit logging | Still OPEN |
| No tests | Still OPEN |
