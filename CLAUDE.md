# CLAUDE.md

> Read this before touching anything. Read PRODUCT_VISION.md before any feature work.

---

## What This Is

A white-labeled client portal for Victor's digital marketing agency in Copenhagen.
Each client gets a personal URL, logs in with a PIN, and sees a branded dashboard showing
their sales, market demand, activity log, assets, automations, and project roadmap.

The target user is "Thomas" — a non-technical business owner. If Thomas wouldn't understand
something in 3 seconds, it doesn't belong in the client view.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router), React 19, TypeScript |
| Database | Supabase (PostgreSQL + Storage) |
| Payments | Stripe (one-time + subscriptions, embedded checkout) |
| Automations | Claude API (`@anthropic-ai/sdk`), all in TypeScript, same Vercel deployment |
| UI | Tailwind CSS, Radix UI, Lucide icons |
| File storage | Vercel Blob |
| Hosting | Vercel (auto-deploys from GitHub main branch) |
| Package manager | pnpm |

---

## Dev Commands

```bash
pnpm dev          # start local dev server
pnpm build        # production build — run before pushing to catch errors
pnpm lint         # ESLint check
```

Local dev needs a `.env.local` file. Get values from Vercel project settings → Environment Variables.

Required env vars:
```
NEXT_PUBLIC_SUPABASE_URL=https://jjciiswzkaxlunjkwprp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Vercel env vars>
SUPABASE_SERVICE_ROLE_KEY=<from Vercel env vars>
STRIPE_SECRET_KEY=<from Vercel env vars>
STRIPE_WEBHOOK_SECRET=<from Vercel env vars>
ADMIN_PASSWORD=<from Vercel env vars>
ANTHROPIC_API_KEY=<from Anthropic console>
RESEND_API_KEY=<from resend.com>
AUTOMATION_WEBHOOK_SECRET=<any random string>
```

---

## Project Structure

```
app/
  [slug]/page.tsx           # Dynamic client portal (one per client)
  admin/page.tsx            # Admin dashboard (password-protected)
  api/
    verify-pin/             # Client PIN authentication
    checkout/               # Stripe one-time payments
    subscribe/              # Stripe subscriptions
    sales/                  # Sales CRUD
    activity/               # Activity log CRUD
    automations/
      route.ts              # Automation CRUD + toggle
      [key]/trigger/        # Webhook entrypoint per automation
    cron/                   # Scheduled automation runs (Vercel Cron)
    webhooks/
      stripe/               # Stripe event handler
      automation/           # Counter increment from external sources
    admin/                  # All admin API routes (auth-protected)

components/
  tabs/                     # 6 active client-facing tabs
  admin/                    # Admin editor components
  ui/                       # Radix UI component library

lib/
  types.ts                  # All TypeScript interfaces (source of truth for data shapes)
  schema.ts                 # Tab schemas and default data
  i18n.ts                   # Three-layer translation system
  data.ts                   # Data fetching (getClientBySlug, etc.)
  admin-auth.ts             # Admin Bearer token verification
  stripe.ts                 # Stripe client
  supabase/
    server.ts               # Server-side Supabase client
    admin.ts                # Service role client (bypasses RLS)
    client.ts               # Browser Supabase client
  automations/              # ← All automation logic lives here
    base.ts                 # AutomationRunner interface
    registry.ts             # Key → class mapping
    lead-reply/             # One folder per automation
    social-poster/
    review-collector/

scripts/
  001_create_tables.sql     # Full DB schema with RLS policies
```

---

## Key Conventions

### Authentication
- **Clients**: PIN-based. Validated via `/api/verify-pin`. Stored in sessionStorage as `pin_auth_{slug}`.
- **Admin**: Bearer token in sessionStorage as `admin_token`. Checked by `isAdminRequest()` in `lib/admin-auth.ts`.
- All admin API routes call `isAdminRequest()` at the top — never skip this.

