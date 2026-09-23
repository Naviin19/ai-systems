// Extracted from the grader route: the response contract both paths must satisfy, and the deterministic
// scorer that answers when the model is switched off. No network, no key, no model.
import { z } from 'zod';

const MIN_CHARS = 100;
const MAX_CHARS = 5000;

/** One generated question. The grader may return up to three; the deterministic path returns none. */
const SharpeningQuestionSchema = z.object({
  id: z.string().min(1).max(40),
  q: z.string().min(4).max(500),
  options: z
    .array(z.object({ v: z.string().min(1).max(40), label: z.string().min(1).max(60), hint: z.string().max(120).optional() }))
    .min(2)
    .max(5)
    .nullable(),
  weight: z.number().int().min(1).max(40),
  unlocks: z.string().min(0).max(280),
});

/**
 * The response contract. Every path through the route returns this shape — the model path, the cache, the
 * deterministic fallback, and the fallback taken after a model error. All four are identical by design,
 * which is why the route tags each response with which one produced it.
 *
 * The bounds are deliberately loose. Tight ones were observed silently degrading valid-ish model responses
 * into the fallback; these are guardrails against broken output, not enforcement of what the prompt asked
 * for.
 */
export const PowerEvalSchema = z.object({
  power_score: z.number().min(0).max(100),
  dimensions: z.object({
    specificity: z.number().min(0).max(100),
    account_specificity: z.number().min(0).max(100),
    signal_density: z.number().min(0).max(100),
  }),
  notes: z.string().max(140),
  questions: z.array(SharpeningQuestionSchema).min(0).max(3),
  resolved_target: z
    .object({ name: z.string().min(1).max(80), confidence: z.enum(['high', 'moderate', 'low']), recognized: z.boolean() })
    .nullable(),
});
export type PowerEval = z.infer<typeof PowerEvalSchema>;

/** Which path produced a response. All four payloads are the same shape, so this tag is the only way to tell. */
export type EvalSource = 'llm' | 'cache' | 'fallback' | 'fallback_after_llm_error';

/**
 * The deterministic scorer. It runs when the feature flag is off, and again whenever the model path errors,
 * so the bar still moves and the interface is unchanged. sqrt gives generous early feedback and diminishing
 * returns past the midpoint.
 */
export function fallbackEval(text: string): PowerEval {
  const len = text.length;
  const ratio = Math.min(1, len / MAX_CHARS);
  const power = Math.round(Math.sqrt(ratio) * 100);
  return {
    power_score: power,
    dimensions: { specificity: power, account_specificity: power, signal_density: power },
    notes:
      len < MIN_CHARS
        ? `Add detail: ${MIN_CHARS - len} more characters to launch.`
        : len < 500
          ? 'Decent context. More detail will sharpen the analysis.'
          : 'Strong context.',
    // No model ran, so no contextual questions: the client falls back to the static ladder.
    questions: [],
    // No model ran, so no brand resolution.
    resolved_target: null,
  };
}
