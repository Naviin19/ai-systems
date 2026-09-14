# Demo 5: work runs concurrently, merges do not

**Proves:** the orchestrator runs agents concurrently wherever the dependency graph allows, each in its own git worktree. Every merge into `main` passes through one lock, so work that finishes together still lands one commit at a time.

## Run

```
npm run demo:isolation
```

No key, no account, no network. It needs `git`, and takes about fifteen seconds, most of it in git and process start-up.

## Expected output

```
1. The build agents, scheduled by the orchestrator's scheduler
--------------------------------------------------------------
  15 build agents in 12 dependency waves; the scheduler runs up to 4 at once.
  wave  agents ready together
  ----  ---------------------
  1     agent-00
  2     agent-01
  3     agent-02
  4     agent-03a
  5     agent-03b, agent-12
  6     agent-03c
  7     agent-04
  8     agent-05, agent-08
  9     agent-06, agent-09
  10    agent-07
  11    agent-10
  12    agent-11
  agent-03b + agent-12            ran at the same time, each in its own worktree
  agent-05 + agent-08             ran at the same time, each in its own worktree
  agent-06 + agent-09             ran at the same time, each in its own worktree
  merges inside the lock at once  at most 1
  commits on main                 15 of 15
  each after its dependencies     yes

2. The lock under real contention: separate processes
-----------------------------------------------------
  4 processes, each holding a finished sandbox, released at the same instant to rebase onto main and fast-forward it.
  merge sections that overlapped  none
  commits on main                 4 of 4

Work ran concurrently where the graph allows, and every merge reached main one at a time.
```

## How to break it

Take the lock away. In `worker.ts`, change `await withMergeLock(merge, { lockPath, timeoutMs: 60_000 });` to `await merge();`, then run `npm run demo:isolation` again. The processes now rebase and fast-forward `main` at the same moment. Part 2 reports how many processes could not merge into main, prints what git refused, and exits 1.

What git refuses varies from run to run. Seen on one run: one commit reached `main`; another process hit git's own index lock (`Unable to create '…/.git/index.lock': File exists`); two failed to update `HEAD` because another merge had moved it first.

Nothing was silently lost. The merge is a fast-forward only, so git refuses instead of dropping a commit. Without the lock, finished work fails to land and the agent that produced it fails with it. With the lock, the same work queues and lands.

## What this is

**The scheduler, the lock and the merge are the factory's own code; the agents are a reduced harness.**

- **The extracted code.** `agent-scheduler.ts`, `merge-lock.ts` and `sandbox.ts` are extracted from the factory, and each file's header names what changed. `sandbox.ts` holds the orchestrator's `createWorktree`, `rebaseOntoMain`, `mergeSandbox` and `nukeSandbox`. `createWorktree` stops after `git worktree add`, because these worktrees run no tooling.
- **The merge is the orchestrator's own sequence.** Each merge rebases the sandbox onto `main` and fast-forwards `main`, inside `withMergeLock`, exactly as the orchestrator does.
- **The graph is real.** `fixtures/build-agents.json` is read from the factory's 15 build-agent configs. The five research agents join a run only when asked, so they are left out.
- **The agents are stand-ins.** Each writes one file and commits it, then waits 400 ms in place of the minutes a real agent's dispatch takes.
- **Part 1 runs in one process, as the orchestrator does.** There the rebase and the fast-forward are synchronous git calls, so two merges in the same process could not interleave even without the lock.
- **Part 2 is where the lock is load-bearing.** Separate processes run against one repository, which is what happens when two orchestrator runs share a checkout.

Extracted from the factory at commit `d490466` on 2026-09-14.
