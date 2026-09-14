// npm run demo: every demo, one after another, with no key, no account and no network. Prints what each proves and
// whether it held, then how to break two of them. A demo's full output is in its README, or here with --verbose.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { heading, line, table } from './lib/print';

interface Spec {
  command: string;
  tamper: { file: string; find: string; replace: string; expect_line: string };
}

const HERE = import.meta.dirname;
const verbose = process.argv.includes('--verbose');
const dirs = readdirSync(HERE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();
const spec = (dir: string): Spec => JSON.parse(readFileSync(join(HERE, dir, 'demo.json'), 'utf8')) as Spec;

const results: string[][] = [];
let failed = 0;
for (const dir of dirs) {
  const { command } = spec(dir);
  const proves = readFileSync(join(HERE, dir, 'README.md'), 'utf8').match(/\*\*Proves:\*\*\s*(.+?\.)(\s|$)/)?.[1] ?? '';
  const started = Date.now();
  const run = spawnSync(process.execPath, ['--import', 'tsx', join(HERE, dir, 'run.ts')], { encoding: 'utf8' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (verbose) {
    heading(`npm run ${command}`);
    process.stdout.write(run.stdout ?? '');
  }
  if (run.status !== 0) {
    failed++;
    process.stderr.write(`\nnpm run ${command} exited ${run.status}:\n${`${run.stdout ?? ''}${run.stderr ?? ''}`.slice(-1500)}\n`);
  }
  results.push([command, run.status === 0 ? 'held' : `FAILED, exit ${run.status}`, `${seconds}s`, proves]);
}

heading(`${dirs.length} demos, each running the factory's own code`);
table([['command', 'result', 'time', 'proves'], ...results]);

heading('Break one');
for (const dir of ['01-contract', '06-attest'].filter((d) => dirs.includes(d))) {
  const { command, tamper } = spec(dir);
  line(`  In ${tamper.file}, change`);
  line(`    ${tamper.find}`);
  line('  to');
  line(`    ${tamper.replace}`);
  line(`  then run npm run ${command}. It refuses, printing: ${tamper.expect_line}`);
  line('');
}
line("Each demo's README carries its full output, what it stages, and what it does not prove.");

process.exit(failed ? 1 : 0);
