// Written for this demo, not extracted. A toy assembler: it joins the fragments into one prompt the way the factory's
// orchestrator joins a kernel, an index, a step plan, its own rule text and a steering block, and it drops the
// steering block when the steering switch is off, as the orchestrator does when its tool server is disabled. The
// factory's assembler lives in its 5,000-line orchestrator and is not extracted.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const FRAGMENTS = ['kernel.md', 'index.md', 'steps.md', 'retry-rule.md', 'steering.md'] as const;
export type Fragments = Record<(typeof FRAGMENTS)[number], string>;

/** The fragments from one folder, with any file in `overrides` read from there instead. */
export function readFragments(dir: string, overrides?: string): Fragments {
  const read = (f: string): string => {
    try { if (overrides) return readFileSync(join(overrides, f), 'utf8'); } catch { /* not overridden */ }
    return readFileSync(join(dir, f), 'utf8');
  };
  return Object.fromEntries(FRAGMENTS.map((f) => [f, read(f)])) as Fragments;
}

export function assemble(f: Fragments, steering: 'on' | 'off'): string {
  const parts = ['# Agent: 02 collection (producer)', f['kernel.md'], f['index.md'], f['steps.md'], f['retry-rule.md']];
  if (steering === 'on') parts.push(f['steering.md']);
  return parts.map((p) => p.trimEnd()).join('\n\n') + '\n';
}
