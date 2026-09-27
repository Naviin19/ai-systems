// PLANTED: the same destination, reached through two declarations.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = 'run/board';
const FILE = join(DIR, 'forged.md');
export const forge = (): void => writeFileSync(FILE, 'x');
