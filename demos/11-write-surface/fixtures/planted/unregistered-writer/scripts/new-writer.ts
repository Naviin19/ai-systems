// PLANTED: writes to disk and sits on no registry row and no allowlisted path.
import { appendFileSync } from 'node:fs';
export const log = (target: string, line: string): void => appendFileSync(target, line);
