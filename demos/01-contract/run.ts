// Demo 1: one schema, and every surface that depends on it. Change a producer's field, and the contract compiler names
// the consumer that breaks, the line of its playbook that reads the field, and everything else the change reaches.
// Every check here is the factory's own code, extracted: see README.md.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HandoffEnvelopeSchema } from '../../contracts/types/operational/handoff-envelope';
import { compileContracts } from '../../contracts/enforcement/compatibility/contract-compiler';
import type { AgentNode } from '../../contracts/enforcement/agent-graph';
import { deepEqual, firstDiff, renderSchema } from './json-schema';
import { heading, line, rows } from '../lib/print';

const HERE = import.meta.dirname;
const ROOT = resolve(HERE, '../..');
const TSX = fileURLToPath(import.meta.resolve('tsx/cli'));
const { agents } = JSON.parse(readFileSync(join(HERE, 'fixtures/agent-graph.json'), 'utf8')) as { agents: AgentNode[] };
let failed = false;

heading('1. The contract, and the JSON Schema generated from it');
const committed = JSON.parse(readFileSync(join(ROOT, 'contracts/schemas/operational/handoff-envelope.schema.json'), 'utf8'));
const generated = renderSchema({ schema: HandoffEnvelopeSchema, name: 'HandoffEnvelope' });
const variants = (HandoffEnvelopeSchema as unknown as { options: unknown[] }).options.length;
const schemaMatches = deepEqual(generated, committed);
rows([
  ['source', 'contracts/types/operational/handoff-envelope.ts (Zod)'],
  ['variants', `${variants} boundaries, one per handoff_boundary literal`],
  ['committed JSON Schema', schemaMatches ? 'regenerated, and identical to what is committed' : `DRIFTED at ${firstDiff(generated, committed)}`],
]);
if (!schemaMatches) failed = true;

heading('2. Every seam of the agent graph, compiled');
process.chdir(join(HERE, 'fixtures')); // the edge registry cites playbook lines by their path in the factory
const report = await compileContracts({ graph: agents, stepsDir: join('templates', 'playbooks', 'steps') });
process.chdir(ROOT);
const typed = report.edges.filter((e) => e.reads > 0);
rows([
  ['agents', String(agents.length)],
  ['dependency edges', `${report.total_edges}, every one declared (undeclared: ${report.undeclared_edges.length}, stale: ${report.stale_declarations.length})`],
  ['edges with typed reads', `${typed.length}, ${typed.reduce((n, e) => n + e.reads, 0)} reads checked by structural subtyping`],
  ['playbook handoff reads', `${report.step_file_reads.filter((r) => r.resolved).length} of ${report.step_file_reads.length} resolve against the real envelope`],
  ['compatible', report.compatible ? 'yes' : 'NO'],
]);
for (const e of typed) line(`  ${e.mismatches.length ? '✗' : '✓'} ${e.producer} → ${e.consumer}  ${e.boundary}  (${e.reads} read${e.reads === 1 ? '' : 's'})`);

if (!report.compatible) {
  failed = true;
  line('\n  The change breaks a consumer:');
  for (const e of report.edges.filter((x) => x.mismatches.length)) {
    for (const m of e.mismatches) {
      line(`    ${e.producer} → ${e.consumer} at ${m.path}`);
      line(`      expected  ${m.expected}`);
      line(`      received  ${m.received}  (${m.reason})`);
      if (m.evidence) line(`      read by   ${m.evidence}`);
    }
  }
  for (const r of report.step_file_reads.filter((x) => !x.resolved)) line(`    ${r.at} reads ${r.producer}.${r.path}: ${r.note}`);
}

heading('3. What a change to the envelope reaches');
const blast = spawnSync(process.execPath, [TSX, 'contracts/registry/blast-radius.ts', 'HandoffEnvelope'], { cwd: ROOT, encoding: 'utf8' });
const out = blast.stdout.trim().split(/\r?\n/);
const prompts = (out.find((l) => l.startsWith('Prompts: ')) ?? '').slice('Prompts: '.length).split(', ').filter((p) => p && p !== '(none)');
rows([
  ['affected schemas', (out.find((l) => l.startsWith('Affected schemas: ')) ?? '').slice(18)],
  ['affected tables', (out.find((l) => l.startsWith('Affected tables: ')) ?? '').slice(17)],
  ['prompts', `${prompts.length}: every playbook and build prompt that reads a handoff`],
]);
for (const p of prompts.slice(0, 6)) line(`    ${p}`);
if (prompts.length > 6) line(`    … and ${prompts.length - 6} more`);
line(`  ${out.at(-1) ?? ''}`);

line(failed
  ? '\nA producer changed a field its consumers rely on. The compiler refused it before any agent ran.'
  : '\nOne source of truth: the schema, its JSON Schema, every consumer read and the prompts that read it, all computed.');
process.exit(failed ? 1 : 0);
