# Product Vision: Client Marketing Dashboard

> This is the single source of truth for the product concept, business model, and design philosophy.
> Any developer, AI, or stakeholder working on this project MUST read this first.
> Last updated: Feb 27, 2026

---

## The Business

Victor runs a digital marketing and web development agency in Copenhagen. He does great work for clients but has always struggled with the money side -- collecting payments, setting the right prices, chasing invoices. This app exists to solve that: clients pay upfront through Stripe, embedded directly in the dashboard. No invoices to chase.

Victor is also an automation builder. He's pivoting his BNI (networking group) pitch from "digital marketing agency" to "I build automations that save you time and make you money." The automations are technically simple for him but feel like dark magic to his clients.

---

## The Target User: "Thomas"

Thomas runs lucaffe.dk -- he sells espresso machines in Denmark. All his sales come from networking, zero online presence. His exact words about computers: "The only thing I know is how to open e-conomics and press my 3 buttons to send an invoice. That's all I can do."

Thomas represents every client this app is built for:
- **Regular trades/business owners** -- plumbers, dentists, cafe owners, equipment sellers
- **Not tech-savvy at all** -- they don't understand and don't want to understand marketing terms
- **They care about ONE thing: am I selling enough stuff?**
- **They value their time above everything** -- they're busy doing their actual work
- **They buy results, not services** -- Thomas doesn't buy "SEO", he buys "more of those 27,400 people finding my shop"

### The Golden Rule
If Thomas wouldn't understand it in 3 seconds, it doesn't belong in the client view.

---

## The Product: 6 Tabs

The app is a white-labeled client portal. Each client gets a personal link, logs in with a PIN code, and sees their own branded dashboard (their colors, their logo, their language). Everything is designed for people who know 3 buttons.

### Tab 1: Sales (The Morning Number)

**What it answers:** "Am I selling enough this month?"

- ONE big number at the top: total revenue vs monthly goal (e.g., kr 180,000 / kr 400,000)
- A simple progress indicator -- Thomas opens this every morning and immediately feels either "I'm on track" or "I need more"
- Below the big number: a breakdown by product category (Automatic machines, Manual machines, Spare parts, Coffee) showing what's contributing to the total
- Product categories do NOT have individual targets -- Thomas doesn't think that way. Just show what's selling and what's not, like a ranking
- **Offline sales adjustment** -- Thomas sells at networking events and trade shows. He needs a simple way to tap and add a sale that happened outside the website. If the dashboard only shows online sales, it feels broken
- Data sources: Stripe transactions (online), manual input (offline). Consider GA4 e-commerce events later, but only after Victor controls the full chain (website + tracking setup)

### Tab 2: Demand (The Eye-Opener)

**What it answers:** "How many people are looking for what I sell?"

This is the tab that sells Victor's services. When Thomas heard "27,400 people search for espressomaskine every month in Denmark," his voice changed. That's the hook.

- Show the total search demand for the client's product/service category
- Frame it as opportunity, not data: "27,400 people search for espresso machines every month. Last month, 840 of them found you."
- The gap between total demand and current reach IS Victor's permanent sales pitch: "We're capturing 3% of the market. Want to go for 10%?"
- Break down by product type in simple language: "Automatic machines: 8,100 searches/month"
- Data comes from Google Keyword Planner research that Victor prepares manually in admin
- NO marketing jargon: no CPC, no keyword difficulty, no impressions. Just "this many people are looking" and "this many found you"

### Tab 3: Activity (The Trust Builder)

**What it answers:** "What is my marketing guy doing for me?"

This solves half of Victor's payment collection problems. People don't resist paying when they can SEE the work.

- Simple chronological list of what Victor did: "Updated product pages. Launched new ad campaign. Optimized Google listing."
- Victor types a few bullet points in admin -- low effort, high trust impact
- Clients never wonder "what am I paying for?" again
- Keep it simple: date + what was done + maybe a category tag. No project management complexity

### Tab 4: Assets (The Utility Drawer)

**What it answers:** "Where are my logos and photos?"

- Clean grid: "Your logos", "Product photos", "Videos"
- Tap to download. That's it.
- No folder structures, no file management, no upload capabilities
- Also a quiet reminder of all the work Victor has already done -- every time Thomas opens this tab he sees the brand Victor built for him
- Useful for when Thomas needs his logo for a trade show flyer or product photos for a Facebook post

