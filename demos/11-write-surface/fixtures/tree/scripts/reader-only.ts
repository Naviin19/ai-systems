// Reads only. writeFileSync( appears in this file in a comment and nowhere else.
import { readFileSync } from 'node:fs';
export const read = (p: string): string => readFileSync(p, 'utf8');
