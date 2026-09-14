// Demo 5 worker: one merger in its own process. It waits for a shared start instant, then rebases its sandbox onto main
// and fast-forwards main, inside the merge lock, exactly as the orchestrator merges a finished agent.
// argv: <repo> <agentId> <worktreePath> <branch> <lockPath> <startAtMs>
import { withMergeLock } from './merge-lock';
import { mergeSandbox, rebaseOntoMain, type EventLogger, type Sandbox } from './sandbox';

const [repo, agentId, worktreePath, branch, lockPath, startAt] = process.argv.slice(2);
const logger: EventLogger = { emit: () => '' };
const sandbox: Sandbox = { agentId, worktreePath, branch };

process.chdir(repo); // mergeSandbox fast-forwards the checkout it runs in, as it does at the orchestrator's root
const wait = Number(startAt) - Date.now();
if (wait > 0) await new Promise((r) => setTimeout(r, wait));

let enteredAt = 0;
let leftAt = 0;
let error: string | null = null;
const merge = async (): Promise<void> => {
  enteredAt = Date.now();
  rebaseOntoMain(sandbox, logger);
  mergeSandbox(sandbox);
  leftAt = Date.now();
};
try {
  await withMergeLock(merge, { lockPath, timeoutMs: 60_000 });
} catch (e) {
  error = ((e as { stderr?: Buffer }).stderr?.toString() || (e as Error).message).trim().split('\n')[0] ?? 'unknown';
}
console.log(`WORKER ${JSON.stringify({ agentId, enteredAt, leftAt, error })}`);
