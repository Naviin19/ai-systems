// Simulates what demos/run-all.ts does: discover NN-* dirs, read each demo.json and each README's
// **Proves:** line, run every run.ts, and report. Used to verify new demos before they are proposed.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const HERE = import.meta.dirname;
const dirs = readdirSync(HERE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

let failed = 0;
for (const dir of dirs) {
  const spec = JSON.parse(readFileSync(join(HERE, dir, 'demo.json'), 'utf8')) as { command: string; tamper: { file: string; expect_exit: number; expect_line: string } };
  const md = readFileSync(join(HERE, dir, 'README.md'), 'utf8');
  const proves = md.match(/\*\*Proves:\*\*\s*(.+?\.)(\s|$)/)?.[1] ?? '(BLANK — run-all would show nothing)';
  const t0 = Date.now();
  const run = spawnSync(process.execPath, ['--import', 'tsx', join(HERE, dir, 'run.ts')], { encoding: 'utf8' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (run.status !== 0) failed++;
  console.log(`${spec.command.padEnd(16)} ${(run.status === 0 ? 'held' : `FAILED ${run.status}`).padEnd(10)} ${secs.padStart(5)}s  ${proves}`);
  console.log(`${' '.repeat(16)} tamper -> exit ${spec.tamper.expect_exit}, expects: ${spec.tamper.expect_line}`);
}
console.log(`\n${dirs.length} demo(s), ${failed} failing.`);
process.exit(failed ? 1 : 0);
