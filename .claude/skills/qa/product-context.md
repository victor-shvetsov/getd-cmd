# Product Context — getd-cmd

The north star for every QA decision.

---

## What this product is

A white-labeled client portal for Victor's digital marketing agency in Copenhagen.
Each client gets a personal URL, logs in with a PIN, and sees a branded dashboard
showing their sales, market demand, activity log, assets, automations, and project roadmap.

---

## The two client archetypes

### Thomas (e-commerce — lucaffe.dk)
- Sells espresso machines. Zero online presence.
- "The only thing I know is how to open e-conomics and press my 3 buttons."
- Cares about ONE thing: **"Am I selling enough this month?"**
- Non-technical. Values time above everything.
- Checks the dashboard on his phone every morning.
- Needs: Sales, Demand, Assets, Execution. Does NOT need Automations.

### Casper (service business — plumber)
- Busy, reliable, booked solid.
- Leads go cold because he takes days to reply (under a sink).
- Never posts on social media. Almost no Trustpilot reviews.
- Wants automations but **skeptical about anything sending messages in his name**.
- Needs approval mode on automations — wants to review before sending.
- Needs: Automations, Execution. Does NOT need Sales or Demand.

---

## The Golden Rules

**"Would Thomas understand this in 3 seconds?"**
If not, it doesn't belong in the client view.

**"Would Casper trust this running while he's under a sink?"**
If not, the automation isn't reliable enough to ship.

---

## The 6 tabs — one question each

| Tab | One question it answers |
|-----|------------------------|
| Sales | Am I selling enough this month? |
| Demand | How many people are looking for what I sell? |
| Activity | What is my marketing guy doing for me? |
| Assets | Where are my logos and photos? |
| Automations | What's working for me on autopilot? |
| Execution | What's the plan, and what's the next step? |

---

## Design rules for the client view

- NO marketing jargon. Ever.
- ONE primary number per view — the thing they care about most.
- Mobile-first — Thomas checks this on his phone.
- Frame spending as investment/progress, not cost.
- Frame data as opportunity, not metrics.
- No complex charts with axes or analytics-style dashboards.

---

## What "done" looks like for this product

The product is "done" for a client when:
1. They can log in with a PIN on their phone and see their data immediately
2. The Sales tab shows their real revenue vs their goal
3. Any automations they're paying for run reliably and send correct content
4. The Execution tab shows their roadmap and they can pay directly in the app
5. Victor never needs to chase an invoice from this client again

---

## Tech stack summary

- Next.js App Router, React 19, TypeScript — Vercel
- Supabase (PostgreSQL + storage)
- Stripe (one-time payments + subscriptions, embedded checkout)
- Claude API (`@anthropic-ai/sdk`) for automations — NOT n8n
- Resend for email (automation replies, review requests, notifications)
- Tailwind CSS, Radix UI

---

## What's intentionally NOT done yet

- Social poster: marked "coming soon" — stub exists, real posting not implemented
- Admin JWT: still base64 Bearer token, not a real JWT
- Zod validation on API routes: not added yet
- Tests: none
- GA4 integration: open question
- Approval queue push notifications: not built (email notification is built)