### Database
- Use `lib/supabase/admin.ts` (service role) in all API routes — it bypasses RLS.
- Use `lib/supabase/server.ts` for server components that respect RLS.
- `client_tabs.data` is polymorphic JSONB — the shape depends on `tab_key`. See `lib/types.ts` for interfaces.
- Per-client branding: individual columns on the `clients` table (`primary_color`, `secondary_color`, etc.), not the deprecated `theme` JSONB.

### Branding / Theming
- Applied dynamically via CSS custom properties on `:root` in `components/client-app.tsx`.
- Variables: `--client-primary`, `--client-accent`, `--client-bg`, `--client-text`, `--client-border-radius`, etc.
- Never hardcode client colors — always go through CSS variables.

### i18n
- 8 languages: EN, DA, SE, RO, RU, DE, FR, ES.
- Three-layer resolution: built-in labels (`lib/i18n-labels.json`) → DB translations → tab-specific translations.
- Use the `t()` helper from `lib/i18n.ts`. Never hardcode UI strings in client-facing components.

### Automations
- Each automation lives in its own folder under `lib/automations/[key]/`.
- Must implement the `AutomationRunner` interface from `lib/automations/base.ts`.
- Must be registered in `lib/automations/registry.ts`.
- Structure per automation:
  - `index.ts` — orchestrates the run
  - `workflow.ts` — system prompt / SOP passed to Claude
  - `tools.ts` — deterministic TypeScript functions (send email, post to social, etc.)
- Client-specific config lives in `automations.config` JSONB column in Supabase.
- All runs are logged to the `automation_runs` table.
- The trigger endpoint is `/api/automations/[key]/trigger/route.ts`.
- Never call Claude directly in an API route — go through the automation's `run()` method.

### Payments
- One-time: `POST /api/checkout` → Stripe embedded checkout → webhook confirms in `/api/webhooks/stripe`.
- Subscriptions: `POST /api/subscribe` → same flow with `mode: "subscription"`.
- **Never trust client-supplied prices.** Prices must be read server-side from Supabase, not from the request body.

### Error Handling
- API routes: return structured `{ error: string }` with appropriate HTTP status codes.
- Never use `.catch(() => {})` — silent failures are worse than crashes.
- Log errors before returning them: `console.error("[route-name]", error)`.

---

## Active Tabs (Client-Facing)

| Key | Component | What it shows |
|-----|-----------|---------------|
| `sales` | `SalesTab` | Monthly revenue vs goal, category breakdown |
| `demand` | `DemandTab` | Market search demand (Google Keyword Planner data) |
| `activity` | `ActivityTab` | Chronological log of work done |
| `assets` | `AssetsTab` | Brand kit, photos, videos — tap to download |
| `automations` | `AutomationsTab` | On/off toggles + activity counters |
| `execution` | `ExecutionTab` | Project roadmap + Stripe payment items + subscriptions |

Legacy tabs (`brief`, `website`, `marketing_channels`) exist in the codebase but are not part of the
current product. Do not add features to them. They will be removed.

---

## Known Issues (Do Not Introduce More)

These exist and are tracked — don't make them worse or duplicate the pattern:

1. Client PINs stored as plaintext (needs bcrypt hashing)
2. Admin Bearer token is base64-encoded password, not a real JWT
3. No rate limiting on `/api/verify-pin` or `/api/admin/auth`
4. Prices read from JSONB in checkout route — need a server-side price table
5. Zod is installed but not used in API routes — add it when touching a route
6. No React error boundaries on tab components
7. No audit logging for admin mutations
8. No tests

---

## Workflow

```
Edit locally → pnpm build (catch errors) → git push main → Vercel deploys automatically
```

When working on a feature:
1. Read the relevant files before suggesting changes.
2. Check `lib/types.ts` to understand data shapes before touching DB queries.
3. Run `pnpm build` before pushing — TypeScript errors in CI will block the deploy.
4. Update `PRODUCT_VISION.md` if a decision changes the product direction.
