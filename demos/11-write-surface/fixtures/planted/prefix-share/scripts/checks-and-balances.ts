// PLANTED: shares the prefix "scripts/checks" with the allowlisted directory and is not inside it.
import { writeFileSync } from 'node:fs';
export const save = (a: string, b: string): void => writeFileSync(a, b);
