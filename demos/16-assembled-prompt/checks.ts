// Extracted from the software factory (private),
// scripts/audit/deterministic-prompt-checks.mjs at 87fae286, on 2026-10-18.
// Changed on extraction: TypeScript types; the command-line scan of the assembled corpus and the --self-test are
// dropped, because the demo assembles its own prompt and plants its own defects. checkAssembled is unchanged.

// [255 PA3-2] The deterministic half of the assembled-prompt gate. Zero API cost.
//
// SCOPE DISCIPLINE: this carries ONLY what is genuinely mechanical. [250]
// measured a pattern-matching pass at 6% recall, so anything requiring judgement
// belongs to the reader/verifier stage, not here. The purpose of this half is to
// catch — free, on every run — the specific defect SHAPES that have actually
// shipped in this repo, each one traceable to a real incident.
//
// Every check below is derived from a defect that was live in production prompts:
//   D1 numeric-bound disagreement  <- corrector cycles said 2, then ONE, then 2 again
//   D2 dangling proper noun        <- "Deliverables Manifest" had no referent anywhere
//   D3 unframed bulk block         <- ## JIT LESSONS, 1,552 lines, no framing sentence
//   D4 index entry with no trigger <- 188/621 entries; 55 missing, 133 truncated, 14 "|"
//   D5 attestation grammar drift   <- contract enumerated ###, playbooks used ####
//   D6 tool ordered but undescribed<- "STOP. Call request_steering" with no such block

export interface Finding { prompt_id: string; rule: string; line: number; message: string }

export function checkAssembled(id: string, text: string): Finding[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: Finding[] = [];
  const add = (rule: string, line: number, msg: string) => out.push({ prompt_id: id, rule, line, message: msg });
  const find = (re: RegExp) => { for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1; return 0; };

  // D1 — the same bounded quantity stated with two different numbers.
  const bounds: Array<{ line: number; n: string }> = [];
  lines.forEach((l, i) => {
    const m = l.match(/Max (\d+) cycles?|eligible for (ONE|TWO|\d+) Corrector cycles?|maximum of (\d+)/i);
    if (m) bounds.push({ line: i + 1, n: (m[1] ?? m[2] ?? m[3]).toString().toUpperCase() });
  });
  const norm = (v: string) => ({ ONE: '1', TWO: '2' } as Record<string, string>)[v] ?? v;
  const distinct = [...new Set(bounds.map((b) => norm(b.n)))];
  if (distinct.length > 1) {
    add('D1-numeric-bound-disagreement', bounds[0].line,
      `corrector-cycle bound stated ${distinct.length} different ways (${distinct.join(' vs ')}) at lines ${bounds.map((b) => b.line).join(', ')}`);
  }

  // D2 — a Capitalised Proper Noun the prompt never defines.
  for (const noun of ['Deliverables Manifest']) {
    const at = find(new RegExp(`\\b${noun}\\b`));
    if (at) {
      const defined = new RegExp(`^#{2,4} *\\d*\\.? *${noun.toUpperCase()}|list or table|together with`, 'im').test(text);
      if (!defined) add('D2-dangling-proper-noun', at, `"${noun}" is named as a specific artifact but the prompt never defines or locates one`);
    }
  }

  // D3 — a bulk block introduced by a bare header.
  for (const h of ['## JIT LESSONS', '## PRIOR DECISIONS']) {
    const at = find(new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    if (!at) continue;
    const next = lines[at] ?? '';
    const framed = next.trim().length > 40 && !/^#/.test(next.trim());
    const end = (() => { for (let i = at; i < lines.length; i++) if (/^## [A-Z]/.test(lines[i])) return i + 1; return lines.length; })();
    if (!framed && end - at > 20) add('D3-unframed-bulk-block', at, `${h} introduces ${end - at} lines with no framing sentence stating what the block is or what outranks it`);
  }

  // D4 — citation-index entries that state no trigger. [PD-4] A producer's playbook (what it is handed) lists them as
  // `- @skill: x.md §… — sentence`, an assembled prompt as `@skill: …`; both are read, and a sentence the playbook
  // generator cut at its cap ends in "…" like any other truncation (ruling PLAYBOOK-TRIGGER-CAP raised the cap).
  const bad: number[] = [];
  lines.forEach((l, i) => {
    if (!/^(- )?@skill: /.test(l)) return;
    if (/no description — load_skill/.test(l) || /— \|\s*$/.test(l) || /…\s*$/.test(l)) bad.push(i + 1);
  });
  if (bad.length) add('D4-index-entry-without-trigger', bad[0], `${bad.length} citation-index entr${bad.length === 1 ? 'y states' : 'ies state'} no usable trigger (missing, truncated, or a bare block-scalar marker) at lines ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? '…' : ''}`);

  // D5 — attestation contract vs the heading forms actually present.
  const contract = find(/you MUST emit one entry in your handoff envelope/);
  if (contract) {
    const claim = lines[contract - 1];
    const present = new Set<string>();
    lines.forEach((l) => { const m = l.match(/^(#{3,4})\s+(Step|Phase)\b/); if (m) present.add(`${m[1]} ${m[2]}`); });
    const unclaimed = [...present].filter((f) => !claim.includes(f.split(' ')[0] + ' ' + f.split(' ')[1]) && !claim.includes(f));
    if (present.size && unclaimed.length) {
      add('D5-attestation-grammar-drift', contract, `the attestation contract enumerates heading forms that omit ${unclaimed.join(', ')}, which this plan uses — the agent would emit a short step_attestations[] and the orchestrator HALTs on mismatch`);
    }
  }

  // D6 — a tool ordered without its availability stated anywhere.
  const order = find(/Call `request_steering`|via `request_steering`/);
  if (order) {
    const hasBlock = /^## STEERING POINTS/m.test(text);
    const hasCondition = /not provisioned|no STEERING POINTS/i.test(text);
    if (!hasBlock && !hasCondition) add('D6-tool-ordered-undescribed', order, '`request_steering` is ordered but neither provisioned (no STEERING POINTS block) nor conditioned');
  }
  return out;
}
