# Automation Patterns — getd-cmd

Reference for building automations in this project. Every automation must follow these conventions.

---

## The WAT Structure

Every automation lives in `lib/automations/[key]/` with exactly 3 files:

```
lib/automations/[key]/
├── index.ts     ← class implementing AutomationRunner — orchestrates the run
├── workflow.ts  ← pure function buildSystemPrompt() — SOP for Claude
└── tools.ts     ← deterministic functions — send email, post to social, etc.
```

---

## AutomationRunner Interface (from base.ts)

```typescript
export interface TriggerPayload {
  [key: string]: unknown;
}

export interface ClientConfig {
  client_id: string;
  slug: string;
  config: Record<string, unknown>;  // automation-specific config from DB JSONB
  draftMode?: boolean;              // when true: generate but don't send
}

export interface AutomationResult {
  success: boolean;
  summary: string;          // stored in automation_runs.output_summary
  increment?: number;        // how many units of work (default 1)
  error?: string;
  draftContent?: string;    // set when draftMode=true, omit when draftMode=false
}

export interface AutomationRunner {
  readonly key: string;     // MUST match automation_key in DB exactly
  readonly name: string;
  run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult>;
}
```

---

## index.ts Pattern

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AutomationRunner, AutomationResult, ClientConfig, TriggerPayload } from "../base";
import { buildSystemPrompt } from "./workflow";
import { sendSomething } from "./tools";

// 1. Define payload shape (what the trigger sends)
interface MyPayload {
  required_field: string;
  optional_field?: string;
}

// 2. Define config shape (what Victor sets per client in automations.config)
interface MyConfig {
  from_email: string;       // always required for email automations
  from_name: string;        // display name for sender
  owner_name: string;       // business owner's name
  business_name: string;    // business name for context
  voice_samples: string[];  // if the automation generates text in owner's voice
  // other fields specific to this automation
}

export class MyAutomation implements AutomationRunner {
  readonly key = "my_automation_key";  // snake_case, matches DB
  readonly name = "Human Readable Name";

  async run(payload: TriggerPayload, config: ClientConfig): Promise<AutomationResult> {
    const data = payload as MyPayload;
    const cfg = config.config as Partial<MyConfig>;

    // 3. Validate payload — return early, never throw
    if (!data.required_field) {
      return { success: false, summary: "", error: "Missing required_field in payload" };
    }

    // 4. Validate config — return early with clear message
    if (!cfg.from_email || !cfg.voice_samples?.length) {
      return {
        success: false,
        summary: "",
        error: "Automation not configured: missing from_email or voice_samples",
      };
    }

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt({
      ownerName: cfg.owner_name ?? "the owner",
      businessName: cfg.business_name ?? "the business",
      voiceSamples: cfg.voice_samples,
    });

    // 6. Call Claude
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,       // adjust per output type: 512 for emails, 256 for captions
      system: systemPrompt,
      messages: [{ role: "user", content: `...input context...` }],
    });

    const generatedText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // 7. ALWAYS implement draft mode check before sending
    if (config.draftMode) {
      return {
        success: true,
        summary: `Draft created for ...`,
        draftContent: generatedText,
        increment: 0,          // 0 because nothing was actually sent
      };
    }

    // 8. Execute the tool (send/post/etc)
    const result = await sendSomething({
      to: data.required_field,
      body: generatedText,
      fromEmail: cfg.from_email,
      fromName: cfg.from_name ?? cfg.owner_name ?? "Victor",
    });

    if (!result.success) {
      return { success: false, summary: "", error: `Send failed: ${result.error}` };
    }

    // 9. Return success with summary
    return {
      success: true,
      summary: `Sent to ${data.required_field}`,
      increment: 1,
    };
  }
}
```

---

## workflow.ts Pattern

```typescript
/**
 * [Automation Name] — System Prompt / SOP
 *
 * This is the workflow Claude follows when triggered.
 * Treat this file as the SOP: clear, step-by-step instructions.
 */

export function buildSystemPrompt(config: {
  ownerName: string;
  businessName: string;
  voiceSamples: string[];
  // other config needed for the prompt
}): string {
  const samples = config.voiceSamples
    .map((s, i) => `Example ${i + 1}:\n${s}`)
    .join("\n\n");

  return `You are writing on behalf of ${config.businessName}, as ${config.ownerName}.

## Voice samples (match this style exactly):
${samples}

## Your task:
[Clear, specific instruction for what to generate]

## Rules:
1. Write in first person as ${config.ownerName}
2. Match the tone, formality, and sentence length of the voice samples
3. Keep it short — [specific length constraint]
4. [Specific constraint 1]
5. [Specific constraint 2]

## What NOT to do:
- Do not use formal/stiff language if samples are casual
- Do not make up specific details you don't know
- Do not exceed [length limit]`;
}
```

---

## tools.ts Pattern

```typescript
import { Resend } from "resend";

export interface SendParams {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send [description of what this does].
 * Requires [ENV_VAR] env var.
 * [Domain/API requirements if any]
 */
export async function sendSomething(params: SendParams): Promise<SendResult> {
  // Always check for API key first — return error, never throw
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not set" };
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: `${params.fromName} <${params.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.id };
}
```

---

## Registry Pattern

```typescript
// In lib/automations/registry.ts:
import { MyAutomation } from "./my-automation";

const automations: AutomationRunner[] = [
  new LeadReplyAutomation(),
  new SocialPosterAutomation(),
  new ReviewCollectorAutomation(),
  new MyAutomation(),  // ← add here
];
```

---

## Config Field Conventions

All automations share these config field names when applicable:

| Field | Type | Purpose |
|-------|------|---------|
| `from_email` | string | Verified Resend sender address |
| `from_name` | string | Display name for sender |
| `owner_name` | string | Business owner's name (used in prompts) |
| `business_name` | string | Business name (used in prompts) |
| `voice_samples` | string[] | Examples of how the owner writes |
| `signature` | string | Email sign-off |
| `notify_email` | string | Where to notify when a draft needs approval |
| `review_link` | string | Trustpilot/Google review URL |

---

## Draft Mode: How It Works End-to-End

1. Automation's `config.draftMode = true` (set by trigger route when `require_approval = true`)
2. Automation generates content, checks `if (config.draftMode)`, returns `draftContent` without sending
3. Trigger route detects `draftContent`, inserts into `automation_runs` with `status = 'pending_approval'`
4. Trigger route sends notification email to `config.notify_email` if set
5. Client sees draft in Automations tab draft queue (AutomationsTab polls /api/automations/drafts every 15s)
6. Client approves → PATCH /api/automations/drafts/[runId] with `{ action: "approve" }`
7. Approve route loads automation config, calls the tool function directly to send
8. Status updated to `'approved'`, counter incremented

---

## DB Status Values

`automation_runs.status` can be:
- `pending` — run queued but not started
- `running` — currently executing
- `success` — completed successfully, content sent
- `error` — failed (check `error` column)
- `pending_approval` — draft stored, waiting for client review
- `approved` — client approved, content sent
- `discarded` — client discarded the draft

---

## Error Handling Rules

1. Never use try/catch inside the `run()` method — let the trigger route catch and log
2. Validate early, return `{ success: false, error: "..." }` for expected failures
3. Check API key existence at the top of every tool function
4. Never use `.catch(() => {})` — silent failures are worse than crashes
5. The error message goes into `automation_runs.error` — make it human-readable
