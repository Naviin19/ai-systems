// Allowlisted: reads a real note and plants an altered copy in a temp directory. The write is scratch.
import { readFileSync, writeFileSync } from 'node:fs';
export const plant = (tmpCopy: string): void => {
  const note = readFileSync('run/board/note.md', 'utf8');
  writeFileSync(tmpCopy, note.replace('a', 'b'));
};
