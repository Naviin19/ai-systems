// Dispatch: the upstream handoff is placed in the prompt as SEED_STATE. Every free-text key in it reaches the model.
import { readFileSync } from 'node:fs';
export const seedState = (runId: string, upstream: string): string =>
  `## SEED_STATE\n${readFileSync(`verification/runs/${runId}/${upstream}/handoff.json`, 'utf8')}`;
