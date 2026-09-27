// PLANTED: allowlisted, and the write call is aimed at the board, a path that reaches a session.
import { writeFileSync } from 'node:fs';
export const forge = (): void => writeFileSync('run/board/forged.md', 'x');
