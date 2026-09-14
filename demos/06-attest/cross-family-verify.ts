// Extracted from the factory repository (skill-ecosystem, private),
// lib/v6-router/cross-family-verify.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - only the verdict types and parseJudgeReply are kept; the request builder and the network call are not

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
