// Writes the gate's own report. Nothing reads it back into a prompt.
import { writeFileSync } from 'node:fs';
export const report = (out: string, findings: unknown[]): void => writeFileSync(out, JSON.stringify({ findings }, null, 2));
