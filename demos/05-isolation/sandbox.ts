// Extracted from the factory repository (skill-ecosystem, private),
// scripts/master-agentic-orchestrator.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - kept: Sandbox, createWorktree, mergeSandbox, nukeSandbox, RebaseConflictError and rebaseOntoMain
//   - createWorktree ends after `git worktree add`: the node_modules link and tsbuildinfo seeding that follow are removed, because these worktrees run no tooling, and it returns the Sandbox it built
//   - EventLogger is replaced by the one method these functions call, emit
//   - added: export on each kept name

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Added on extraction: the part of the orchestrator's EventLogger these functions use. */
export interface EventLogger {
  emit(event_type: string, opts?: { agent_id?: string | null; payload?: Record<string, unknown> }): string;
}

export interface Sandbox {
  agentId: string;
  worktreePath: string;
  branch: string;
}

export function createWorktree(agentId: string, logger: EventLogger): Sandbox {
  const branch = `sandbox/${agentId}-${Date.now()}`;
  const worktreePath = join(".sandboxes", agentId);
  mkdirSync(dirname(worktreePath), { recursive: true });
  try {
    execSync(`git worktree add -b ${branch} ${worktreePath}`, { stdio: "pipe" });
  } catch (e) {
    throw new Error(`createWorktree failed: ${(e as Error).message}`);
  }

  return { agentId, worktreePath, branch };
}

export function mergeSandbox(sandbox: Sandbox): void {
  // Fast-forward only — rejects non-ff merges.
  execSync(`git merge --ff-only ${sandbox.branch}`, { stdio: "pipe" });
}

export function nukeSandbox(sandbox: Sandbox, logger: EventLogger): void {
  // Teardown containment guard (2026-09-06, packages/-deletion incident audit,
  // requested by session-0f): refuse any teardown whose target is not strictly
  // inside .sandboxes/ with a non-empty leaf — a degenerate agentId must never
  // let the removal resolve at or above the repo root. The 2026-09-06 audit
  // found no such path (removal is git-mediated, and git refuses to remove a
  // main working tree), but the assertion makes that finding permanent.
  const rel = sandbox.worktreePath.replace(/\\/g, "/");
  if (!/^\.sandboxes\/[^/]+/.test(rel) || resolve(sandbox.worktreePath) === resolve(".")) {
    logger.emit("SANDBOX_NUKE", { agent_id: sandbox.agentId, payload: { phase: "REFUSED", reason: `teardown target outside .sandboxes/: "${sandbox.worktreePath}"` } });
    return;
  }
  try { execSync(`git worktree remove --force ${sandbox.worktreePath}`, { stdio: "pipe" }); } catch {}
  try { execSync(`git branch -D ${sandbox.branch}`, { stdio: "pipe" }); } catch {}
  // Product-level: supabase db reset would go here in production runs.
  logger.emit("SANDBOX_NUKE", { agent_id: sandbox.agentId, payload: { phase: "destroyed" } });
}

export class RebaseConflictError extends Error {
  constructor(public agentId: string, public detail: string) {
    super(`rebase conflict on agent ${agentId}: ${detail}`);
    this.name = "RebaseConflictError";
  }
}

export function rebaseOntoMain(sandbox: Sandbox, logger: EventLogger): void {
  try {
    // Worktrees share the parent .git directory, so `main` is already accessible
    // by name inside the sandbox checkout — no need to fetch a separate remote.
    execSync(`git -C "${sandbox.worktreePath}" rebase main`, { stdio: "pipe" });
    logger.emit("SANDBOX_REBASE", { agent_id: sandbox.agentId, payload: { onto: "main", phase: "clean" } });
  } catch (e: any) {
    // Abort any half-applied rebase so the worktree is left in a clean state.
    try { execSync(`git -C "${sandbox.worktreePath}" rebase --abort`, { stdio: "pipe" }); } catch {}
    const detail = (e.stderr?.toString() ?? e.message ?? "").trim();
    logger.emit("SANDBOX_REBASE", { agent_id: sandbox.agentId, payload: { onto: "main", phase: "conflict", detail } });
    throw new RebaseConflictError(sandbox.agentId, detail);
  }
}
