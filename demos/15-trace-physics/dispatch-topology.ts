// Extracted from the software factory (private),
// scripts/lib/dispatch-topology.ts at 87fae286, on 2026-10-18.
// Unchanged apart from this header.

/**
 * dispatch-topology.ts — [SLP-C6] the one reading of an agent's dispatch topology (07 §7.4; ruling R-C6: the step layout goes
 * on the receipt). Read by the trace scorer (scripts/lib/trace-physics.ts, the record's meta.dispatch_topology) and by the
 * receipt builder (scripts/lib/receipt.ts, receipt v2's dispatch_topology), each over the agent's own events by its config id,
 * so the two read the same thing. Its own module
 * because trace-physics.ts imports the receipt's ledger reader: a function the receipt took from trace-physics.ts would make
 * the two modules import each other.
 *
 * From the agent's own events: a PV_DISPATCH_COMPLETE whose fork_path is pv-parallel makes it parallel-pv, one through the
 * cross-family judge makes it debate, and anything else — no such event, as on every mock run — is the plain pipeline.
 */
export type DispatchTopology = 'pipeline' | 'debate' | 'parallel-pv';

export function dispatchTopology(events: ReadonlyArray<{ event_type: string; payload?: Record<string, unknown> | null }>): DispatchTopology {
  const forks = events.filter((e) => e.event_type === 'PV_DISPATCH_COMPLETE').map((e) => (e.payload ?? {}).fork_path);
  if (forks.includes('pv-parallel')) return 'parallel-pv';
  if (forks.includes('cross-family-judge')) return 'debate';
  return 'pipeline';
}
