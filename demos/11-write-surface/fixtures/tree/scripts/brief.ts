// Session start: renders every board note into the context the session begins with, labelled "not evidence".
import { readdirSync, readFileSync } from 'node:fs';
const BOARD = 'run/board';
export const renderBoard = (): string =>
  readdirSync(BOARD).map((f) => `[not evidence] ${readFileSync(`${BOARD}/${f}`, 'utf8')}`).join('\n');
