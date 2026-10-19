// Extracted from the software factory (private),
// scripts/lib/anti-map.ts at 87fae286, on 2026-10-18.
// Changed on extraction: the Store's disk reads and writes, the score-log writer and the prompt-linter hook are
// dropped, so nothing here touches a file; the demo passes the leading-frame factor in. The doc comment's path to a
// private design document is reworded. seedCells, priorFindings, lookupCell, riskOf, findClaims, scoreHandoff and
// logLine are unchanged.

/**
 * anti-map.ts — [U2-2.5] the hallucination-map logger: the Anti-Map Store with its hand-set priors, and the Risk
 * Scorer, which computes and logs and routes nothing (the anti-map design's §5, §6 and §9 Phase 1 "Instrument"; the
 * definitions in contracts/types/governance/anti-map.ts).
 *
 * THE STORE is one AntiMapCell per (region, agent_id, task_type), a beta-binomial posterior (alpha = observed
 * hallucinations + prior, beta = observed clean claims + prior). At update 1.5 it holds exactly the seven prior cells,
 * one per region, keyed agent_id "*" and task_type "*": the day-one priors, weak (alpha + beta =
 * ANTI_MAP_PRIOR_STRENGTH = 10) so they wash out under data — and nothing moves them, and nothing writes an eighth cell.
 *
 * THE RISK SCORER scores a claim that carries a region tag — ClaimGrounding fields on claim.extension{}, on the claim
 * record at CLAIMS_PATH, handoff.epistemic.claims[] — against the cell for its (region, agent, task type), falling back
 * to the agent's wildcard cell and then the region's prior cell, with RISK_MULTIPLIERS_PLACEHOLDER:
 *   risk = posterior_mean × (anchored ? 0.3 : 1) × (1 + sparsity) × (stance_inherited ? 1.6 : 1)
 *        × (a leading frame in the prompt and no gap declared ? 1.4 : 1),
 * computed from the rounded posterior mean that is logged, so the logged factors multiply to the logged risk.
 * It LOGS. It ROUTES NOTHING: no caller reads `risk` to choose a verifier, a gate or a retry. Until the tagger lands,
 * every run logs zero scored claims, and the log says why rather than printing a clean zero. A claim whose grounding
 * the contract refuses is logged as malformed, with the issue, never as "untagged".
 */
import {
  ANTI_MAP_PRIOR_MEANS, ANTI_MAP_PRIOR_STRENGTH, AntiMapCellSchema, AntiMapScoreLogSchema, ClaimGroundingSchema,
  RISK_MULTIPLIERS_PLACEHOLDER,
  type AntiMapCell, type AntiMapScoreLog, type AntiMapScoredClaim, type ClaimGrounding, type GroundingRegion,
} from '../../contracts/types/governance/anti-map';

/** Where a handoff carries its claims: the claim record. */
export const CLAIMS_PATH = 'epistemic.claims';
/** The prior cell's key: before any agent or task type has data of its own, every lookup lands here. */
export const PRIOR_CELL = '*';
export const REGIONS: ReadonlyArray<GroundingRegion> = Object.freeze(Object.keys(ANTI_MAP_PRIOR_MEANS) as GroundingRegion[]);
export const NO_TAGGED_CLAIMS_REASON = 'no claim carries a region tag until the claim tagger (U2-2.13) lands in update 3; zero scored claims, and the scorer routes nothing';

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

/** The seven day-one prior cells: alpha + beta = ANTI_MAP_PRIOR_STRENGTH, keyed to the wildcard agent and task type. */
export function seedCells(now: string): AntiMapCell[] {
  return REGIONS.map((region) => AntiMapCellSchema.parse({
    region, agent_id: PRIOR_CELL, task_type: PRIOR_CELL,
    alpha: round6(ANTI_MAP_PRIOR_MEANS[region] * ANTI_MAP_PRIOR_STRENGTH),
    beta: round6((1 - ANTI_MAP_PRIOR_MEANS[region]) * ANTI_MAP_PRIOR_STRENGTH),
    n_obs: 0, updated_at: now,
  }));
}

export interface AntiMapStore { path: string; cells: AntiMapCell[] }

/**
 * What a store at update 1.5 must be: exactly the seven prior cells, each at the contract's prior, none moved, no
 * other cell — nothing writes a cell before U2-2.17. The findings; empty when it is.
 */
