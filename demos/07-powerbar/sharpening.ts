// Extracted from the product's sharpening module: the question ladder, the slot-filled predicates, and the
// lock-on score. Nothing here calls a model. See README.md for what was taken and what was left behind.

export interface SharpeningQuestion {
  id: string;
  weight: number;
  /** True when this question's slot is still EMPTY in the brief, and the brief is long enough to ask. */
  when: (brief: string) => boolean;
  q: string;
  options: Array<{ v: string; label: string }> | null;
  unlocks: string;
}

// A capitalized multi-word phrase is the cheapest proper-noun heuristic (catches "Tata Steel", "SAP Ariba")
// plus all-caps acronyms (IBM).
const TARGET_FILLED_RE = /\b(?:[A-Z][a-z]+\s+[A-Z][a-z]+|[A-Z]{2,})/;
// Trigger requires a trigger-verb to fire (not just "just" / "recently" alone).
const TRIGGER_FILLED_RE =
  /\b(?:hired|merged|acquired|launched|raised|filed|signed|announced|earnings|onboarded|appointed)\b/i;
const BUDGET_FILLED_RE =
  /(?:\$\d|\b\d+\s*[MmKk]\b|\b\d+\s*(?:million|billion)\b|budget|transformation|initiative|funded|fundraise|capex|capital project)/i;
const COMPETITOR_FILLED_RE =
  /\b(?:against|incumbent|currently using|currently uses|already use[sd]?|use[ds]?\s+\w+\s+for|replac\w+|displac\w+|vs\.?|versus)\b/i;
const CONTEXT_FILLED_RE =
  /\b(?:business unit|segment|division|region|geography|expansion|initiative|in\s+the\s+\w+\s+(?:sector|division|region|segment|unit))\b/i;

// The char gates were RAISED after the originals (30/50/70/100/130) were observed firing while the user was
// still on word 4-6, before they had a chance to name the target themselves. The floor of 80 chars (~12-15
// words) gives them room to write a real sentence first.
export const SHARPEN_QUESTIONS: SharpeningQuestion[] = [
  {
    id: 'target-name',
    weight: 25,
    when: (b) => b.length > 80 && !TARGET_FILLED_RE.test(b),
    q: 'Which specific company are you trying to break into?',
    options: null,
    unlocks: 'Anchors the entire dossier on a real account.',
  },
  {
    id: 'trigger-event',
    weight: 22,
    when: (b) => b.length > 110 && !TRIGGER_FILLED_RE.test(b),
    q: 'What recent event at the target makes now the right time?',
    options: [
      { v: 'hire', label: 'New leader / hire' },
      { v: 'merger', label: 'M&A or restructuring' },
      { v: 'funding', label: 'Recent funding / earnings' },
      { v: 'product', label: 'Product launch / pivot' },
      { v: 'none', label: 'No specific trigger' },
    ],
    unlocks: "Builds the 'why now' section of the dossier.",
  },
  {
    id: 'budget-wedge',
    weight: 18,
    when: (b) => b.length > 140 && !BUDGET_FILLED_RE.test(b),
    q: 'Where does the funding for this deal come from?',
    options: null,
    unlocks: 'Sharpens the motion (replacement vs net-new) and the wedge angle.',
  },
  {
    id: 'competitor-incumbent',
    weight: 16,
    when: (b) => b.length > 170 && !COMPETITOR_FILLED_RE.test(b),
    q: "Who's the incumbent vendor at the account today?",
    options: null,
    unlocks: 'Lets the dossier pre-empt the counter-narrative.',
  },
  {
    id: 'context-segment',
    weight: 14,
    when: (b) => b.length > 200 && !CONTEXT_FILLED_RE.test(b),
    q: 'Which part of the target matters most — a business unit, geography, or the whole org?',
    options: null,
    unlocks: 'Narrows persona discovery to the right slice of the org.',
  },
  {
    id: 'warmth',
    weight: 10,
    when: (b) => b.length > 230,
    q: 'Have you talked to anyone at the target before?',
    options: null,
    unlocks: 'Tailors first-touch approach + persona priority order.',
  },
  {
    id: 'timing',
    weight: 8,
    when: (b) => b.length > 270,
    q: 'How urgent is timing on your side?',
    options: null,
    unlocks: 'Sequences which personas to hit first.',
  },
];

export type SharpeningAnswers = Record<string, string>;

/**
 * Lock-on score 0-100, the product's lenient formula:
 *
 *   charLevel     = min(100, floor(briefLength / 4))   // 400 chars -> 100
 *   semanticLevel = llmPower ?? 0                      // 0-100 from the grader route
 *   base          = max(charLevel, semanticLevel)      // strongest signal wins
 *   answerBonus   = sum(answered weights) * 0.6        // bonus, not required
 *   total         = min(100, base + answerBonus)
 *
 * A strong brief alone reaches the bar, by length OR by a high semantic score. Answers accelerate weaker
 * briefs and are never required to launch.
 */
export function computeLockOn(
  brief: string,
  answers: SharpeningAnswers,
  llmPower: number | null = null,
  questionWeightById: Record<string, number> | null = null,
): number {
  const len = brief?.length ?? 0;
  const charLevel = Math.min(100, Math.floor(len / 4));
  const semanticLevel = llmPower ?? 0;
  const base = Math.max(charLevel, semanticLevel);
  const answerBonus = Object.keys(answers).reduce((s, id) => {
    const w = questionWeightById?.[id] ?? SHARPEN_QUESTIONS.find((x) => x.id === id)?.weight ?? 0;
    return s + w * 0.6;
  }, 0);
  return Math.min(100, Math.round(base + answerBonus));
}

/**
 * The single question on screen: the highest-weight question whose slot is still empty and which the brief
 * is long enough to have earned. The ladder is stored weight-descending, so the first match is the heaviest.
 * One card at a time, never a form.
 */
export function nextQuestion(brief: string, answers: SharpeningAnswers): SharpeningQuestion | null {
  return SHARPEN_QUESTIONS.find((q) => !(q.id in answers) && q.when(brief)) ?? null;
}

/** The launch gate. Below this the CTA is disabled. */
export const LOCK_ON_THRESHOLD = 35;
