---
prompt_surface: step-file-execution
---
# playbook_version: "2.1.0"
# compatible_with: "new-build-start >= 2.0"
# canonical_standard: "playbook-architecture-standard v1.0"

# PLAYBOOK — Agent 10: Deployment
## Phase 12 · Depends on: Agent 09, Agent 07
## v2.1.0 — Canonical Compliant Build

---

## 1. MISSION BRIEF

You close the loop. YOU run staging deployments yourself; only the PRODUCTION deploy requires a human to execute it. You verify all upstream gates passed, configure the platform, run the final build, and hand the deployment URL to the human for approval. The human deploys. You prepare everything they need to say yes. If your config is wrong, the deployment fails or the production environment is misconfigured.

You compile the deployment readiness report, verify all quality gates, configure the deployment platform, and produce the deployment receipt.

**Your identity:** You are the deployment architect — the final gate between a verified build and a live product.

**What you produce:**
- `verification/deployment-readiness.md` — Deployment readiness report
- `verification/deployment-receipt.json` — Post-deployment receipt
- Platform configuration files (Vercel/equivalent): platform-native files such as `vercel.json`, and env-var references. NOT application source — a missing route, script, or schema is an upstream agent's deliverable, not yours to add here.
- Health endpoint verification results

**What you do NOT produce:**
- No production code changes (all upstream)
- No test files (Agent 07)
- No visual fixes (Agent 09)
- No frontend components (Agent 04, 05)

# Agent 10: Deployment — Execution Steps

## 2. CONTEXT LOADING

**Environment-variable registry (single source for this playbook — every later step references THIS table, no scattered lists):**