export function priorFindings(cells: ReadonlyArray<AntiMapCell>): string[] {
  const out: string[] = [];
  if (cells.length !== REGIONS.length) out.push(`${cells.length} cell(s); update 1.5 holds exactly the ${REGIONS.length} prior cells, one per region, and nothing writes a cell before U2-2.17`);
  for (const c of cells) {
    if (c.agent_id !== PRIOR_CELL || c.task_type !== PRIOR_CELL) out.push(`(${c.region}, ${c.agent_id}, ${c.task_type}): not a prior cell; nothing writes a cell before U2-2.17`);
    if (c.n_obs !== 0) out.push(`(${c.region}, ${c.agent_id}, ${c.task_type}): n_obs ${c.n_obs}; nothing updates a cell before U2-2.17`);
  }
  for (const region of REGIONS) {
    const cell = cells.find((c) => c.region === region && c.agent_id === PRIOR_CELL && c.task_type === PRIOR_CELL);
    if (!cell) { out.push(`${region}: no prior cell (${PRIOR_CELL}, ${PRIOR_CELL})`); continue; }
    const want = seedCells(cell.updated_at).find((c) => c.region === region)!;
    if (cell.alpha !== want.alpha || cell.beta !== want.beta) out.push(`${region}: alpha/beta ${cell.alpha}/${cell.beta}; the contract's prior is ${want.alpha}/${want.beta} (mean ${ANTI_MAP_PRIOR_MEANS[region]}, strength ${ANTI_MAP_PRIOR_STRENGTH})`);
  }
  return out;
}

export const posteriorMean = (cell: AntiMapCell): number => cell.alpha / (cell.alpha + cell.beta);

/** The cell for a claim: exact (region, agent, task) → (region, agent, *) → the region's prior cell (region, *, *). A (region, *, task) key has no slot. */
export function lookupCell(cells: ReadonlyArray<AntiMapCell>, region: GroundingRegion, agentId: string, taskType: string): AntiMapCell | undefined {
  return cells.find((c) => c.region === region && c.agent_id === agentId && c.task_type === taskType)
    ?? cells.find((c) => c.region === region && c.agent_id === agentId && c.task_type === PRIOR_CELL)
    ?? cells.find((c) => c.region === region && c.agent_id === PRIOR_CELL && c.task_type === PRIOR_CELL);
}

/** §6 with the placeholder multipliers, from the rounded posterior mean that is logged, so the logged factors multiply to the logged risk. */
export function riskOf(cell: AntiMapCell, g: ClaimGrounding, leadingFrameInPrompt: boolean): { posterior_mean: number; multipliers: AntiMapScoredClaim['multipliers']; risk: number } {
  const multipliers = {
    anchored: g.anchored ? RISK_MULTIPLIERS_PLACEHOLDER.anchored : 1,
    sparsity: 1 + g.sparsity,
    stance_inherited: g.stance_inherited ? RISK_MULTIPLIERS_PLACEHOLDER.stance_inherited : 1,
    leading_frame_undeclared: leadingFrameInPrompt && !g.gap_declared ? RISK_MULTIPLIERS_PLACEHOLDER.leading_frame_undeclared : 1,
  };
  const posterior_mean = round6(posteriorMean(cell));
  const risk = round6(posterior_mean * multipliers.anchored * multipliers.sparsity * multipliers.stance_inherited * multipliers.leading_frame_undeclared);
  return { posterior_mean, multipliers, risk };
}

export type FoundClaim =
  | { index: number; kind: 'tagged'; grounding: ClaimGrounding }
  | { index: number; kind: 'untagged'; reason: string }
  | { index: number; kind: 'malformed'; reason: string };

/**
 * The claims a handoff carries at CLAIMS_PATH, each tagged (its extension{} declares a ClaimGrounding), untagged (no
 * grounding fields at all) or malformed (grounding fields the contract refuses, carried with the issue). Null when the
 * handoff carries no epistemic.claims[] array. A top-level claims[] is never read.
 */
