// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/receipt.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * receipt.ts — [120 SE-07] receipt builder.
 *
 * Assembles one four-group Receipt (contracts/types/measurement/receipt.ts) from
 * what a run dir actually contains: events.jsonl (the B4 sink — SKILL_LOADED,
 * RECEIPT_GIVEN, ATTESTATION_VERIFIED, D3/FAITHFULNESS/GATE/PV events) plus the
 * agent's handoff artifacts. Because it reads artifacts rather than in-flight
 * variables, a receipt is assembleable post-hoc for ANY run, past or future
 * (scripts/emit-receipt.ts is the CLI for that).
 *
 * Honesty rules (Part E): the receipt records, it does not judge; a gate row
 * exists only when the gate OBSERVABLY fired (absence of a row is absence of
 * evidence, never a pass); unpopulatable fields land in `nulls[]` with reasons.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ReceiptSchema, RECEIPT_SEPARABILITY_STATEMENT,
  type Receipt, type GateVerdict, type ReceiptDone,
} from '../../contracts/types/measurement/receipt';

interface LedgerEvent {
  ts: string; run_id: string; agent_id: string | null;
  event_type: string; payload: Record<string, unknown>;
}

export interface BuildReceiptArgs {
  runRoot: string;          // e.g. verification/runs
  runId: string;
  agentConfigId: string;    // e.g. test-fixture.agent-12-prompt-manager (as in events)
  agentDirName: string;     // e.g. agent-12 (artifact dir under the run)
  manifest?: { universal: string[]; domain: string[] }; // config manifest, when available
}

function readLedger(runRoot: string, runId: string): LedgerEvent[] {
  const p = join(runRoot, runId, 'events.jsonl');
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf-8').split(/\r?\n/).filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line) as LedgerEvent]; } catch { return []; }
  });
}

function parseManifestEntry(entry: string, source: 'universal' | 'domain') {
  const m = entry.match(/^([a-z0-9-]+\.md)(?:\s+(§.*))?$/);
  return { skill: m?.[1] ?? entry, spec: m?.[2] ?? null, source };
}

// [TTR-6] Craftsmanship residuals for THIS run: scan the enrichment cache for
// grades of this run's handoff narrative and this agent's playbook.
// Deterministic path-suffix match; no matching grade yields [] with a nulls[]
// reason — never a guess. Population stats are NOT computed here (Q4 ruling).
function collectCraftsmanshipResiduals(runId: string, agentDirName: string): Array<{ source_file: string | null; surface: string; score: number; floor: number; margin: number }> {
  const cacheDir = '.cache/prompt-enrichment';
  if (!existsSync(cacheDir)) return [];
  const num = agentDirName.replace(/^agent-/, '');
  const wanted = [
    `${runId}/${agentDirName}/handoff.md`,
    `docs/playbooks/agent-${num}.md`,
  ];
  const out: Array<{ source_file: string | null; surface: string; score: number; floor: number; margin: number }> = [];
  for (const f of readdirSync(cacheDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const d = JSON.parse(readFileSync(join(cacheDir, f), 'utf-8'));
      const er = d?.eval_result;
      if (typeof er?.floor !== 'number' || !er?.dimensions || !Object.keys(er.dimensions).length) continue;
      const src = d.source_file ? String(d.source_file).replace(/\\/g, '/') : null;
      if (!src || !wanted.some((w) => src.endsWith(w))) continue;
      const score = Math.min(...(Object.values(er.dimensions) as number[]));
      out.push({ source_file: src, surface: String(d.surface ?? 'unknown'), score, floor: er.floor, margin: score - er.floor });
    } catch { /* unreadable cache entry — contributes nothing */ }
  }
  return out;
}

// [AIS5-4] The offline token estimate estimate-token-load.ts uses, labelled as chars/4 in every receipt.
const CHARS_PER_TOKEN = 4;
const estimateTokens = (chars: number): number => Math.ceil(chars / CHARS_PER_TOKEN);

