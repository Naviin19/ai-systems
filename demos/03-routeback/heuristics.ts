// Extracted from the factory repository (skill-ecosystem, private),
// scripts/master-agentic-orchestrator.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - only HeuristicPattern, loadHeuristics and matchHeuristic are kept, with the node:fs import they need
//   - added: export on matchHeuristic

import { existsSync, readFileSync } from 'node:fs';

interface HeuristicPattern {
  id: string;
  category: string;
  pattern: string;
  fix: string;
  verify: string;
}

let HEURISTICS_CACHE: HeuristicPattern[] | null = null;
function loadHeuristics(): HeuristicPattern[] {
  if (HEURISTICS_CACHE) return HEURISTICS_CACHE;
  const path = "skills/operational/error-heuristics.json";
  if (!existsSync(path)) return (HEURISTICS_CACHE = []);
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as { patterns: HeuristicPattern[] };
    return (HEURISTICS_CACHE = raw.patterns || []);
  } catch { return (HEURISTICS_CACHE = []); }
}

export function matchHeuristic(errorText: string): HeuristicPattern | null {
  for (const p of loadHeuristics()) {
    try {
      if (new RegExp(p.pattern).test(errorText)) return p;
    } catch {}
  }
  return null;
}