export function findClaims(payload: unknown): FoundClaim[] | null {
  const claims = (payload as { epistemic?: { claims?: unknown } | null } | null)?.epistemic?.claims;
  if (!Array.isArray(claims)) return null;
  return claims.map((claim, index): FoundClaim => {
    const ext = (claim as { extension?: unknown } | null)?.extension;
    if (!ext || typeof ext !== 'object') return { index, kind: 'untagged', reason: 'no extension{} on the claim' };
    const e = ext as Record<string, unknown>;
    if (!('region' in e) && !('anchored' in e)) return { index, kind: 'untagged', reason: 'extension{} carries no ClaimGrounding fields' };
    const r = ClaimGroundingSchema.safeParse(ext);
    if (!r.success) return { index, kind: 'malformed', reason: r.error.issues.map((x) => `${x.path.join('.') || 'extension'}: ${x.message}`).join('; ') };
    return { index, kind: 'tagged', grounding: r.data };
  });
}

export interface ScoreArgs { payload: unknown; store: AntiMapStore; agentId: string; taskType: string; leadingFrameInPrompt: boolean | null; frameNote?: string; now: string }

/** One handoff scored: every tagged claim against its cell; the rest counted, with the reason and the per-claim issues. Routes nothing. */
export function scoreHandoff(a: ScoreArgs): AntiMapScoreLog {
  const found = findClaims(a.payload);
  const claims = found ?? [];
  const scored: AntiMapScoredClaim[] = [];
  const details: string[] = [];
  let untagged = 0, malformed = 0, factual = 0, noCell = 0;
  for (const c of claims) {
    if (c.kind === 'untagged') { untagged++; continue; }
    if (c.kind === 'malformed') { malformed++; if (details.length < 50) details.push(`claim ${c.index}: ${c.reason}`); continue; }
    if (c.grounding.region === null) { factual++; continue; } // purely factual: no experiential content to score
    const cell = lookupCell(a.store.cells, c.grounding.region, a.agentId, a.taskType);
    if (!cell) { noCell++; continue; }
    const r = riskOf(cell, c.grounding, a.leadingFrameInPrompt === true);
    scored.push({
      claim_index: c.index, region: c.grounding.region,
      cell: { agent_id: cell.agent_id, task_type: cell.task_type, alpha: cell.alpha, beta: cell.beta, n_obs: cell.n_obs },
      posterior_mean: r.posterior_mean, multipliers: r.multipliers, risk: r.risk, grounding: c.grounding,
    });
  }
  const parts: string[] = [];
  if (found === null) parts.push(`the handoff carries no ${CLAIMS_PATH}[] (the ESTS claim record)`);
  if (untagged) parts.push(`${untagged} claim(s) carry no ClaimGrounding on extension{}`);
  if (malformed) parts.push(`${malformed} claim(s) carry a ClaimGrounding the contract refuses (see details)`);
  if (factual) parts.push(`${factual} claim(s) are purely factual (region null)`);
  if (noCell) parts.push(`${noCell} claim(s) name a region the Store has no cell for`);
  // The standing reason is appended only when no claim declared a region at all: a refused tag is a tag.
  const standing = scored.length === 0 && malformed === 0 ? NO_TAGGED_CLAIMS_REASON : '';
  const reason = [parts.join('; '), standing].filter(Boolean).join(' — ') || 'every claim was scored';
  return AntiMapScoreLogSchema.parse({
    schema_version: '1.0', agent_id: a.agentId, task_type: a.taskType,
    store_path: a.store.path.replace(/\\/g, '/'), cells_in_store: a.store.cells.length,
    leading_frame_in_prompt: a.leadingFrameInPrompt, ...(a.frameNote ? { frame_note: a.frameNote } : {}),
    claims_seen: claims.length, scored,
    unscored: { count: claims.length - scored.length, reason, ...(details.length ? { details } : {}) },
    routes: 'nothing', scored_at: a.now,
  });
}

/** The one line the run prints: what was scored, what was not and why, and that nothing was routed. */
export function logLine(log: AntiMapScoreLog): string {
  const cells = `${log.cells_in_store} cell(s) in ${log.store_path}`;
  const frame = log.frame_note ? `; ${log.frame_note}` : '';
  if (log.scored.length === 0) return `anti-map: 0 scored claim(s) of ${log.claims_seen} seen — ${log.unscored.reason} (${cells}${frame})`;
  const max = Math.max(...log.scored.map((s) => s.risk));
  return `anti-map: ${log.scored.length} scored claim(s) of ${log.claims_seen} seen, highest risk ${max} — logged, routed nowhere (${cells}${log.unscored.count ? `; ${log.unscored.count} unscored: ${log.unscored.reason}` : ''}${frame})`;
}
