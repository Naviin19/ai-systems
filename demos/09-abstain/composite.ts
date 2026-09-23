// Extracted from the product's scoring layer: the signal contract, the weights, and the composite. The
// whole point is one line — which signals are allowed into the mean.
import { z } from 'zod';

export const SIGNAL_TYPES = [
  'vocabulary_instability',
  'formal_vocabulary',
  'difficulty_lag',
  'serp_churn',
  'cross_platform_lead',
  'cohort_fixed_trend',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

/**
 * One signal's verdict. `score = null` means the signal ABSTAINED — it had no data to score on. An
 * abstention is honest output, never a zero, and the schema says so by making null a legal value.
 */
export const SignalResultSchema = z.object({
  signal_type: z.enum(SIGNAL_TYPES),
  score: z.number().min(0).max(100).nullable(),
  fired: z.boolean(),
  abstained: z.boolean(),
  abstain_reason: z.string().nullable(),
  evidence: z.record(z.string(), z.unknown()),
});
export type SignalResult = z.infer<typeof SignalResultSchema>;

/** Thesis-derived weights. They sum to 1 when every signal reports. */
export const WEIGHTS: Record<SignalType, number> = {
  vocabulary_instability: 0.15,
  formal_vocabulary: 0.15,
  difficulty_lag: 0.3, // the load-bearing quantitative signature
  serp_churn: 0.15,
  cross_platform_lead: 0.1,
  cohort_fixed_trend: 0.15,
};

export const THRESHOLD_OPENING = 60;
export const THRESHOLD_CLOSING = 30;

/**
 * The difficulty metric this product leans on is a vendor's model of competition, not a measurement of the
 * market. Rather than bury that, the sentence is declared once and carried verbatim into every verdict,
 * evidence record, payload, email and footer.
 */
export const VENDOR_PROXY_CAVEAT =
  'the difficulty metric is a vendor proxy — signal 3 measures the vendor’s model of competition, not the market itself';

/**
 * Weighted mean over NON-ABSTAINING signals, weights renormalised over only those that reported. The
 * breakdown always lists all six, with null in the abstained slots, so a reader can see what was not
 * measured rather than inferring it from a low number.
 */
export function compositeScore(signals: SignalResult[]): { composite: number; breakdown: Record<string, number | null> } {
  const live = signals.filter((s) => !s.abstained && s.score !== null);
  const totalW = live.reduce((a, s) => a + WEIGHTS[s.signal_type], 0);
  const composite =
    totalW === 0 ? 0 : Math.round(live.reduce((a, s) => a + (s.score as number) * WEIGHTS[s.signal_type], 0) / totalW);
  const breakdown: Record<string, number | null> = {};
  for (const s of signals) breakdown[s.signal_type] = s.abstained ? null : s.score;
  return { composite, breakdown };
}

/**
 * The counterfactual, for this demo only. It is what the composite becomes if an abstention is folded in
 * as a zero — the ordinary way to handle a missing number, and the thing the line above exists to refuse.
 */
export function compositeIfAbstentionWereZero(signals: SignalResult[]): number {
  const totalW = signals.reduce((a, s) => a + WEIGHTS[s.signal_type], 0);
  return Math.round(signals.reduce((a, s) => a + (s.score ?? 0) * WEIGHTS[s.signal_type], 0) / totalW);
}

export type WindowStatus = 'open' | 'emerging' | 'narrowing' | 'closed';

/** Reduced to the part this demo is about: where the composite lands against the two thresholds. */
export function classify(composite: number): WindowStatus {
  if (composite >= THRESHOLD_OPENING) return 'open';
  if (composite >= THRESHOLD_CLOSING) return 'narrowing';
  return 'closed';
}
