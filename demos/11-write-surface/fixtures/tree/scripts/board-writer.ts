// Writes one note per agent to the board. The brief reads the board back into the next session's context.
import { writeFileSync } from 'node:fs';
const BOARD = 'run/board';
export const post = (agentId: string, text: string): void => writeFileSync(`${BOARD}/${agentId}.md`, text);
