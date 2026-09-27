// Emits an agent's handoff envelope. The next agent's dispatch reads it into that agent's prompt.
import { writeFileSync } from 'node:fs';
export const emit = (runId: string, agentId: string, envelope: unknown): void =>
  writeFileSync(`verification/runs/${runId}/${agentId}/handoff.json`, JSON.stringify(envelope, null, 2));
