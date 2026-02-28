# Client Archetypes

Reference for `/setup-client`. Each archetype defines which tabs are enabled,
which automations are pre-seeded, and what config fields matter most.

---

## Archetype A: Thomas (E-commerce)

**Prototype:** Thomas from lucaffe.dk — sells espresso machines online.
**What he needs:** Sales visibility + market demand + brand assets + project roadmap.
**What he doesn't need:** Automations (not set up for inbound leads via email).

### Tabs

| tab_key | is_visible | sort_order | Notes |
|---------|-----------|------------|-------|
| `sales` | true | 0 | Core tab — monthly revenue vs goal |
| `demand` | true | 1 | Google Keyword Planner data |
| `activity` | true | 2 | Work log |
| `assets` | true | 3 | Brand kit, photos, videos |
| `automations` | false | 4 | Hidden — not needed |
| `execution` | true | 5 | Roadmap + payment items |

### Default Sales tab data

```json
{
  "revenue_goal": 0,
  "currency": "DKK",
  "product_categories": []
}
```
Victor fills in the real revenue goal after the first call.

### Automations
None pre-seeded for Thomas archetype.

### Setup notes
- Always ask for the client's Shopify/WooCommerce domain — goes in the Knowledge Bank
- Revenue goal is critical for the Sales tab to make sense — get it on the first call
- Language is usually `da` for Danish e-commerce clients

---

## Archetype B: Casper (Service Business + Automations)

**Prototype:** Casper the plumber — BNI member, books through inbound email leads.
**What he needs:** Automations that run while he's under a sink + execution roadmap.
**What he doesn't need:** Sales funnel tracking, keyword research, asset library.

### Tabs

| tab_key | is_visible | sort_order | Notes |
|---------|-----------|------------|-------|
| `sales` | false | 0 | Hidden — no e-commerce |
| `demand` | false | 1 | Hidden — no PPC/SEO campaigns |
| `activity` | false | 2 | Hidden — too much noise |
| `assets` | false | 3 | Hidden — no brand kit work |
| `automations` | true | 4 | Core tab |
| `execution` | true | 5 | Roadmap + subscriptions |

### Automations pre-seeded

Three automations inserted as `is_enabled = false`. Client enables after reviewing drafts.

#### 1. Lead Reply (`lead-reply`)

```json
{
  "from_email": "",
  "from_name": "",
  "owner_name": "",
  "business_name": "",
  "voice_samples": [],
  "signature": "",
  "require_approval": true,
  "notify_email": "",
  "draft_mode": true
}
```

**Key:** `require_approval: true` and `draft_mode: true` are the defaults for new Casper clients.
He needs to trust the system before letting it send automatically.
Victor fills in `voice_samples` from the Knowledge Bank after onboarding.

#### 2. Social Poster (`social-poster`)

```json
{
  "from_email": "",
  "owner_name": "",
  "business_name": "",
  "voice_samples": [],
  "facebook_page_id": "",
  "facebook_access_token": "",
  "require_approval": true,
  "notify_email": "",
  "draft_mode": true
}
```

**Note:** Facebook credentials must be added after the automation is created.
Walk Casper through the Facebook Page token flow in a separate session.

#### 3. Review Collector (`review-collector`)

```json
{
  "from_email": "",
  "from_name": "",
  "owner_name": "",
  "business_name": "",
  "review_url": "",
  "require_approval": false,
  "notify_email": "",
  "draft_mode": false
}
```

**Note:** Review requests are safe to send automatically from day 1 — they're not "in Casper's voice",
just a polite post-job email. So `require_approval: false` and `draft_mode: false` are defaults here.

### Setup notes
- `notify_email` is the most important config field — Casper needs to know when drafts arrive
- Collect 3-5 voice samples from Casper's actual emails during onboarding
- The "Approval mode" toggle in the Automations tab controls `require_approval` per automation
- Language is usually `da`

---

## Archetype C: Full-Service Marketing Client

**Prototype:** A mid-size Danish business that hired Victor for full marketing strategy.
**What they need:** Everything — all 6 tabs visible.

### Tabs

All 6 tabs visible, sorted 0–5.

| tab_key | is_visible |
|---------|-----------|
| `sales` | true |
| `demand` | true |
| `activity` | true |
| `assets` | true |
| `automations` | true |
| `execution` | true |

### Automations
None pre-seeded — Victor adds them manually as strategy develops.

### Setup notes
- Revenue goal and currency are critical for Sales tab
- Knowledge Bank should be filled before the first client meeting with the dashboard
- Language varies — ask the client

---

## Archetype Reference Table

| Archetype | Visible tabs | Automations seeded | Typical language |
|-----------|-------------|-------------------|-----------------|
| `thomas` | sales, demand, activity, assets, execution | None | da |
| `casper` | automations, execution | lead-reply, social-poster, review-collector | da |
| `full` | All 6 | None | varies |

---

## Adding a new archetype
1. Define the tab visibility table above
2. Define automations to seed (or "None")
3. Add to the reference table at the bottom
4. Update `SKILL.md` Step 0 option list
