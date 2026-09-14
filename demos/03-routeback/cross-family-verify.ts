// Extracted from the factory repository (skill-ecosystem, private),
// lib/v6-router/cross-family-verify.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - kept: DEFAULT_JUDGE_MODEL, the judge limits, the verdict and request types, the system prompt, parseJudgeReply and buildJudgeRequestBody
//   - removed: resolveKey (reads an API key) and verifyHandoffCrossFamily (the network call); run.ts reads each recorded reply the way that function does

/**
 * Default judge — google/gemini-3.1-pro-preview.
 *
 * Live-verified against the OpenRouter catalog 2026-08-03: 1,048,576 ctx,
 * $2.00/$12.00 per Mtok, supports seed + response_format + reasoning. Chosen
 * over the codex-class options (openai/gpt-5.3-codex, $1.75/$14, 400K ctx)
 * because this surface is JUDGMENT OVER AN EMITTED ARTIFACT, not agentic
 * coding: one stateless call, no tool loop, no file editing, and 3 of the 4
 * dispatch_invoke_pv agents (03a collection, 03b analysis, research-synthesizer)
 * emit analysis payloads whose defects are unsupported claims and vacuous
 * fields, not compile errors. Agentic-coding specialization would be a premium
 * paid for capabilities this call never exercises. The 1M context matters more:
 * handoffs are large and truncating one hides the defect you are hunting.
 *
 * Code-heavy surfaces (agent-05 frontend-intelligence, future product agents)
 * can override per-agent via CROSS_FAMILY_JUDGE_MODEL or AgentConfig.judgeModel
 * — a codex-class judge is the natural override there, but adopt it on a
 * measured catch-rate, not on intuition (scripts/calibration/measure-judge-catch-rate.ts).
 */
export const DEFAULT_JUDGE_MODEL = "google/gemini-3.1-pro-preview";

/**
 * Judge output cap. A verdict is a word plus one sentence, so 400 "looks"
 * generous — and it silently broke 17 of 24 samples in the first catch-rate
 * eval (2026-08-03): frontier judges are REASONING-tier, their thinking tokens
 * are drawn from this same budget, and the visible JSON got truncated
 * mid-key ('{\n  "ver'), which fail-open scored as ERROR. Reasoning-tier
 * calls need >= 4000 here. Do not lower this to "save cost" — output is billed
 * on tokens actually produced, and a truncated verdict costs a wasted call.
 */
const JUDGE_MAX_TOKENS = Number.parseInt(process.env.CROSS_FAMILY_JUDGE_MAX_TOKENS ?? "4000", 10);

/** Handoffs can be large; cap what we ship to keep judge cost bounded. */
const MAX_HANDOFF_CHARS = 60_000;
const MAX_CONTEXT_CHARS = 12_000;

/** Wall-clock ceiling. The judge sits on the hot path; it does not get to hang. */
const JUDGE_TIMEOUT_MS = Number.parseInt(process.env.CROSS_FAMILY_JUDGE_TIMEOUT_MS ?? "90000", 10);

export type CrossFamilyVerdictKind = "ACCEPT" | "REJECT" | "ERROR";

export interface CrossFamilyVerdict {
  verdict: CrossFamilyVerdictKind;
  /** The decisive defect when REJECT; the judge's note otherwise. Empty on ERROR. */
  defect: string;
  /** Judge-declared severity when REJECT. Absent otherwise. */
  severity?: "minor" | "major" | "critical";
  judge_model: string;
  /** Present on ERROR — why the judge could not be consulted. */
  error?: string;
  walltime_ms: number;
  input_tokens: number;
  output_tokens: number;
}

export interface CrossFamilyVerifyRequest {
  agent_id: string;
  /** The agent's outbound boundary literal — tells the judge what shape was owed. */
  boundary: string;
  /** Task context the judge needs to see (spec excerpt, upstream summary). */
  task_context: string;
  /** The emitted handoff, serialized. The artifact under judgment. */
  handoff_json: string;
  /** Override the default judge (per-agent routing). */
  judge_model?: string;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected for tests; defaults to env/.env.local resolution. */
  apiKey?: string;
}