export function buildReceipt(args: BuildReceiptArgs): Receipt {
  const nulls: Array<{ field: string; reason: string }> = [];
  const events = readLedger(args.runRoot, args.runId);
  const mine = (e: LedgerEvent) => e.agent_id === args.agentConfigId || e.agent_id === args.agentDirName;
  const agentEvents = events.filter(mine);

  // ---- given ----------------------------------------------------------------
  const givenEvent = agentEvents.find(e => e.event_type === 'RECEIPT_GIVEN');
  let indexInjected: Array<{ skill: string; spec: string | null; source: 'universal' | 'domain' }> = [];
  if (givenEvent && Array.isArray(givenEvent.payload.index_injected)) {
    indexInjected = givenEvent.payload.index_injected as typeof indexInjected;
  } else if (args.manifest) {
    indexInjected = [
      ...args.manifest.universal.map(e => parseManifestEntry(e, 'universal')),
      ...args.manifest.domain.map(e => parseManifestEntry(e, 'domain')),
    ];
    nulls.push({ field: 'given.index_injected', reason: 'no RECEIPT_GIVEN event in ledger (pre-[120] run) — reconstructed from the CURRENT config manifest, which may differ from the manifest at run time' });
  } else {
    nulls.push({ field: 'given.index_injected', reason: 'no RECEIPT_GIVEN event and no manifest supplied' });
  }
  const promptChars = typeof givenEvent?.payload.prompt_chars === 'number' ? givenEvent.payload.prompt_chars as number : null;
  if (promptChars === null) nulls.push({ field: 'given.prompt_chars', reason: givenEvent ? 'mock mode — prompt not assembled' : 'no RECEIPT_GIVEN event in ledger' });
  const loaded = agentEvents.filter(e => e.event_type === 'SKILL_LOADED').map(e => ({
    file: String(e.payload.file ?? ''),
    section: (e.payload.section as string | null) ?? null,
    iter: Number(e.payload.iter ?? 1),
    chars: Number(e.payload.chars ?? 0),
    tokens_estimate: estimateTokens(Number(e.payload.chars ?? 0)),
  }));

  // ---- done -----------------------------------------------------------------
  const agentDir = join(args.runRoot, args.runId, args.agentDirName);
  let artifactText = '';
  for (const f of ['handoff.md', 'handoff.json']) {
    const p = join(agentDir, f);
    if (existsSync(p)) artifactText += readFileSync(p, 'utf-8') + '\n';
  }
  const cited = new Set<string>();
  // [AIS5-4] Section grain: the canonical citation is `@skill: file.md §section` (two-pass-reading-protocol §7),
  // one token after the filename (§3, §6-§10, §full, §forced-tool-use).
  const citedSections = new Map<string, { skill: string; section: string | null }>();
  if (artifactText) {
    const re = /@skill:\s*([a-z0-9-]+\.md)(?:[ \t]+(§[^\s,;)]+))?/g;
    let m; while ((m = re.exec(artifactText)) !== null) {
      cited.add(m[1]);
      const section = m[2] ? m[2].replace(/[.:]+$/, '') : null;
      citedSections.set(`${m[1]}|${section ?? ''}`, { skill: m[1], section });
    }
  } else {
    nulls.push({ field: 'done.cited_in_output', reason: 'no handoff artifacts on disk for this agent (mock/smoke run or failed emission)' });
  }
  const givenSet = new Set(indexInjected.map(g => g.skill));
  const loadedSet = new Set(loaded.map(l => l.file));
  let outOfScope: number | null = null;
  const departuresFromHandoff: ReceiptDone['departures'] = [];
  const hjPath = join(agentDir, 'handoff.json');
  if (existsSync(hjPath)) {
    try {
      const hj = JSON.parse(readFileSync(hjPath, 'utf-8'));
      // [TTR-2] read-path fix: validated envelopes are TOP-LEVEL shaped
      // (all 6 real handoff.json on disk, 2026-09-01); only mock emissions
      // carry a payload wrapper. The old payload-only read was written
      // against the mock shape and made the field permanently invisible.
      const oos = hj?.out_of_scope_findings ?? hj?.payload?.out_of_scope_findings;
      outOfScope = Array.isArray(oos) ? oos.length : null;
      // [TTR-2] the T4 producer: a logged off-scope finding IS a departure —
      // 'departed from the prescribed scope AND (whatever run_outcome says)'.
      // This is the first non-failure-derived departure kind; paired with
      // run_outcome.status === 'succeeded' it expresses the state H9 found
      // unrepresentable. Limit stated in the plan: logged-not-executed only.
      if (Array.isArray(oos) && oos.length > 0) {
        departuresFromHandoff.push({ kind: 'out_of_scope', detail: `${oos.length} logged off-scope finding(s); first: ${String(oos[0]).slice(0, 160)}`, worked: null });
      }
      if (outOfScope === null) nulls.push({ field: 'done.out_of_scope_findings', reason: 'handoff payload carries no out_of_scope_findings array' });
    } catch { nulls.push({ field: 'done.out_of_scope_findings', reason: 'handoff.json unparseable' }); }
  } else {
    nulls.push({ field: 'done.out_of_scope_findings', reason: 'no handoff.json on disk' });
  }
  const departures: ReceiptDone['departures'] = [...departuresFromHandoff];
  for (const e of agentEvents) {
    if (e.event_type === 'ATTESTATION_VERIFIED' && e.payload.outcome && e.payload.outcome !== 'PASS') {
      departures.push({ kind: 'attestation', detail: `attestation outcome ${String(e.payload.outcome)} (gaps: ${String(e.payload.gap_count ?? '?')})`, worked: null });
    }
    if (e.event_type === 'HEURISTIC_MISS' && e.payload.reason === 'drift-audit-warn') {
      departures.push({ kind: 'drift_warn', detail: `uncited declared skills: ${JSON.stringify(e.payload.missing ?? [])}`, worked: null });
    }
    if (e.event_type === 'CIRCUIT_BREAKER') {
      departures.push({ kind: 'circuit_breaker', detail: JSON.stringify(e.payload).slice(0, 200), worked: null });
    }
  }

  // ---- gate_verdicts (only what observably fired) ---------------------------
  const gates: GateVerdict[] = [];
  for (const e of agentEvents) {
    if (e.event_type === 'ATTESTATION_VERIFIED') gates.push({ gate: 'attestation', mode: null, result: String(e.payload.outcome ?? 'unknown'), detail: `attested ${String(e.payload.attested ?? '?')}/${String(e.payload.declared_executable ?? '?')}` });
    if (e.event_type === 'D3_VALIDATION_FAILED') gates.push({ gate: 'd3_absorption', mode: null, result: 'FAILED', detail: JSON.stringify(e.payload.reasons ?? []).slice(0, 200) });
    if (e.event_type === 'FAITHFULNESS_AUDIT_FAILED') gates.push({ gate: 'faithfulness', mode: null, result: 'FAILED', detail: JSON.stringify(e.payload).slice(0, 200) });
    // [AIS1-3] A faithfulness judge that could not run is recorded as UNEVALUATED, never omitted.
    if (e.event_type === 'FAITHFULNESS_UNEVALUATED') gates.push({ gate: 'faithfulness', mode: null, result: 'UNEVALUATED', detail: String(e.payload.reason ?? 'unknown') });
    if (e.event_type === 'PV_DISPATCH_COMPLETE') gates.push({ gate: 'cross_family_judge', mode: null, result: String((e.payload as any).verdict ?? 'complete'), detail: (e.payload as any).re_ran ? 're-ran once on judge defect' : null });
  }
  for (const e of events) { // gate events are orchestrator-level (agent_id null)
    if (e.event_type === 'GATE_APPROVED') gates.push({ gate: `human_gate_${String(e.payload.gate ?? '?')}`, mode: null, result: 'approved', detail: null });
    if (e.event_type === 'GATE_REJECTED') gates.push({ gate: `human_gate_${String(e.payload.gate ?? '?')}`, mode: null, result: 'rejected', detail: `scope ${String(e.payload.scope ?? '?')}: ${String(e.payload.reason ?? '')}`.slice(0, 200) });
  }

  // ---- run_outcome ----------------------------------------------------------
  const starts = agentEvents.filter(e => e.event_type === 'AGENT_START').length;
  const completed = agentEvents.some(e => e.event_type === 'AGENT_COMPLETE');
  const failed = agentEvents.some(e => e.event_type === 'AGENT_FAIL');
  const humanRejected = events.some(e => e.event_type === 'GATE_REJECTED');
  const judgeReRan = agentEvents.some(e => e.event_type === 'PV_DISPATCH_COMPLETE' && (e.payload as any).re_ran === true);
  const status = starts > 1 || humanRejected || judgeReRan ? 're_run' : completed ? 'succeeded' : failed ? 'failed' : 'succeeded';
  const rerun_by = status === 're_run' ? (humanRejected ? 'human' : judgeReRan ? 'judge' : 'gate') : null;
  if (!completed && !failed) nulls.push({ field: 'run_outcome.status', reason: 'neither AGENT_COMPLETE nor AGENT_FAIL in ledger — status inferred as succeeded from artifact presence; treat as low-confidence' });

  // [TTR-6] residuals — Q4 boundary: {score, floor, margin} only.
  const craftsmanship = collectCraftsmanshipResiduals(args.runId, args.agentDirName);
  if (!craftsmanship.length) nulls.push({ field: 'residuals.craftsmanship', reason: "no craftsmanship grade in .cache/prompt-enrichment matches this run's handoff.md or this agent's playbook" });
  const vcResiduals: Array<{ command: string; expected_result: string; matched: boolean | null }> = [];
  if (existsSync(hjPath)) {
    try {
      const hj2 = JSON.parse(readFileSync(hjPath, 'utf-8'));
      for (const v of hj2?.verification_commands ?? []) {
        if (v?.command && v?.expected_result) vcResiduals.push({ command: String(v.command), expected_result: String(v.expected_result), matched: null });
      }
    } catch { /* unparseable — vc group stays empty */ }
  }
  if (vcResiduals.length) nulls.push({ field: 'residuals.verification_commands[].matched', reason: 'no recorded execution of handoff verification_commands exists anywhere on disk (write-only field since birth); comparison deferred until a runner records exits — never a speculative re-run' });

  const receipt: Receipt = {
    schema_version: '1.0',
    receipt_id: randomUUID(),
    run_id: args.runId,
    agent_id: args.agentConfigId,
    emitted_at: new Date().toISOString(),
    given: {
      index_injected: indexInjected,
      loaded,
      prompt_chars: promptChars,
      prompt_tokens_estimate: promptChars === null ? null : estimateTokens(promptChars),
      token_estimate_method: 'chars/4',
    },
    done: {
      cited_in_output: [...cited].sort(),
      cited_sections: [...citedSections.values()].sort((a, b) => `${a.skill} ${a.section ?? ''}`.localeCompare(`${b.skill} ${b.section ?? ''}`)),
      given_not_cited: [...givenSet].filter(s => !cited.has(s)).sort(),
      loaded_not_cited: [...loadedSet].filter(s => !cited.has(s)).sort(),
      out_of_scope_findings: outOfScope,
      departures,
      separability_statement: RECEIPT_SEPARABILITY_STATEMENT,
    },
    gate_verdicts: gates,
    run_outcome: { status, rerun_by, detail: starts > 1 ? `${starts} AGENT_START events for this agent` : null },
    residuals: { craftsmanship, verification_commands: vcResiduals },
    nulls,
  };
  return ReceiptSchema.parse(receipt);
}
