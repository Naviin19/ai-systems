// Extracted from the software factory (private),
// scripts/lib/trace-physics.ts at 87fae286, on 2026-10-18.
// Changed on extraction: resolveRunId and loadRunTrace, the only functions that read disk, are dropped, and the
// LedgerEvent type is declared here instead of imported from the receipt module. traceScore, scoreAgentTrace and
// scoreRun are unchanged.

/**
 * trace-physics.ts — [SLP-C1] the trace scorer (07-slp-state-legible-prompts.md §7.2, D7).
 *
 * Reads only what the run ledger records and turns it into jerk, compression, schema friction, energy
 * and meta per agent dispatch, and their totals per run. The core (scoreAgentTrace, scoreRun) is pure:
 * it takes parsed events and sizes, never a path. loadRunTrace() is the one function here that reads
 * disk, and it is what the CLI, the orchestrator (SLP-C5) and the self-test all go through, so the
 * self-test measures the scorer the orchestrator calls and not a copy of it.
 *
 * Two rules hold everywhere below, and the self-test refuses if either breaks:
 *   - a value the ledger does not record is null, with its reason in nulls[]; it never becomes a 0
 *     inside a sum or a score (compression null means score null, which is every mock run);
 *   - the input score sits BESIDE the score and never inside it.
 * The score is the operator's uncalibrated sketch (ruling R-C1) and ranks; nothing blocks on it.
 */
import { dispatchTopology } from './dispatch-topology';
import {
  TRACE_PHYSICS_CALIBRATION,
  type TracePhysicsAgent,
  type TracePhysicsRun,
} from '../../contracts/types/measurement/trace-physics';

/** One line of a run's events.jsonl, as scripts/lib/receipt.ts declares it. */
export interface LedgerEvent {
  ts: string; run_id: string; agent_id: string | null;
  event_type: string; payload: Record<string, unknown>;
}

type Null = { field: string; reason: string };

/** The operator's weights (ruling R-C1). Exported so the red leg (SLP-C1r) can see what it plants against. */
export const WEIGHTS = { compression: 0.4, jerk: 0.4, schema_friction: 0.2 } as const;

/** score = 0.4·compression + 0.4/(jerk+1) + 0.2/(schema_friction+1); null whenever compression is null. */
export function traceScore(compression: number | null, jerk: number, schemaFriction: number): number | null {
  if (compression === null) return null;
  return WEIGHTS.compression * compression + WEIGHTS.jerk / (jerk + 1) + WEIGHTS.schema_friction / (schemaFriction + 1);
}

/** The run directory an agent writes into, from its config id: the orchestrator's agentNumberFromConfigId. */
export function agentDirName(agentId: string): string {
  const numbered = agentId.match(/agent-(\d+[a-z]?)/);
  if (numbered) return `agent-${numbered[1]}`;
  const descriptive = agentId.match(/agent-([a-z][a-z0-9-]*)$/);
  return `agent-${descriptive ? descriptive[1] : ''}`;
}

export interface InputState { score: number | null; source: string | null }