const JUDGE_SYSTEM = [
  "You are an independent cross-family verifier in a multi-agent build pipeline.",
  "A Claude agent produced the HANDOFF below. You are a DIFFERENT model family on purpose:",
  "your job is to catch defects a Claude verifier would share the blind spot for.",
  "",
  "You are NOT rewriting the work. You return a verdict on it.",
  "",
  "REJECT only for defects that would damage a downstream consumer:",
  "  - claims or numbers the handoff's own evidence does not support (fabrication)",
  "  - a required field that is missing, empty, or filled with a placeholder",
  "  - a payload that is schema-shaped but semantically vacuous (says nothing usable)",
  "  - internal self-contradiction, or contradiction of a stated constraint",
  "  - a declared decision with no rationale, or a rationale that does not follow",
  "",
  "Do NOT reject for: style, verbosity, formatting, ordering, missing polish,",
  "or work that is correct but less thorough than you would have been.",
  "When genuinely uncertain, ACCEPT — a false rejection costs a full agent re-run.",
  "",
  'Reply with ONLY a JSON object: {"verdict":"ACCEPT"|"REJECT","defect":"<one sentence>","severity":"minor"|"major"|"critical"}',
  'For ACCEPT, "defect" may be an empty string and "severity" may be omitted.',
].join("\n");

/**
 * Parse the judge's reply. Tolerant of prose-wrapped JSON and of a bare
 * ACCEPT/REJECT first word, because reasoning-tier models sometimes prepend a
 * sentence despite response_format. Returns null when nothing parseable is
 * found — the caller maps that to ERROR (fail-open), never to REJECT.
 */
export function parseJudgeReply(text: string): { verdict: "ACCEPT" | "REJECT"; defect: string; severity?: "minor" | "major" | "critical" } | null {
  if (!text || !text.trim()) return null;

  // Preferred path: a JSON object somewhere in the reply.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const raw = String(parsed.verdict ?? "").trim().toUpperCase();
      if (raw === "ACCEPT" || raw === "REJECT") {
        const sev = String(parsed.severity ?? "").trim().toLowerCase();
        return {
          verdict: raw,
          defect: typeof parsed.defect === "string" ? parsed.defect : "",
          ...(sev === "minor" || sev === "major" || sev === "critical" ? { severity: sev } : {}),
        };
      }
    } catch {
      /* fall through to the bare-word path */
    }
  }

  // Fallback: a bare leading verdict word.
  const bare = text.trim().match(/^\W*(ACCEPT|REJECT)\b[:\s-]*([\s\S]*)$/i);
  if (bare) {
    return {
      verdict: bare[1].toUpperCase() as "ACCEPT" | "REJECT",
      defect: (bare[2] ?? "").trim().slice(0, 400),
    };
  }
  return null;
}

/**
 * The exact body the judge receives. Exported ([AIS3-3]) so a calibration can
 * hash the request each sample would send, and replay a recorded reply only
 * while that request is unchanged.
 */
export function buildJudgeRequestBody(req: CrossFamilyVerifyRequest): {
  model: string;
  max_tokens: number;
  temperature: number;
  seed: number;
  response_format: { type: "json_object" };
  messages: Array<{ role: "system" | "user"; content: string }>;
} {
  const userContent = [
    `AGENT: ${req.agent_id}`,
    `DECLARED OUTBOUND BOUNDARY: ${req.boundary}`,
    "",
    "TASK CONTEXT:",
    req.task_context.slice(0, MAX_CONTEXT_CHARS),
    "",
    "HANDOFF UNDER JUDGMENT:",
    req.handoff_json.slice(0, MAX_HANDOFF_CHARS),
    "",
    "Verdict:",
  ].join("\n");
  return {
    model: req.judge_model ?? process.env.CROSS_FAMILY_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL,
    max_tokens: JUDGE_MAX_TOKENS,
    temperature: 0,
    seed: 7, // determinism where the provider honors it (catalog-verified support)
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: userContent },
    ],
  };
}