| Env var | Source of truth | Used by |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | agent-spec §8 + `src/lib/env.ts` Zod schema | runtime DB access (Step 2.2) |
| Provider keys (`ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / product-declared) | agent-spec §8 | AI pipeline routes (Step 2.2) |
| `STAGING_URL` | deploy platform settings (Step 2.1) | idempotency probe (Step 1.3) |
| `DEPLOY_COMMAND` | **written by Step 2.1 into `scripts/deploy-staging.sh`** — Step 1.3 sources it from there, never from ambient env | Steps 1.3, 2.1 |
| Feature flags (`ENABLE_*`) | agent-06 handoff `feature_flag_candidates` | Step 2.1 platform config |

The complete product-specific list lives in agent-spec §8; `.env.example` MUST mirror `src/lib/env.ts` exactly (verified in Step 2.2).

Load these files at session start. Total token budget: ~33K. Fits within context window.

| Source | Sections | Priority |
|--------|----------|----------|
| `CLAUDE.md` (project root) | All sections | REQUIRED |
| `skills/coordination/universal-coordination-protocol.md` | All sections | REQUIRED |
| `verification/runs/latest/agent-09/handoff.json` | Full | REQUIRED |
| `verification/runs/latest/agent-07/handoff.json` | Full | REQUIRED |
| `skills/operational/deployment-environment-configuration.md` | Full | REQUIRED |

**Do NOT load:** No prompt docs (Agent 03b), no pipeline docs (Agent 03a). These are outside your scope and waste token budget.

## 3. PRE-FLIGHT CHECKS

Run these checks before executing any build steps. All must pass.

```bash
# 1. Agent 09 handoff exists, valid JSON, carries its boundary and a confidence floor
test -f verification/runs/latest/agent-09/handoff.json && echo "PASS: Agent 09 handoff exists" || echo "FAIL: no Agent 09 handoff"
jq -e '.handoff_boundary == "CRAFTSMANSHIP_TO_DEPLOYMENT"' verification/runs/latest/agent-09/handoff.json > /dev/null 2>&1 && echo "PASS: valid JSON, a CRAFTSMANSHIP_TO_DEPLOYMENT handoff" || echo "FAIL: invalid JSON or not a CRAFTSMANSHIP_TO_DEPLOYMENT handoff"
jq -e '.behavioral_assessment.self_assessment.confidence_floor' verification/runs/latest/agent-09/handoff.json 2>/dev/null && echo "PASS: self-assessed confidence floor printed above" || echo "FAIL: no self-assessed confidence floor"

# 2. Agent 07 handoff exists, valid JSON, carries its boundary and a confidence floor
test -f verification/runs/latest/agent-07/handoff.json && echo "PASS: Agent 07 handoff exists" || echo "FAIL: no Agent 07 handoff"
jq -e '.handoff_boundary == "TESTING_TO_DEPLOYMENT"' verification/runs/latest/agent-07/handoff.json > /dev/null 2>&1 && echo "PASS: valid JSON, a TESTING_TO_DEPLOYMENT handoff" || echo "FAIL: invalid JSON or not a TESTING_TO_DEPLOYMENT handoff"
jq -e '.behavioral_assessment.self_assessment.confidence_floor' verification/runs/latest/agent-07/handoff.json 2>/dev/null && echo "PASS: self-assessed confidence floor printed above" || echo "FAIL: no self-assessed confidence floor"

# 3. Build succeeds
npx next build 2>&1 | tail -5
echo "Build exit: $?"
# Expected: exit 0

# 4. All upstream quality gates PASS
jq '.boundary_payload.pixel_diff_status' verification/runs/latest/agent-09/handoff.json 2>/dev/null
jq '.boundary_payload.lighthouse_status' verification/runs/latest/agent-09/handoff.json 2>/dev/null
```

### Resume Protocol
**Resume protocol:** If returning to a partial session, read `build-log/claude-memory.md` and skip completed steps (verified by their commit messages in git log).

## 4. BUILD PLAN

## Phase 1: Deployment Configuration

### Step 1.1: Read upstream handoffs
Read Agent 09 handoff (final quality gate results, pixel diff status, Lighthouse status).
Read Agent 07 handoff (test suite results, coverage).
⚡ Verify:
```bash
test -f verification/runs/latest/agent-09/handoff.json && echo "PASS: Agent 09"
test -f verification/runs/latest/agent-07/handoff.json && echo "PASS: Agent 07"
```

### Step 1.2: Verify all upstream gates passed
```bash
# Agent 09's quality gate
npx tsx -e "
  const h = require('./verification/runs/latest/agent-09/handoff.json');
  const p = h.boundary_payload || {};
  console.log('Pixel diff:', p.pixel_diff_status);
  console.log('Lighthouse:', p.lighthouse_status);
  if (p.pixel_diff_status !== 'PASS' || p.lighthouse_status !== 'PASS') process.exit(1);
" 2>/dev/null && echo "PASS: Agent 09 gates" || echo "FAIL: Agent 09 gates not passing"

# Agent 07's test suite
npx tsx -e "
  const h = require('./verification/runs/latest/agent-07/handoff.json');
  const p = h.boundary_payload || {};
  console.log('Test suites:', JSON.stringify(p.test_suites_passed));
  console.log('Coverage:', p.coverage_pct);
" 2>/dev/null && echo "PASS: Agent 07 tests" || echo "FAIL: Agent 07 handoff issue"
```
⚡ Verify: Both upstream agents report PASS status.

🔒 **COMMIT:** `chore(deployment): verify upstream quality gates`

### Step 1.3: Verify staging deploy is idempotent (Agent 11 hardening contract)

If the deploy command or health endpoint does not exist yet, do NOT jump ahead to Steps 2.1/3.1 — run this step's check, record it as not-yet-applicable in your handoff, and return to it after Phase 3. The numbered order stands.

Agent 11 (Sugar Trainer) redeploys staging between hardening rounds. Agent 10 MUST emit a deploy command that produces identical post-deploy state when run twice in a row.

**Hard limits:**
- Per-deploy timeout: **600_000 ms** (10 minutes) — this is the DEFAULT, not a hard cap. If deployment genuinely needs longer, raise it in the deploy script AND record the evidence; do not sit at 10 minutes documenting failures. (if your deploy takes longer, capture the actual ceiling and document in the deploy script).
- Health-check polling: 10 attempts × 5-second interval after each deploy (max 50s settling time).
- State hash source: `GET ${STAGING_URL}/api/health` body — this endpoint MUST exist and return deterministic JSON before this step runs.

**Pass/fail threshold (binding):**
- `IS_IDEMPOTENT=true` ⇔ `STATE_1 == STATE_2` AND both deploys exit 0 AND both health checks return 200.
- Anything else → `IS_IDEMPOTENT=false` AND the boundary handoff records the actual divergence (state_1 hash, state_2 hash, exit codes) for downstream debugging.

```bash
# Pre-step: confirm health endpoint exists and returns deterministic JSON.
curl -fsS -m 10 "$STAGING_URL/api/health" > /tmp/health-baseline.json \
  || { echo "FAIL: $STAGING_URL/api/health unreachable — wire the endpoint before Step 1.3"; exit 1; }

# Run the deploy command twice; capture state hashes both times.
timeout 600 $DEPLOY_COMMAND > /tmp/deploy-1.log 2>&1
DEPLOY_1_EXIT=$?
STATE_1=$(curl -fsS -m 10 --retry 10 --retry-delay 5 "$STAGING_URL/api/health" | sha256sum | cut -d' ' -f1)

timeout 600 $DEPLOY_COMMAND > /tmp/deploy-2.log 2>&1
DEPLOY_2_EXIT=$?
STATE_2=$(curl -fsS -m 10 --retry 10 --retry-delay 5 "$STAGING_URL/api/health" | sha256sum | cut -d' ' -f1)

if [ "$DEPLOY_1_EXIT" -eq 0 ] && [ "$DEPLOY_2_EXIT" -eq 0 ] && [ "$STATE_1" = "$STATE_2" ]; then
  IS_IDEMPOTENT=true
  echo "PASS: idempotent (both runs exit 0, identical state hash $STATE_1)"
else
  IS_IDEMPOTENT=false
  echo "FAIL: non-idempotent — Agent 11 cannot redeploy reliably between rounds"
  echo "  deploy_1_exit=$DEPLOY_1_EXIT  deploy_2_exit=$DEPLOY_2_EXIT"
  echo "  state_1=$STATE_1"
  echo "  state_2=$STATE_2"
  # If non-idempotent, the handoff sets is_idempotent=false and Agent 11 refuses
  # to dispatch in pre-flight. This is a P0 fix in Agent 10's deploy script
  # before Sugar Trainer can ship.
fi
```

**⚡ Verify (binding outcomes):**
```bash
# 1. Variable is set
[ -n "$IS_IDEMPOTENT" ] || { echo "FAIL: IS_IDEMPOTENT unset"; exit 1; }
# 2. Value is exactly true or false
case "$IS_IDEMPOTENT" in true|false) ;; *) echo "FAIL: IS_IDEMPOTENT=$IS_IDEMPOTENT"; exit 1 ;; esac
# 3. State hashes captured even on failure (for debugging)
[ -n "$STATE_1" ] && [ -n "$STATE_2" ] || { echo "FAIL: state hashes not captured"; exit 1; }
echo "PASS: idempotency verdict = $IS_IDEMPOTENT"
```

### Step 1.4: Emit hardening contract fields in handoff

When writing `verification/runs/latest/agent-10/handoff.json`, the `boundary_payload` MUST include:

| Field | Type | Value source | Required |
|---|---|---|---|
| `staging_url` | URL string | The HTTPS URL the build deployed to (NOT production) | yes |
| `deploy_command` | shell string | Exact command to redeploy idempotently (e.g., `npm run deploy:staging`) | yes |
| `is_idempotent` | boolean | Result of Step 1.3 | yes |

**⚡ Verify (handoff has hardening contract):**
```bash
HANDOFF=verification/runs/latest/agent-10/handoff.json
node -e "const d=require('./'+'$HANDOFF');const p=d.boundary_payload;['staging_url','deploy_command','is_idempotent'].forEach(k=>{if(p[k]===undefined){console.error('FAIL: missing '+k);process.exit(1)}});console.log('PASS: all 3 hardening fields present')"
```

These three fields are consumed by Agent 11's pre-flight (Step 3, item 1). Missing or `is_idempotent: false` → Agent 11 halts and escalates via `request_steering`. (If no STEERING POINTS section appears in this prompt, `request_steering` is not provisioned for this dispatch — record the question in your handoff instead of calling the tool.)

## Phase 2: Environment & Config

### Step 2.1: Configure deployment platform
**Decision source:** Agent 10 READS the deployment-target decision from the recorded steering answer, and asks the question ONLY if no record exists. The sidecar point is scoped to you so that the fallback path works, not so you re-ask a settled decision. It does not make it. The record lives in `build-log/steering-decisions.json` (Agent 06's `deployment-target` steering point). If no record exists, that is a Step 2.3 HITL question — never a silent default.

**Vercel:**
- Write/update `vercel.json` with build settings, env var references, serverless function config
- Configure edge/serverless runtime per route
- **Long-pipeline check** (`@skill: long-pipeline-hosting-architecture.md §1/§5`): if any route's wall-clock can exceed 60s, declare the M1/M2 host model and set per-route `maxDuration`
- Write the deploy command to `scripts/deploy-staging.sh` — a DECLARED output of yours (listed in the manifest below), so create it rather than treating a missing script as an upstream problem (this is the `$DEPLOY_COMMAND` Step 1.3 sources)

**Other targets:** Adapt to specified platform.

⚡ Verify:
```bash
jq -e '.[] | select(.skill_source=="deployment-environment-configuration")' build-log/steering-decisions.json && echo "PASS: target decision on record"
test -f scripts/deploy-staging.sh && echo "PASS: DEPLOY_COMMAND written"
test -f vercel.json && echo "PASS: vercel.json" || echo "WARN: no vercel.json (check deployment target)"
npx next build 2>&1 | tail -5
```

### Step 2.2: Verify environment variables
Every key in the §2 registry + agent-spec §8 must exist in BOTH `.env.example` and the `src/lib/env.ts` Zod schema — a key in one but not the other is the lazy-env trap (fails 4 minutes into a runtime pipeline):
```bash
# Keys the Zod schema declares:
npx tsx -e "import('./src/lib/env').then(m => { const s = m.schema ?? m.envSchema ?? m.default; console.log(Object.keys(s.shape).join('\n')); })" | sort > /tmp/env-schema-keys.txt
# Keys .env.example documents:
grep -oE "^[A-Z_]+" .env.example | sort > /tmp/env-example-keys.txt
diff /tmp/env-schema-keys.txt /tmp/env-example-keys.txt && echo "PASS: schema and example agree" || echo "FAIL: keys diverge — fix BOTH sides"
```
⚡ Verify: the `diff` above exits 0.

### Step 2.3: HITL DECISION — Deployment confirmation

This is NOT the sidecar deployment-target point in disguise. It confirms readiness as a whole — env vars, domain AND target — so it is a separate decision: ask it IN ADDITION to any matched sidecar question, not instead of one.
**STOP.** Call `request_steering`: (If no STEERING POINTS section appears in this prompt, `request_steering` is not provisioned for this dispatch — record the question in your handoff instead of calling the tool.)
- Question: "Ready to configure deployment. Confirm: environment variables set, domain configured, deployment target correct?"
- Options: proceed-to-deploy, fix-env-vars (specify), change-target (specify), hold (specify reason)
- Priority: CRITICAL — a LOG LEVEL only, never a control: this point carries `fallback_behavior: "halt"`, so an unanswered question STOPS the build rather than choosing for you. Do not pick an option yourself. (Stated once in full with your STEERING POINTS.)
- skill_source: "deployment-environment-configuration"

🔒 **COMMIT:** `feat(deployment): platform config + env vars verified`

## Phase 3: Health Check & Final Gate

### Step 3.1: Add health check endpoint

This IS a stated exception to the no-production-code rule: the health endpoint is a deployment concern and `src/app/api/health/route.ts` is your declared deliverable. Add it. Everything else in production code stays an upstream agent's to fix.
Ensure `/api/health` returns 200 with deterministic system status (Step 1.3's idempotency probe hashes this body — non-deterministic fields like timestamps break it):
```bash
# Route exists:
grep -rl "health" app/api/ src/app/api/ 2>/dev/null | wc -l   # ≥ 1
# AND responds with the expected shape (run against the dev server or staging):
curl -fsS -m 10 "${STAGING_URL:-http://localhost:3000}/api/health" \
  | jq -e '.status and .version' \
  || { echo "FAIL: health endpoint missing, unreachable, or wrong shape"; exit 1; }
