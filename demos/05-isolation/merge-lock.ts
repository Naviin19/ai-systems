// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/merge-lock.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * [AIS2-3] The merge lock — one implementation, shared by every merger.
 *
 * It lived inside the orchestrator as three private functions: an exclusive `wx` lock file polled
 * every 100 ms, with no recovery when its holder died, so a run that crashed mid-merge left
 * .sandboxes/.merge.lock behind and every later merge waited out the timeout and failed.
 *
 * Two layers, so both kinds of contention wait correctly:
 *   - an in-process queue per lock path: concurrent tasks inside one orchestrator wait on a promise
 *     instead of polling a file;
 *   - the lock file (atomic `wx` create) holding {pid, acquired_at}: a second process waits too. A
 *     lock whose holder process no longer exists is taken over at once, under a short takeover file,
 *     so two waiters that both see the dead holder cannot both remove the new holder's lock.
 */
import { closeSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const DEFAULT_MERGE_LOCK_PATH = join(".sandboxes", ".merge.lock");

export interface MergeLockOptions {
  lockPath?: string;
  /** How long to wait for another process's lock before failing. Default 60 s. */
  timeoutMs?: number;
  pollMs?: number;
}

const queues = new Map<string, Promise<void>>();

function ageMs(path: string): number {
  try { return Date.now() - statSync(path).mtimeMs; } catch { return 0; }
}

/** False only when the recorded holder process provably no longer exists. */
function holderAlive(lockPath: string): boolean {
  let pid: unknown;
  try {
    pid = (JSON.parse(readFileSync(lockPath, "utf8")) as { pid?: unknown }).pid;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    // Unreadable or half-written: a holder is writing it now, unless it has sat unreadable a while.
    return ageMs(lockPath) < 60_000;
  }
  if (typeof pid !== "number" || pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM"; // exists but belongs to someone else
  }
}

function tryTakeOver(lockPath: string): void {
  const takeover = `${lockPath}.takeover`;
  let fd: number | null = null;
  try {
    fd = openSync(takeover, "wx");
  } catch {
    // Another waiter is taking over. Clear its marker only if it was abandoned mid-takeover.
    if (ageMs(takeover) > 10_000) { try { unlinkSync(takeover); } catch { /* raced */ } }
    return;
  }
  closeSync(fd);
  try {
    if (!holderAlive(lockPath)) unlinkSync(lockPath);
  } catch {
    /* the lock vanished between the check and the unlink */
  } finally {
    try { unlinkSync(takeover); } catch { /* already gone */ }
  }
}

async function acquireFile(lockPath: string, timeoutMs: number, pollMs: number): Promise<void> {
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      try {
        writeSync(fd, JSON.stringify({ pid: process.pid, acquired_at: new Date().toISOString() }));
      } finally {
        closeSync(fd);
      }
      return;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    if (!holderAlive(lockPath)) {
      tryTakeOver(lockPath);
      continue;
    }
    if (Date.now() >= deadline) throw new Error(`withMergeLock: timed out after ${timeoutMs}ms waiting for ${lockPath}`);
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/** Runs fn while holding the merge lock: callers in this process queue, other processes wait on the file. */
export async function withMergeLock<T>(fn: () => Promise<T> | T, opts: MergeLockOptions = {}): Promise<T> {
  const lockPath = resolve(opts.lockPath ?? DEFAULT_MERGE_LOCK_PATH);
  const previous = queues.get(lockPath) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => { release = r; });
  const tail = previous.then(() => mine);
  queues.set(lockPath, tail);
  await previous;
  try {
    await acquireFile(lockPath, opts.timeoutMs ?? 60_000, opts.pollMs ?? 100);
    try {
      return await fn();
    } finally {
      try { unlinkSync(lockPath); } catch { /* already gone */ }
    }
  } finally {
    release();
    if (queues.get(lockPath) === tail) queues.delete(lockPath);
  }
}