### Tab 5: Automations (The Dark Magic)

**What it answers:** "What's working for me on autopilot?"

This is Victor's BNI differentiator. Not "I do marketing" but "I build automations that work while you sleep."

Three core automations Victor offers (universal across most businesses):

1. **Automated Lead Reply** -- Sends a personalized response to every new enquiry within minutes, written in the business owner's own voice and style (trained on their last 20 emails). The plumber is under a sink, but his leads get a personal reply: "Hey John, thanks for reaching out. I'd love to help with your toilet installation. Could you send me a photo of the bathroom so I can give you a proper estimate? I'll get back to you this evening. Cheers!"

2. **Social Media Auto-Poster** -- Business owner sends a WhatsApp photo of a completed job. Automation posts it to all social media platforms with appropriate captions. The plumber already takes photos to show his wife -- now that same habit becomes marketing.

3. **Trustpilot Review Collector** -- Automatically sends personalized review request emails/SMS to each customer after a job, written in the business owner's voice. Compounds over time: 120 five-star reviews beats every competitor on Google.

**How it shows in the app:**
- Each automation is a simple card with: name, one-sentence description of what it does, an on/off toggle, and a counter ("47 leads auto-replied this month", "14 new reviews collected")
- The counter is KEY -- it shows value without Thomas understanding the technology
- The on/off toggle gives a sense of control without letting them break anything
- NO settings, no configuration, no "customize the message" fields. If they need changes, they call Victor.
- Custom automations Victor builds for specific clients appear here too as additional cards
- On/off toggles update the `is_enabled` flag in Supabase; the automation engine checks this before running

### Tab 6: Execution / Roadmap / Next Steps (The Money Tab)

**What it answers:** "What's the plan, and what's the next step?"

This is where Victor's cash flow problem dies forever. Instead of sending proposals and chasing signatures, the client sees a clear roadmap and pays directly with Stripe.

**One-time items (the build phase):**
- Step-by-step project roadmap: "Build website -- kr 35,000 + moms"
- Each step is a value card (not a boring checklist): what you get, why it matters, clear price
- Pay with Stripe embedded checkout
- Sequential gating: pay for step 1 before step 2 unlocks
- Completed steps show as achievements (green checkmarks, celebration)
- The next unpaid step is prominent with a clear CTA

**Recurring services (the growth phase):**
- Monthly subscriptions paid through Stripe: "Automation maintenance -- kr 2,500/month", "SEO -- kr 5,000/month"
- Binding periods where appropriate (e.g., 3 months for SEO, because it takes time to show results)
- Cancel any time after binding period
- Each service shows a value proposition card: what you get, what's included, expected outcomes

**Naming note:** "Execution" is Victor's internal word. For clients, something like "Plan", "Roadmap", or "Next Steps" feels more natural.

---

## Design Philosophy

### Language Rules
- NO marketing jargon in client views. Ever.
- Everything written as if explaining to someone who "knows 3 buttons"
- Frame spending as investment/progress, not cost
- Frame data as opportunity, not metrics
- Use the client's language, not the agency's language

### Visual Rules
- Client branding everywhere (colors, logo, fonts) -- feels personal, not generic
- Mobile-first -- Thomas checks this on his phone
- ONE primary number per view -- the thing they care about most
- Secondary info is available but not competing for attention
- No complex charts, graphs with axes, or dashboards that look like analytics tools

### Psychology
- Every tab answers ONE simple question
- The app is a **trust machine** -- it keeps clients happy, paying, and referring
- Every tab feeds into the Execution tab: see demand? Buy more marketing. See automations working? Keep paying maintenance. See sales growing? Scale up.
- The app isn't sold separately -- it's the glue that holds the client relationship together
- Low churn because clients can SEE value every time they open it

---

## Business Model

1. **Web development & marketing** -- one-time fees for building websites, setting up ads, creating brands. Paid through the Execution tab.
2. **Automations** -- monthly retainers for maintaining and running automation workflows. Recurring Stripe subscriptions.
3. **SEO & ongoing marketing** -- monthly retainers with binding periods. Recurring Stripe subscriptions.
4. **The app itself** -- not a separate product. It's the retention and payment tool that holds everything together. Clients never question what they're paying for because they can see it all.

