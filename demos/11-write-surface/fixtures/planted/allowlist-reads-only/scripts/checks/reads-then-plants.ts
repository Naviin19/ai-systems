// PLANTED NEGATIVE: only READS the board and writes a temp copy. Must be left alone.
import { readFileSync, writeFileSync } from 'node:fs';
export const plant = (tmpCopy: string): void => {
  const note = readFileSync('run/board/note.md', 'utf8');
  writeFileSync(tmpCopy, note.replace('a', 'b'));
};
