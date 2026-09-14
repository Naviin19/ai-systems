// Demo 5: agents run concurrently where the dependency graph allows, each in its own git worktree, and merges into
// main serialise through the merge lock. Every mechanism here is the factory's own code, extracted: see README.md.
import { execSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planWaves, runScheduled, type SchedNode } from './agent-scheduler';
import { withMergeLock } from './merge-lock';
import { createWorktree, mergeSandbox, nukeSandbox, rebaseOntoMain, type EventLogger } from './sandbox';
import { heading, line, rows, table } from '../lib/print';

const HERE = import.meta.dirname;
const TSX = fileURLToPath(import.meta.resolve('tsx/cli'));
const ORCH_MAX_PARALLEL = 4; // the orchestrator's default
const WORK_MS = 400; // what an agent's dispatch takes here; a real one takes minutes
const PROCESSES = 4;

const { agents } = JSON.parse(readFileSync(join(HERE, 'fixtures/build-agents.json'), 'utf8')) as { agents: SchedNode[] };
const logger: EventLogger = { emit: () => '' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const git = (args: string, cwd?: string) => execSync(`git -c user.name=demo -c user.email=demo@example.invalid -c core.autocrlf=false ${args}`, { cwd, stdio: 'pipe' }).toString().trim();

const root = mkdtempSync(join(tmpdir(), 'demo-isolation-'));
const fresh = (name: string): string => {
  const repo = join(root, name);
  mkdirSync(repo);
  git('init -q -b main', repo);
  writeFileSync(join(repo, 'README'), 'trunk\n');
  git('add README', repo);
  git('commit -q -m trunk', repo);
  return repo;
};
const home = process.cwd();
let exitCode = 0;

try {
  heading('1. The build agents, scheduled by the orchestrator\'s scheduler');
  const { waves } = planWaves(agents);
  line(`  ${agents.length} build agents in ${waves.length} dependency waves; the scheduler runs up to ${ORCH_MAX_PARALLEL} at once.`);
  table([['wave', 'agents ready together'], ...waves.map((w, i) => [String(i + 1), w.join(', ')])]);

  const repo = fresh('in-process');
  process.chdir(repo); // createWorktree and mergeSandbox work in the checkout they run in
  const running = new Set<string>();
  const overlaps = new Set<string>();
  let merging = 0;
  let maxMerging = 0;
  const result = await runScheduled(agents, ORCH_MAX_PARALLEL, async (node) => {
    for (const other of running) overlaps.add([other, node.id].sort().join(' + '));
    running.add(node.id);
    const sandbox = createWorktree(node.id, logger);
    writeFileSync(join(sandbox.worktreePath, `${node.id}.txt`), `${node.id}\n`);
    git(`add ${node.id}.txt`, sandbox.worktreePath);
    git(`commit -q -m ${node.id}`, sandbox.worktreePath);
    await sleep(WORK_MS);
    await withMergeLock(async () => {
      maxMerging = Math.max(maxMerging, ++merging);
      rebaseOntoMain(sandbox, logger);
      mergeSandbox(sandbox);
      merging--;
    });
    nukeSandbox(sandbox, logger);
    running.delete(node.id);
    return { ok: true };
  });
  const trunk = git('log --format=%s main').split(/\r?\n/).reverse().slice(1);
  const position = new Map(trunk.map((s, i) => [s, i]));
  const orderViolations = agents.filter((a) => a.dependsOn.some((d) => (position.get(d) ?? Infinity) > (position.get(a.id) ?? -1)));
  process.chdir(home);

  // Only the pairs the graph makes concurrent are reported: agents in one wave start together. Other overlaps depend on
  // how long each merge happened to take, so they vary from run to run.
  const sameWave = waves.filter((w) => w.length > 1).map((w): [string, string] => {
    const together = w.every((a, i) => w.slice(i + 1).every((b) => overlaps.has([a, b].sort().join(' + '))));
    if (!together) exitCode = 1;
    return [w.join(' + '), together ? 'ran at the same time, each in its own worktree' : 'did not overlap'];
  });
  rows([
    ...sameWave,
    ['merges inside the lock at once', `at most ${maxMerging}`],
    ['commits on main', `${trunk.length} of ${agents.length}${result.failed.length ? `, failed: ${result.failed.join(', ')}` : ''}`],
    ['each after its dependencies', orderViolations.length ? `no: ${orderViolations.map((a) => a.id).join(', ')}` : 'yes'],
  ]);
  if (trunk.length !== agents.length || orderViolations.length || result.failed.length) exitCode = 1;
  for (const [id, message] of result.errors) line(`  ${id} threw: ${message}`);

  heading('2. The lock under real contention: separate processes');
  const contended = fresh('cross-process');
  const lockPath = join(root, 'locks', '.merge.lock');
  const workers = Array.from({ length: PROCESSES }, (_, i) => `agent-p${i + 1}`);
  process.chdir(contended);
  const sandboxes = workers.map((id) => {
    const sandbox = createWorktree(id, logger);
    writeFileSync(join(sandbox.worktreePath, `${id}.txt`), `${id}\n`);
    git(`add ${id}.txt`, sandbox.worktreePath);
    git(`commit -q -m ${id}`, sandbox.worktreePath);
    return sandbox;
  });
  process.chdir(home);
  const startAt = Date.now() + 4000;
  const outcomes = await Promise.all(sandboxes.map((s) => new Promise<{ agentId: string; enteredAt: number; leftAt: number; error: string | null }>((resolve) => {
    const child = spawn(process.execPath, [TSX, join(HERE, 'worker.ts'), contended, s.agentId, join(contended, s.worktreePath), s.branch, lockPath, String(startAt)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => {
      const found = out.split(/\r?\n/).find((l) => l.startsWith('WORKER '));
      resolve(found ? JSON.parse(found.slice(7)) : { agentId: s.agentId, enteredAt: 0, leftAt: 0, error: 'the worker printed no result' });
    });
  })));
  const merged = git('log --format=%s main', contended).split(/\r?\n/).filter((s) => workers.includes(s));
  const failed = outcomes.filter((o) => o.error);
  const spans = outcomes.filter((o) => !o.error).sort((a, b) => a.enteredAt - b.enteredAt);
  const overlapped = spans.some((s, i) => i > 0 && s.enteredAt < spans[i - 1].leftAt);
  line(`  ${PROCESSES} processes, each holding a finished sandbox, released at the same instant to rebase onto main and fast-forward it.`);
  rows([
    ['merge sections that overlapped', failed.length ? 'n/a' : overlapped ? 'some' : 'none'],
    ['commits on main', `${merged.length} of ${PROCESSES}`],
  ]);
  if (failed.length || merged.length !== PROCESSES || overlapped) {
    exitCode = 1;
    line(`\n  ${failed.length} of ${PROCESSES} processes could not merge into main:`);
    for (const f of failed) line(`    ${f.agentId}: ${f.error}`);
  }
} finally {
  process.chdir(home);
  rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}

line(exitCode === 0
  ? '\nWork ran concurrently where the graph allows, and every merge reached main one at a time.'
  : '\nWithout serialised merges, work that finished together did not all reach main.');
process.exit(exitCode);
