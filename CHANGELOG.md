# Changelog

## 2026-02-17 -- Billing/Roadmap Separation

Eliminated the dual-payment-system overlap in the Execution tab. Recurring billing now lives exclusively in the subscriptions system; the execution checklist is now a pure project roadmap.

- **ExecutionItem slimmed**: Removed `payment_type`, `payment_status`, `stripe_session_id`, `paid_at`, `invoice_url`, `invoice_pdf`, `price`. Added `estimated_cost` (display-only) and `currency` (optional). Schema default shape updated to match.
- **Admin execution editor rewritten**: Replaced flat field grid with structured form -- dropdown selects for `action_status` (not_started/in_progress/completed), `deadline_status` (not_set/on_track/at_risk/overdue), and `priority` (normal/high/critical). Color-coded left border by status. No billing fields remain.
- **Client execution tab rewritten as Project Roadmap**: Removed SummaryBar (invested/remaining/paid stats), SectionHeader (one-time vs monthly split), all payment buttons, CheckoutModal integration, and invoice download links. Replaced with ProgressSummary (completed/active/pending counts with progress bar) and clean StepRow components showing status indicators, deadline badges, priority warnings, and deliverable details. ServicesPanel remains at top for recurring billing.
- **i18n labels updated across all 7 languages**: Replaced 16 billing-focused keys (invested, remaining, paid, pay_and_start, activate, etc.) with 7 roadmap keys (project_roadmap, completed_label, in_progress_label, remaining_label, done, active, estimated_cost).

## 2026-02-17 -- Foundation for Scale (Q2-Q3 Feature Prep)

Laid the data layer for 6 planned features without any UI changes. Goal: every upcoming feature has its tables and types ready so building them is additive, not refactoring.

- **`client_type` column + enum**: Added `client_type_enum` (service_outbound, single_location, multi_location, ecommerce) to clients table. TypeScript: `ClientType`, `CLIENT_TYPES`, `CLIENT_TYPE_LABELS`. Wired into `ClientRow`, `ClientConfig`, and `data.ts`. Enables feature 6 (client-type-specific presets and UI).
- **`subscriptions` table**: For recurring Stripe services (SEO, PPC, SoMe management). Stores `service_key`, `stripe_subscription_id`, billing terms, termination notice period (`termination_months`), terms acceptance timestamp, and a `invoices` JSONB array of invoice snapshots. Indexed by client_id and stripe_subscription_id. TypeScript: `SubscriptionRow`, `SubscriptionInvoice`. Enables feature 1 (invoicing and payment system).
- **`channels` table**: One row per channel per client, replacing the flat JSONB blob. Stores `channel_key`, flexible `config` JSONB, and `progress` JSONB for gamification (current/target values, milestones, budget tracking). Links to subscription via `subscription_id`. Unique constraint on (client_id, channel_key). TypeScript: `ChannelRow`, `ChannelProgress`, `ChannelKey`, `CHANNEL_KEYS`, `CHANNEL_LABELS`. Enables feature 2 (channel sub-tabs with progress bars and deliverables).
- **`deliverables` table**: Timestamped activity log per client per channel. Types: backlink, content, tech_fix, ad_copy, ad_campaign, social_post, report, keyword_research, landing_page, other. Has `created_by` field for human vs AI attribution. JSONB `metadata` and `attachments`. Indexed for feed queries (by client+date, by channel, by type, by creator). TypeScript: `DeliverableRow`, `DeliverableType`, `DeliverableAttachment`. Enables features 2 (SEO deliverables feed), 4 (AI marketing hub content), and 5 (AI employee output logging).
- **All 4 tables have RLS enabled**, ready for row-level security policies when needed.

## 2026-02-16 -- Tech Debt Cleanup

- **Types hardened**: Added `stripe_customer_id`, `nav_color`, `nav_text_color` to `ClientRow`. Extracted `BrandingConfig` interface so branding types are declared once and reused across bottom-nav, branding-editor, and ClientConfig.
- **tab-data-editor split**: Broke the 1375-line mega-file into 5 focused modules under `components/admin/editors/` (shared primitives, brief-editor, channels-editor, execution-editor, json-editor). Orchestrator dropped to ~730 lines.
- **i18n labels extracted to JSON**: Moved 600+ lines of hardcoded UI_LABELS from `lib/i18n.ts` into `lib/i18n-labels.json`. The TS module is now ~110 lines of pure logic. Adding a new language means editing a JSON file, not code.
- **Dead sync-branding API removed**: Deleted `app/api/admin/clients/[id]/sync-branding/route.ts` and its call from the Assets tab save handler. Branding is now written directly via the Branding tab PATCH endpoint.

## 2026-02-16 -- Nav Color Support

- Added `nav_color` and `nav_text_color` columns to the clients table (DB migration).
- Updated branding editor to expose nav color fields.
- Bottom nav now reads `nav_color` / `nav_text_color` from client branding for fully custom navigation styling.

## 2026-02-15 -- Execution Tab Payments

- Integrated Stripe Checkout for execution checklist items with per-item payment flows.
- Added payment status tracking (`stripe_session_id`, `paid_at`) to execution items.
- Built invoice download and online view links post-payment.
- Sequential payment gating: each step requires the previous step to be paid first.

## 2026-02-14 -- Health Check System

- Created pluggable health check framework under `lib/health-checks/`.
- Added checks for branding completeness, tab data shape, translation coverage, demand/website data, and knowledge base status.
- Health check results surfaced in admin dashboard per client.

## 2026-02-13 -- Knowledge Base & Auto-fill

- Added knowledge base upload (file + URL) per client.
- Built AI auto-fill: generates tab data suggestions from the client's knowledge base.
- AI translation: translate entire tabs or individual blocks between any configured language pair.

## 2026-02-12 -- Multi-language Translation System

- Per-client language configuration (`default_language`, `available_languages`).
- Tab-level translations stored in `client_tab_translations` table.
- Deep-merge algorithm: base data is structural source of truth, translations overlay string values only.
- Translation-aware admin editor with base-text reference display and non-translatable field locking.

## 2026-02-11 -- Core Platform Launch

- Client portal with PIN-based access at `/[slug]`.
- Admin dashboard with client CRUD, tab data editor, branding editor.
- Six tab types: Brief, Marketing Channels, Demand (PPC), Website (SEO), Assets, Execution.
- Demand hub with CSV upload for PPC keyword research.
- Website hub with CSV upload for SEO page architecture and interactive sitemap tree.
- Assets hub with Vercel Blob file uploads, brand kit management, and brief generation.