**Revenue flow:** Client opens app -> sees value -> follows the roadmap -> pays with Stripe -> Victor delivers -> results show in the dashboard -> client sees more value -> cycle continues.

---

## Technical Notes

- Built with Next.js (App Router), Supabase (database + auth), Stripe (payments)
- White-labeled per client via CSS custom properties (--client-primary, --client-accent, etc.)
- PIN-based authentication (stored in sessionStorage to survive Stripe redirects)
- Admin panel for Victor to manage all clients, set up execution items, subscriptions, content
- i18n support for 7 languages (EN, RO, RU, DA, DE, FR, ES)
- Mobile-first responsive design

### Automation Architecture

n8n is **not used**. Automations are fully custom-built, AI-powered, and live entirely within the main Next.js app on Vercel. No separate service, no second language.

**Single deployment model:**
Everything runs in TypeScript inside the existing Next.js app on Vercel. The WAT philosophy (Workflow + Agent + Tools) is implemented in TypeScript:
- **Workflow** → a `workflow.ts` file containing the system prompt / SOP for Claude
- **Agent** → Claude API (`@anthropic-ai/sdk`) reasons through the steps, uses tool calls
- **Tools** → TypeScript functions that execute deterministically (send email, post to social, update DB)

**How it works:**
1. An external event triggers a webhook to `/api/automations/[key]/trigger` in the Next.js app
2. The route validates the request, checks `is_enabled` in Supabase, reads client config
3. The automation's `run()` function is called — Claude reasons through the workflow, executes tool calls
4. A tool updates the Supabase counter and logs the run to `automation_runs`
5. The counter appears in the client dashboard automatically

**Code structure:**
```
/lib/automations/
  base.ts                    ← AutomationRunner interface all automations implement
  registry.ts                ← { "lead-reply": LeadReply, "social-poster": SocialPoster, ... }

  lead-reply/
    index.ts                 ← orchestrates the run, implements AutomationRunner
    workflow.ts              ← system prompt / SOP for Claude
    tools.ts                 ← sendEmail(), fetchLeadData(), etc.

  social-poster/
    index.ts
    workflow.ts
    tools.ts

  review-collector/
    index.ts
    workflow.ts
    tools.ts

/app/api/automations/[key]/trigger/route.ts   ← receives external webhooks, dispatches
/app/api/cron/route.ts                         ← scheduled automations (Vercel Cron)
```

**Each automation is a standalone unit:**
- Lives in its own folder under `/lib/automations/`
- Implements a shared `AutomationRunner` interface — consistent, predictable
- Client-specific config (voice samples, API tokens, signatures) lives in `automations.config` JSONB in Supabase
- Adding a new automation = new folder + register in `registry.ts` + add DB record. No core system changes.
- Custom per-client automations follow the exact same pattern

**The on/off toggle:**
- `is_enabled` field in Supabase `automations` table
- Toggle in client dashboard updates the DB; the trigger route checks it before running
- No external webhook system — state is entirely in Supabase

**New DB table: `automation_runs`**
- Logs every execution: `id, automation_id, client_id, status, input_summary, output_summary, error, ran_at`
- Powers future "history" views and debugging in admin

**If a long-running automation ever exceeds Vercel's 60s function limit:**
- Add Inngest (lightweight job queue, integrates natively with Next.js) for that specific automation only
- The rest of the system stays unchanged

---

## Open Questions & Future Ideas

_Add new ideas and open questions below as they come up:_

- [ ] GA4 integration for pulling real traffic/conversion data into the Demand tab
- [ ] Best way to handle offline sales input (simple +1 button? form? daily total?)
- [ ] Should the Sales tab pull from Stripe transactions, GA4 e-commerce events, or both?
- [ ] How to represent "where customers come from" simply (Google vs networking vs Instagram)
- [ ] Notification system -- should Thomas get a push notification when a new sale comes in?
- [ ] Referral mechanism -- Thomas shows the app to business friends. Can we make that easy?
- [ ] White-label the whole thing so other agencies could use it? (future product play)

---

*This document is the north star. When in doubt about any design decision, feature priority, or wording choice -- come back here and ask: "Would Thomas understand this in 3 seconds?"*