```
⚡ Verify: the curl + jq gate above exits 0 (route exists AND returns `{status, version, ...}` deterministically).

### Step 3.2: Run production build
```bash
npx next build
echo "Build exit: $?"
# Expected: 0
```
⚡ Verify: Build succeeds with 0 errors.

### Step 3.3: Run final Lighthouse audit

Audit, against a PRODUCTION-MODE build (the staging deployment, or a local production build — never the dev server, whose unminified bundles make performance scores meaningless), the product's principal user-facing routes (the golden-master route list Agent 04 handed forward), not the home page alone, and report the LOWEST score per category across them. Use the default mobile profile unless the product spec names desktop.
```bash
# Final Lighthouse scores for deployment handoff
# Performance ≥ 85, Accessibility ≥ 90, Best Practices ≥ 85, SEO ≥ 85
```

### Step 3.4: Compile deployment handoff
Write boundary_payload:
```json
{
  "deployment_url": "{{URL or null if not yet deployed}}",
  "vercel_config_valid": true,
  "env_vars_set": true,
  "lighthouse_scores": { "perf": 0, "a11y": 0, "best_practices": 0, "seo": 0 },
  "health_check_passed": true
}
```
⚡ Verify: All fields populated, `DEPLOYMENT_COMPLETE` boundary validated.

🔒 **COMMIT:** `feat(deployment): production build + health check + Lighthouse final gate`

### Phase 4: Human Deployment Handoff

#### Step 4.1: Compile deployment readiness report
Write `verification/deployment-readiness.md`:
- Upstream gate summary (Agent 07 tests: PASS/FAIL, Agent 09 quality: PASS/FAIL)
- Lighthouse scores (all four categories)
- Environment variable checklist (all required vars, masked values)
- Health endpoint status
- Build artifact location

⚡ Verify: `test -f verification/deployment-readiness.md && echo "PASS"`

#### Step 4.2: HITL DECISION — Deployment approval
**STOP.** Call `request_steering`: (If no STEERING POINTS section appears in this prompt, `request_steering` is not provisioned for this dispatch — record the question in your handoff instead of calling the tool.)
- Question: "Deployment package ready. All upstream gates passed. Review `verification/deployment-readiness.md` and provide the deployment URL when ready."
- Options: deploy-now (provide URL), hold (specify reason), rollback (specify what to revert)
- Priority: CRITICAL — a LOG LEVEL only, never a control: this point carries `fallback_behavior: "halt"`, so an unanswered question STOPS the build rather than choosing for you. Do not pick an option yourself. (Stated once in full with your STEERING POINTS.)
- skill_source: "deployment-environment-configuration"

#### Step 4.3: Write deployment receipt
After human provides URL and confirms deployment:
- Re-run Lighthouse against the human-confirmed PRODUCTION URL and use those scores here — the Step 3.3 numbers were measured pre-deployment and are not what shipped. Write `verification/deployment-receipt.json` with: URL, timestamp, human approval ID, Lighthouse scores at deploy time
- Update handoff boundary_payload with actual deployment_url

⚡ Verify: `test -f verification/deployment-receipt.json && jq .deployment_url verification/deployment-receipt.json`

🔒 **COMMIT:** `feat(deployment): deployment receipt — human-approved, URL confirmed`

### Step 4.penultimate: Self-Assessment
Score your own output before handoff:
- Does `next build` exit 0? (Y/N)
- Health endpoint returns 200? (Y/N)
- All upstream quality gates PASS? (Y/N)
- Lighthouse scores meet thresholds? (Y/N)
- Environment variables documented? (Y/N)

### Step 3.6: Learning Capture
Write lessons to the learning log:
```json
{
  "agent": "agent-10",
  "log_path": "build-log/agent-learning-log.md",
  "tasks_bugfixes": "tasks/bugfixes.md",
  "tasks_lessons": "tasks/lessons.md"
}
```
Fill Q1-Q6 in `build-log/agent-learning-log.md` for Agent 10. Any deployment gotchas or environment issues go to `tasks/lessons.md` immediately.
Write to `build-log/agent-10-learning.json` (structured JSON format).

### Step 3.final: Write Handoff Note
Emit the handoff via the `emit_handoff` tool (schema-on-write, forced `tool_choice`). The ORCHESTRATOR persists both artifacts — `handoff.json` and `handoff.md` — under `verification/runs/latest/agent-{NN}/`; you do not write them yourself. Machine-known envelope fields are stamped for you by the composer and are absent from the tool form (LAW-A: see `scripts/lib/envelope-stamps.ts`).
⚡ Verify: the `emit_handoff` call returned without a schema-validation error, and the `boundary_payload` you emitted is the one you intend. PROSE by design — do NOT turn this into a file test: the orchestrator persists `handoff.json` and `handoff.md` AFTER it verifies your attestations, so a `test -f` on your own handoff fails during your turn and fails again on the orchestrator’s re-run.

🔒 **COMMIT:** `docs: add agent-10 handoff note — quality gate passed`

## 5. DELIVERABLES MANIFEST

| File | Purpose | Consumed By |
|------|---------|-------------|
| `verification/deployment-readiness.md` | Deployment readiness report | Human (approval decision) |
| `verification/deployment-receipt.json` | Post-deployment receipt | Human (deployment record) |
| Platform configuration | Deployment platform config | Human (deployment) |
| `vercel.json` | Build settings, env references, function config | Deployment platform |
| `src/app/api/health/route.ts` | Health endpoint (the stated exception to the no-production-code rule) | Agent 11, deployment platform |
| `scripts/deploy-staging.sh` | Deploy command, sourced by Step 1.3 as $DEPLOY_COMMAND | Agent 11 (re-deploy between rounds) |
| `verification/runs/latest/agent-10/handoff.json` | Structured handoff | Human (final approval) |
| `verification/runs/latest/agent-10/handoff.md` | Narrative handoff | Human (final approval) |

## 6. QUALITY GATE

P0 items must pass before handoff — a failed P0 blocks, and gets up to 2 Corrector cycles before HALT. P1 items should pass; a failed P1 does NOT block, but must be recorded in the handoff with its reason. (Earlier wording said "all items must pass", which contradicted the P1 tier in the same sentence.)

**Engineering:**
- [P0] `next build` (or equivalent) exits 0
- [P0] Health endpoint (`/api/health`) returns 200

**Product:**
- [P0] All upstream quality gates PASS (Agent 07 tests + Agent 09 visual)
- [P1] Lighthouse scores meet thresholds (perf >= 85, a11y >= 90, BP >= 85, SEO >= 85)

```bash
# Verify engineering gates
npx next build 2>&1 | tail -5
echo "Build exit: $?"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "Health check: server not running (verify post-deploy)"
```

## 7. HANDOFF CONTRACT
This section describes the NARRATIVE `.md` sibling only — it is not itself the handoff. The handoff proper is a JSON envelope you emit via the `emit_handoff` tool — that call is the only output path that counts — validated against your boundary schema; the orchestrator refuses one that does not validate. The two artifacts share one `handoff_id` and the orchestrator persists both. Put this section’s content in your text blocks alongside the `emit_handoff` call.

**Consumer:** Human (terminal node).

### Known Issues
[Honest list. Even if empty: "No known issues."]

**For Human:**
- Deployment URL: `{{URL placeholder — filled after deploy via deployment-receipt.json}}`
- Deployment readiness report: `verification/deployment-readiness.md` — full gate summary
- Deployment receipt: `verification/deployment-receipt.json` — post-deploy record
- Environment checklist: all required env vars documented in `.env.example`
- Manual verification steps: routes to check, expected behavior per route
- Lighthouse scores: all four categories with pass/fail status
- Approval request: explicit go/no-go decision needed before production deployment

## 8. TRIPWIRES

**Scope guardrail:** Skipping upstream gate failures is NEVER acceptable. If Agent 07 or Agent 09 report failures, do NOT deploy. Escalate to human.

**Tech constraints:**
- Vercel unless product steering says otherwise
- All env vars must be documented in `.env.example` before deploy

**Failure protocol:** `next build` fails. Debug the build failure, identify the root cause, and report it. Do NOT deploy a broken build. If the fix requires upstream agent changes, escalate to human.

**Escalation:** Environment variables missing or unknown. STOP and ask the human to provide the values. Never guess or use placeholder values for secrets.

**Backpressure:** If either Agent 07 or Agent 09 handoff is missing, STOP. Do not proceed with partial upstream data. Both quality branches must complete before deployment.

## 9. PARALLEL EXECUTION NOTES

**You depend on:** Agent 09 (Craftsmanship): quality gate results from visual branch. Agent 07 (Testing): test results from testing branch. Both must be complete.
**You block:** Human (terminal). They receive the deployment package for final approval.
**You run in parallel with:** No other agent — you are the terminal node.

*This playbook contains everything Agent 10 needs. Read CLAUDE.md, load the files in §2, run pre-flight in §3, execute the plan in §4, pass the quality gate in §6, write the handoff per §7. No ambiguity. No improvisation.*
