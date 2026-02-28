---
name: focus
description: >
  Start a focused build session on a single project node or sub-node.
  Reads current state deeply, asks only for genuinely missing context, then builds
  autonomously until the node is fully functional. Ends with a clear explanation
  and updates both PROJECT_MAP.md and the visual map data in lib/project-map-data.ts.
  Use when Victor says "let's work on [node]", "focus on [node]", "build [node]", or "today we work on [node]".
argument-hint: "<node-name>  e.g. lead-reply | automations | payments | auth | knowledge | portal | admin"
context: fork
---

# /focus

## Goal

Build a specific node to completion — fully functional, tested, no loose ends.
Don't just scope and wait. Read, understand, build, iterate, ship.

Nothing outside the declared scope gets touched without explicit approval.

## Reference files
- `node-registry.md` — maps argument aliases to node IDs, key files, and sub-node lists
- `PROJECT_MAP.md` — current status, target state, plan, and changelog per node
- `lib/project-map-data.ts` — visual map data (must be kept in sync with PROJECT_MAP.md)

---

## Step 0 — Identify the node

Look up `<node-name>` in `node-registry.md`.

If it maps to a Level 2 sub-node (e.g. `lead-reply`), the scope is that sub-node's folder only.
If it maps to a Level 1 node (e.g. `automations`), the scope is the full node.

If the argument doesn't match anything in the registry, ask:
> "I don't recognise that node name. Did you mean one of these?
> [list from node-registry.md]"

---

## Step 1 — Deep-read the current state

Do ALL of the following in parallel:

1. Read the full `PROJECT_MAP.md` section for this node — status, target state, plan, known issues, changelog
2. **Deep-read every key file** listed for this node — understand what exists, what's incomplete, what's broken
3. Check for any pending DB migrations related to this node
4. Check `lib/types.ts` for relevant interfaces
5. If it's a sub-node, also read the parent node's section in PROJECT_MAP.md

After reading, form a clear picture of:
- What already exists and works
- What is stubbed / partially built
- What is entirely missing
- Any bugs or inconsistencies between the code and the plan

---

## Step 2 — Ask only what's genuinely missing

Before starting, identify any context that **cannot be inferred** from the code or PROJECT_MAP.md.

Only ask for things that would block implementation — for example:
- An external API key or credential not in .env.local
- A product decision with two equally valid options (e.g. "approval before sending, or after?")
- A UX choice that affects the architecture (e.g. "modal or separate page?")

Do NOT ask about things you can figure out from reading the code.
Do NOT ask for permission to start.

If nothing is missing, skip this step entirely and proceed immediately.

---

## Step 3 — Declare scope and start

Print a compact block so Victor can see what's happening, then start building immediately:

```
╔══════════════════════════════════════════════════════╗
║  BUILDING: [node label]                              ║
╠══════════════════════════════════════════════════════╣
║  Status:   [current] → [target]                      ║
║  Goal:     [single sentence — what fully done means] ║
╠══════════════════════════════════════════════════════╣
║  FILES IN SCOPE                                      ║
║  [list every file we will touch, one per line]       ║
╠══════════════════════════════════════════════════════╣
║  BLOCKERS (if any — must resolve before proceeding)  ║
║  [anything Victor must answer before we can start]   ║
╚══════════════════════════════════════════════════════╝
```

If there are blockers Victor must resolve (missing secret, unclear product decision), stop and ask.
Otherwise, start building immediately — do not wait for approval.

---

## Step 4 — Build to completion

### The build loop

Repeat until the node's full target state is met:

1. **Implement** the next item in the plan
2. **Run `pnpm build`** — fix any TypeScript errors before moving on
3. **Self-review** — re-read what was written. Does it match the target state? Any edge cases missed?
4. **Move to the next item**

### Rules during build

- Reference the target state constantly. Every change must move toward it.
- Never use `.catch(() => {})` — silent failures are worse than crashes.
- If a DB migration is needed, write the SQL and show it to Victor before applying.
- If a file outside scope clearly needs a minor change (e.g. adding a type to `lib/types.ts`), do it and mention it — don't ask first.
- If a file outside scope needs a significant change, say so and get approval before touching it.
- Run `pnpm build` after every significant change, not just at the end.
- If stuck on something after 2 attempts, surface the blocker instead of guessing indefinitely.

### What "done" means

A node is done when ALL target state items are met — not when the code compiles.
If a target state item requires a live test (e.g. "email is sent"), describe the exact test Victor should run.

---

## Step 5 — Explain what was built

After completing, give Victor a clear walkthrough:

1. **What was built** — plain English. What can Victor now do that he couldn't before?
2. **How to test it** — exact steps: what to click, what to trigger, what to expect
3. **What to watch for** — edge cases, known limitations, things to verify in production
4. **Anything deferred** — items from the plan that weren't completed this session and why

---

## Step 6 — MANDATORY MAP UPDATE

This step is non-negotiable. Run it at the end of every session, or if Victor says "let's stop".

### 6a — Update `PROJECT_MAP.md`

Find the node's section and:

1. **Add a changelog entry** — specific, one bullet per meaningful change:
   ```
   - [date or description]: [what changed, file names where relevant]
   ```
2. **Update status** if appropriate:
   - `planned` → `in-progress` (started real work)
   - `in-progress` → `done` (ALL target state items met, `pnpm build` clean)
   - Add `broken` if a regression was found
3. **Update the plan** — remove completed items, add any new blockers discovered

### 6b — Update `lib/project-map-data.ts`

Find the node (and sub-node if applicable) in `MAP_NODES` and:

1. Update `status` field to match the new status
2. Prepend a new entry to `level2.changelog` for this session
3. Update `level2.plan` — remove completed items, add new ones
4. If sub-node details changed (target state met, issues resolved), update `data.details` accordingly

### 6c — Run `pnpm build`

Confirm the build is clean before finishing.

### 6d — Print completion block

```
╔══════════════════════════════════════════════════════╗
║  SESSION COMPLETE                                    ║
╠══════════════════════════════════════════════════════╣
║  Node:    [node label]                               ║
║  Status:  [old] → [new]                              ║
╠══════════════════════════════════════════════════════╣
║  BUILT                                               ║
║  [bullet list of what was completed]                 ║
╠══════════════════════════════════════════════════════╣
║  HOW TO TEST                                         ║
║  [exact steps Victor needs to run]                   ║
╠══════════════════════════════════════════════════════╣
║  NEXT SESSION: pick up at                            ║
║  [first item remaining in plan, or "node is done"]   ║
╚══════════════════════════════════════════════════════╝
```

---

## Rules

- Build to completion — don't scope-and-stop. The session ends when the node is done or Victor calls it.
- ONE node per session. If you finish early, ask "Node is done — pick next?" rather than drifting.
- The map update (Step 6) is not optional. Both `PROJECT_MAP.md` and `lib/project-map-data.ts` must be updated.
- Never write vague changelog entries like "various fixes". Be specific — file names, what changed, why.
- If Victor comes back the next day saying "let's continue on X", re-run Step 1 first to reload context.

---

## Self-improvement

- When a new node is added to the project, add it to `node-registry.md`.
- When a node is renamed or restructured, update both `node-registry.md` and `PROJECT_MAP.md`.
- When a recurring blocker pattern is found (e.g. "migration not applied"), add it to Step 1's checklist.
