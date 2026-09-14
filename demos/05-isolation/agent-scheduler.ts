// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/agent-scheduler.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * [AIS2-2] Dependency-wave scheduler for the orchestrator.
 *
 * The orchestrator dispatched one agent at a time in DFS order, so agents with nothing between them
 * (05 and 08, 06 and 09) never overlapped. This runs every agent whose dependencies have completed,
 * up to maxParallel at once, and starts the next ready agent the moment a slot frees. It holds one
 * process, so events.jsonl, the run directory and the session baseline are shared, not raced.
 *
 * Rules:
 *   - an agent is ready when every dependency INSIDE this run has completed; a dependency outside it
 *     (an agent from an earlier invocation of the same run) does not block
 *   - input order breaks ties, so maxParallel 1 reproduces a topological order exactly
 *   - the first failure stops new starts; agents already running finish and are reported
 *   - agents that can never become ready (a cycle, or a failed dependency) are reported unstarted,
 *     never waited on
 */

export interface SchedNode {
  id: string;
  dependsOn: string[];
}

export interface TaskOutcome<R> {
  ok: boolean;
  value?: R;
}

export interface ScheduleResult<R> {
  completed: string[];
  failed: string[];
  notStarted: string[];
  results: Map<string, R>;
  /** Messages of tasks that threw instead of returning an outcome. */
  errors: Map<string, string>;
}

export async function runScheduled<N extends SchedNode, R>(
  nodes: N[],
  maxParallel: number,
  run: (node: N) => Promise<TaskOutcome<R>>,
): Promise<ScheduleResult<R>> {
  const limit = Math.max(1, Math.floor(Number(maxParallel)) || 1);
  const inRun = new Set(nodes.map((n) => n.id));
  const done = new Set<string>();
  const completed: string[] = [];
  const failed: string[] = [];
  const results = new Map<string, R>();
  const errors = new Map<string, string>();
  const pending = [...nodes];
  let running = 0;
  let halted = false;

  const isReady = (n: N) => n.dependsOn.every((d) => !inRun.has(d) || done.has(d));

  return new Promise((resolveAll) => {
    const pump = (): void => {
      if (!halted) {
        for (let i = 0; i < pending.length && running < limit; ) {
          const node = pending[i];
          if (!isReady(node)) { i++; continue; }
          pending.splice(i, 1);
          running++;
          void (async () => {
            let outcome: TaskOutcome<R>;
            try {
              outcome = await run(node);
            } catch (e) {
              errors.set(node.id, (e as Error)?.message ?? String(e));
              outcome = { ok: false };
            }
            running--;
            if (outcome.ok) {
              done.add(node.id);
              completed.push(node.id);
              if (outcome.value !== undefined) results.set(node.id, outcome.value);
            } else {
              failed.push(node.id);
              halted = true;
            }
            pump();
          })();
        }
      }
      if (running === 0) {
        resolveAll({ completed, failed, notStarted: pending.map((n) => n.id), results, errors });
      }
    };
    pump();
  });
}

/** The waves a run would take with unbounded parallelism: each wave is ready once the previous ones complete. */
export function planWaves(nodes: SchedNode[]): { waves: string[][]; unschedulable: string[] } {
  const inRun = new Set(nodes.map((n) => n.id));
  const placed = new Set<string>();
  const waves: string[][] = [];
  let remaining = [...nodes];
  for (;;) {
    const wave = remaining.filter((n) => n.dependsOn.every((d) => !inRun.has(d) || placed.has(d)));
    if (wave.length === 0) break;
    waves.push(wave.map((n) => n.id));
    for (const n of wave) placed.add(n.id);
    remaining = remaining.filter((n) => !placed.has(n.id));
  }
  return { waves, unschedulable: remaining.map((n) => n.id) };
}

/** Node ids in dependency order; input order breaks ties. Nodes in a cycle are left out. */
function topoOrder(nodes: SchedNode[]): string[] {
  const inRun = new Set(nodes.map((n) => n.id));
  const placed = new Set<string>();
  const out: string[] = [];
  for (let progressed = true; progressed; ) {
    progressed = false;
    for (const n of nodes) {
      if (placed.has(n.id)) continue;
      if (n.dependsOn.every((d) => !inRun.has(d) || placed.has(d))) {
        placed.add(n.id);
        out.push(n.id);
        progressed = true;
      }
    }
  }
  return out;
}

/**
 * [AIS2G-2] What a BLOCK rejection at a review gate re-runs. A reviewer at Gate A who traces the defect
 * to 03b names it as the target: the re-run is every agent on a dependency path from the target to the
 * gate agent (target included, gate agent excluded), in dependency order, followed by the gate agent.
 *
 * `stale` names agents that already completed, depend on something in the chain, and are neither in it
 * nor downstream of the gate (those have not started). Their inputs are about to change; the reviewer
 * is told rather than the run re-running work nobody asked for.
 *
 * A target that is the gate agent itself (use AGENT), is not upstream of it within this run, or is not
 * in this run at all is refused with a reason and an empty chain.
 */
export function planBlockRerun(
  nodes: SchedNode[],
  target: string,
  gate: string,
  completed: ReadonlySet<string>,
): { chain: string[]; stale: string[]; error: string | null } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const refuse = (error: string) => ({ chain: [] as string[], stale: [] as string[], error });
  if (!byId.has(gate)) return refuse(`gate agent ${gate} is not in this run`);
  if (!byId.has(target)) return refuse(`${target} is not an agent in this run`);
  if (target === gate) return refuse(`${target} is the gate agent itself; use scope AGENT`);

  const ancestors = new Set<string>();
  const up = (id: string): void => {
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (byId.has(d) && !ancestors.has(d)) { ancestors.add(d); up(d); }
    }
  };
  up(gate);
  if (!ancestors.has(target)) return refuse(`${target} is not upstream of ${gate} in this run`);

  const children = new Map<string, string[]>();
  for (const n of nodes) for (const d of n.dependsOn) if (byId.has(d)) children.set(d, [...(children.get(d) ?? []), n.id]);
  const below = (from: string[]): Set<string> => {
    const seen = new Set<string>();
    const walk = (id: string): void => { for (const c of children.get(id) ?? []) if (!seen.has(c)) { seen.add(c); walk(c); } };
    for (const id of from) walk(id);
    return seen;
  };

  const inChain = new Set([target, ...[...below([target])].filter((id) => ancestors.has(id))]);
  const order = topoOrder(nodes);
  const chain = order.filter((id) => inChain.has(id));
  const gateAndDownstream = new Set([gate, ...below([gate])]);
  const affected = below(chain);
  const stale = order.filter((id) => affected.has(id) && !inChain.has(id) && !gateAndDownstream.has(id) && completed.has(id));
  return { chain, stale, error: null };
}