export interface AgentTraceInput {
  runId: string;
  agentId: string;
  /** Every event of the run; scoreAgentTrace keeps this agent's own. */
  events: LedgerEvent[];
  /** Characters in the agent's accepted handoff.json, or null when it wrote none. */
  handoffChars: number | null;
  inputState: InputState | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function scoreAgentTrace(input: AgentTraceInput): TracePhysicsAgent {
  const nulls: Null[] = [];
  const mine = input.events.filter((e) => e.agent_id === input.agentId);
  const of = (type: string) => mine.filter((e) => e.event_type === type);
  const p = (e: LedgerEvent) => (e.payload ?? {}) as Record<string, unknown>;

  // ---- jerk
  const routeBacks = of('ROUTE_BACK');
  const route_back_retries = routeBacks.filter((e) => p(e).action === 'retry').length;
  const oscillations = routeBacks.filter((e) => p(e).reason === 'oscillation').length;
  const attest = of('ATTESTATION_VERIFIED');
  let corrector_cycles_beyond_first: number | null = null;
  if (attest.length === 0) nulls.push({ field: 'jerk.corrector_cycles_beyond_first', reason: 'no ATTESTATION_VERIFIED event (a mock run, or ATTESTATION_VERIFY_MODE=OFF)' });
  else corrector_cycles_beyond_first = attest.reduce((n, e) => n + Math.max((num(p(e).cycle) ?? 1) - 1, 0) + (p(e).cycle_limit_exceeded === true ? 1 : 0), 0);
  const judge_reruns = of('PV_DISPATCH_COMPLETE').filter((e) => p(e).re_ran === true).length;
  const gate_rejections = of('GATE_REJECTED').length;
  const restarts = Math.max(of('AGENT_START').length - 1, 0);
  const budget_hits = of('LOAD_BUDGET_REACHED').length + of('READ_BUDGET_REACHED').length;
  const seen = new Map<string, number>();
  for (const e of of('SKILL_LOADED')) { const k = `skill|${String(p(e).file)}|${String(p(e).section ?? '')}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  for (const e of of('SOURCE_READ')) { const k = `source|${String(p(e).file)}|${String(p(e).part ?? '')}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  const repeated_identical_loads = [...seen.values()].reduce((n, c) => n + Math.max(c - 1, 0), 0);
  const mcp = of('MCP_TOOL_CALL');
  let repeated_identical_tool_calls: number | null = 0;
  if (mcp.length && mcp.some((e) => typeof p(e).input_sha256_16 !== 'string')) {
    repeated_identical_tool_calls = null;
    nulls.push({ field: 'jerk.repeated_identical_tool_calls', reason: 'MCP_TOOL_CALL carries no input_sha256_16, so identical calls cannot be told apart (SLP-C5b adds it)' });
  } else if (mcp.length) {
    const calls = new Map<string, number>();
    for (const e of mcp) { const k = `${String(p(e).tool)}|${String(p(e).input_sha256_16)}`; calls.set(k, (calls.get(k) ?? 0) + 1); }
    repeated_identical_tool_calls = [...calls.values()].reduce((n, c) => n + Math.max(c - 1, 0), 0);
  }
  const jerk = route_back_retries + oscillations + (corrector_cycles_beyond_first ?? 0) + judge_reruns + gate_rejections
    + restarts + budget_hits + repeated_identical_loads + (repeated_identical_tool_calls ?? 0);

  // ---- compression
  const accepted_handoff_tokens_est = input.handoffChars === null ? null : Math.ceil(input.handoffChars / 4);
  if (accepted_handoff_tokens_est === null) nulls.push({ field: 'compression.accepted_handoff_tokens_est', reason: 'no handoff.json in the agent directory' });
  const complete = of('AGENT_COMPLETE');
  const last = complete[complete.length - 1];
  const tu = (last as unknown as { token_usage?: Record<string, unknown> | null } | undefined)?.token_usage ?? null;
  let tokens_split: TracePhysicsAgent['compression']['tokens_split'] = null;
  let tokens_total: number | null = null;
  if (!last) nulls.push({ field: 'compression.tokens_total', reason: 'no AGENT_COMPLETE event' });
  else if (!tu) nulls.push({ field: 'compression.tokens_total', reason: 'AGENT_COMPLETE.token_usage is null (a mock run)' });
  else {
    tokens_split = { input: num(tu.input) ?? 0, output: num(tu.output) ?? 0, cache_read: num(tu.cache_read) ?? 0, cache_write: num(tu.cache_write) ?? 0 };
    tokens_total = tokens_split.input + tokens_split.output + tokens_split.cache_read + tokens_split.cache_write;
  }
  let compression: number | null = null;
  if (accepted_handoff_tokens_est === null || tokens_total === null) nulls.push({ field: 'compression.compression', reason: 'accepted handoff tokens or total tokens is null' });
  else if (tokens_total === 0) nulls.push({ field: 'compression.compression', reason: 'token_usage totals 0' });
  else compression = accepted_handoff_tokens_est / tokens_total;
  const attested = num(attest.length ? p(attest[attest.length - 1]).attested : null);
  let tokens_per_attested_step: number | null = null;
  if (tokens_total === null || attested === null || attested === 0) nulls.push({ field: 'compression.tokens_per_attested_step', reason: 'no token total, or no attested step' });
  else tokens_per_attested_step = tokens_total / attested;
  nulls.push({ field: 'compression.tokens_on_rejected_attempts', reason: 'not derivable: the usage sink is per dispatch, not per attempt' });

  // ---- schema friction
  const schema_on_write_route_backs = routeBacks.filter((e) => p(e).class === 'schema-on-write').length;
  const d3_failures = of('D3_VALIDATION_FAILED').length;
  const clamp_failures = of('ENVELOPE_CLAMP_FAILED').length;
  const clamp_checks = of('ENVELOPE_CLAMP_CHECKED').length;
  const schema_fallbacks = of('HEURISTIC_MISS').filter((e) => p(e).reason === 'SCHEMA_FALLBACK').length;
  nulls.push({ field: 'schema_friction.in_loop_validation_repairs', reason: 'not recorded: in-loop coercions leave no event' });
  const schema_friction = schema_on_write_route_backs + d3_failures + clamp_failures + schema_fallbacks;

  // ---- energy
  let wall_ms_to_complete: number | null = null;
  let wall_ms_method: TracePhysicsAgent['energy']['wall_ms_method'] = null;
  const wall = num((last as unknown as { wall_time_ms?: unknown } | undefined)?.wall_time_ms);
  const start = of('AGENT_START')[0];
  if (wall !== null) { wall_ms_to_complete = Math.round(wall); wall_ms_method = 'agent_complete'; }
  else if (last && start && Date.parse(last.ts) >= Date.parse(start.ts)) { wall_ms_to_complete = Date.parse(last.ts) - Date.parse(start.ts); wall_ms_method = 'ts-delta'; }
  else nulls.push({ field: 'energy.wall_ms_to_complete', reason: 'no AGENT_COMPLETE event' });
  const gw = of('GATEWAY_CALL');
  let cost_usd: number | null = null;
  if (!gw.length) nulls.push({ field: 'energy.cost_usd', reason: 'no GATEWAY_CALL event (the gateway route was off)' });
  else cost_usd = gw.reduce((s, e) => s + (num(p(e).cost_usd) ?? 0), 0);

  // ---- meta
  // [SLP-C6] the one reading the receipt shares (scripts/lib/dispatch-topology.ts)
  const dispatch_topology = dispatchTopology(mine);
  const mode = of('OPPONENT_SWITCH').length ? 'opponent' : 'continuous';
  if (!input.inputState) nulls.push({ field: 'meta.input_score', reason: 'no input-state.json for this run (the input port, SLP-B3.6, has not written one)' });

  const score = traceScore(compression, jerk, schema_friction);
  if (score === null) nulls.push({ field: 'score', reason: 'compression is null, so no score is computed (every mock run)' });

  return {
    run_id: input.runId,
    agent_id: input.agentId,
    jerk: { route_back_retries, oscillations, corrector_cycles_beyond_first, judge_reruns, gate_rejections, restarts, budget_hits, repeated_identical_loads, repeated_identical_tool_calls, jerk },
    compression: { accepted_handoff_tokens_est, tokens_total, tokens_split, compression, tokens_per_attested_step, tokens_on_rejected_attempts: null },
    schema_friction: { schema_on_write_route_backs, d3_failures, clamp_failures, clamp_checks, schema_fallbacks, in_loop_validation_repairs: null, schema_friction },
    energy: { wall_ms_to_complete, wall_ms_method, cost_usd },
    meta: { dispatch_topology, mode, input_score: input.inputState?.score ?? null, input_score_source: input.inputState?.source ?? null },
    score,
    calibration: TRACE_PHYSICS_CALIBRATION,
    nulls,
  };
}

export interface RunTraceInput {
  runId: string;
  events: LedgerEvent[];
  agents: Array<{ agentId: string; handoffChars: number | null }>;
  inputState: InputState | null;
}

export function scoreRun(input: RunTraceInput): TracePhysicsRun {
  const agents = input.agents.map((a) => scoreAgentTrace({ runId: input.runId, agentId: a.agentId, events: input.events, handoffChars: a.handoffChars, inputState: input.inputState }));
  const nulls: Null[] = [];
  const jerk = agents.reduce((n, a) => n + a.jerk.jerk, 0);
  const schema_friction = agents.reduce((n, a) => n + a.schema_friction.schema_friction, 0);
  // compression over the agents that have both numbers; an agent without them is named, never counted as 0
  const scored = agents.filter((a) => a.compression.accepted_handoff_tokens_est !== null && a.compression.tokens_total !== null);
  for (const a of agents) if (!scored.includes(a)) nulls.push({ field: `totals.compression[${a.agent_id}]`, reason: 'this agent has no accepted handoff tokens or no token total; left out of the run compression' });
  const accepted = scored.length ? scored.reduce((n, a) => n + (a.compression.accepted_handoff_tokens_est ?? 0), 0) : null;
  const total = scored.length ? scored.reduce((n, a) => n + (a.compression.tokens_total ?? 0), 0) : null;
  const compression = accepted !== null && total ? accepted / total : null;
  if (compression === null) nulls.push({ field: 'totals.compression', reason: 'no agent in the run has both accepted handoff tokens and a token total' });
  const states = new Set(input.events.filter((e) => e.event_type === 'TRANSITION_CONTRACT').map((e) => String((e.payload ?? {}).state)));
  const distinct_states_per_run = states.size ? states.size : null;
  if (distinct_states_per_run === null) nulls.push({ field: 'meta.distinct_states_per_run', reason: 'no TRANSITION_CONTRACT event in the run' });
  nulls.push({ field: 'meta.max_parallel', reason: 'not recorded per run' });
  if (!input.inputState) nulls.push({ field: 'meta.input_score', reason: 'no input-state.json for this run (the input port, SLP-B3.6, has not written one)' });
  const score = traceScore(compression, jerk, schema_friction);
  if (score === null) nulls.push({ field: 'score', reason: 'the run compression is null, so no score is computed' });
  nulls.push({ field: 'trend', reason: "Lane B's trend() over a series of runs is wired by SLP-C3; none is reported here" });
  return {
    run_id: input.runId,
    agents,
    totals: { jerk, schema_friction, accepted_handoff_tokens_est: accepted, tokens_total: total, compression },
    meta: { dispatch_topology: 'hierarchical', max_parallel: null, distinct_states_per_run, input_score: input.inputState?.score ?? null, input_score_source: input.inputState?.source ?? null },
    score,
    trend: null,
    calibration: TRACE_PHYSICS_CALIBRATION,
    nulls,
  };
}
