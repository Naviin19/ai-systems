// Extracted from the factory repository (skill-ecosystem, private),
// contracts/enforcement/agent-graph.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * agent-graph.ts — [AIS4-1] today's agent graph, read from configs/agent-*.config.ts.
 *
 * The contract compiler checks the seams of the graph the orchestrator actually schedules, never a copy of
 * it. Each node carries its outbound boundary, which names the HandoffEnvelopeSchema variant it emits, and
 * its dependencies, which name the handoffs it reads.
 *
 * Nodes are keyed the way run directories and step files are named: "agent-03c" for the numbered build
 * agents, and the full name ("agent-research-reader") for the rest.
 */

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface AgentNode {
  id: string;
  key: string;
  dependsOn: string[];
  outboundBoundary: string;
}

/** "product.agent-03c-synthesis" → "agent-03c"; "product.agent-research-reader" → "agent-research-reader". */
export function agentKey(configId: string): string {
  const bare = configId.replace(/^[^.]*\./, "");
  const numbered = bare.match(/^(agent-\d{2}[a-z]?)-/);
  return numbered ? numbered[1] : bare;
}

export async function loadAgentGraph(product = "contract-compiler", configsDir = "configs"): Promise<AgentNode[]> {
  if (!existsSync(configsDir)) return [];
  const nodes: AgentNode[] = [];
  for (const file of readdirSync(configsDir).filter((f) => /^agent-.*\.config\.ts$/.test(f)).sort()) {
    const mod = (await import(pathToFileURL(resolve(configsDir, file)).href)) as Record<string, unknown>;
    const factory = Object.values(mod).find((v) => typeof v === "function" && /create.*Config/i.test((v as { name: string }).name)) as
      | ((p: string) => { id: string; dependsOn: string[]; outboundBoundary: string })
      | undefined;
    if (!factory) continue;
    const config = factory(product);
    nodes.push({
      id: config.id,
      key: agentKey(config.id),
      dependsOn: config.dependsOn.map(agentKey),
      outboundBoundary: String(config.outboundBoundary),
    });
  }
  return nodes;
}
