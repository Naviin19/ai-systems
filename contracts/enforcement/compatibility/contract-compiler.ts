// Extracted from the factory repository (skill-ecosystem, private),
// contracts/enforcement/compatibility/contract-compiler.ts at d490466, on 2026-09-14.
// Changed on extraction:
//   - the CLI section at the end (its self-test, the report printer and the `require.main` guard) is removed: this repository runs as ES modules, and demos/01-contract/run.ts is the entry point

/**
 * contract-compiler.ts — typed seams over today's agent graph ([AIS4-1], decision D7).
 *
 * For every dependsOn edge in configs/agent-*.config.ts, the producer's schema is the real HandoffEnvelopeSchema
 * variant for its outboundBoundary, and the consumer's reads come from edge-registry.ts. Each read is checked
 * by structural subtyping: the producer must guarantee the field, at a type the consumer can accept. A
 * mismatch names the field path, the type expected and the type received, and the playbook line behind it.
 *
 * Before [AIS4-1] this compared field NAMES on fourteen hand-copied producer "outputs". A real agent's
 * contract could change type, or lose a field, and every edge still compiled.
 *
 * It also lints the step files: every jq or node read of an agent's handoff.json must resolve against that
 * agent's real envelope, and a pre-flight's `.handoff_boundary == "X"` must name the boundary the agent
 * emits. That lint is what found every build agent reading a `.status` and `.confidence` the envelope has
 * never had.
 *
 * Run as: npx tsx contracts/enforcement/compatibility/contract-compiler.ts [--json | --self-test]
 * Wired into: npm test, and verify-all gate R31 (--self-test, then the compiler).
 * The report is printed (--json for the whole of it), never written to a tracked file. The old compiler
 * rewrote a timestamped contracts/compatibility-report.json on every npm test, so the file only ever
 * recorded when the tests last ran.
 * Exit: 0 compatible, 1 a mismatch, an unresolved read, or an undeclared or stale edge, 2 could not run.
 */

import { z } from "zod";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { HandoffEnvelopeSchema } from "../../types/operational/handoff-envelope";
import { EDGE_DECLARATIONS, type EdgeDeclaration } from "../edge-registry";
import { loadAgentGraph, type AgentNode } from "../agent-graph";

export interface Mismatch {
  path: string;
  expected: string;
  received: string;
  reason: string;
  evidence?: string;
}

export interface EdgeReport {
  id: string;
  producer: string;
  consumer: string;
  boundary: string;
  reads: number;
  mismatches: Mismatch[];
}

export interface StepFileRead {
  /** "<step file>:<line>" */
  at: string;
  consumer: string;
  producer: string;
  path: string;
  resolved: boolean;
  note?: string;
}

export interface CompatibilityReport {
  total_edges: number;
  compatible_edges: number;
  incompatible_edges: number;
  edges: EdgeReport[];
  step_file_reads: StepFileRead[];
  undeclared_edges: string[];
  stale_declarations: string[];
  compatible: boolean;
}

export interface CompileOptions {
  graph?: AgentNode[];
  declarations?: EdgeDeclaration[];
  /** The producer schema for a boundary. Defaults to the real HandoffEnvelopeSchema variant. */
  producerSchema?: (boundary: string) => z.ZodType | undefined;
  stepsDir?: string;
}

// ─── Zod introspection (zod v4) ───────────────────────────

type Def = { type: string } & Record<string, any>;
const defOf = (s: z.ZodType): Def => (s as any)._zod.def as Def;

function unwrap(s: z.ZodType): { schema: z.ZodType; optional: boolean; nullable: boolean } {
  let schema = s;
  let optional = false;
  let nullable = false;
  for (let guard = 0; guard < 20; guard++) {
    const d = defOf(schema);
    if (d.type === "optional") { optional = true; schema = d.innerType; }
    else if (d.type === "nullable") { nullable = true; schema = d.innerType; }
    else if (d.type === "default" || d.type === "prefault" || d.type === "readonly" || d.type === "catch" || d.type === "nonoptional") { schema = d.innerType; }
    else if (d.type === "pipe") { schema = d.in; }
    else if (d.type === "lazy") { schema = d.getter(); }
    else break;
  }
  return { schema, optional, nullable };
}

function describe(s: z.ZodType): string {
  const u = unwrap(s);
  const d = defOf(u.schema);
  let base: string;
  switch (d.type) {
    case "array": base = `array<${describe(d.element)}>`; break;
    case "object": base = `object{${Object.keys(d.shape).join(", ")}}`; break;
    case "record": base = `record<${describe(d.valueType)}>`; break;
    case "enum": base = `enum(${Object.values(d.entries).join("|")})`; break;
    case "literal": base = `literal(${(d.values as unknown[]).map(String).join("|")})`; break;
    case "union": base = (d.options as z.ZodType[]).map(describe).join(" | "); break;
    default: base = d.type;
  }
  return `${u.optional ? "optional " : ""}${u.nullable ? "nullable " : ""}${base}`;
}

const joinPath = (path: string, key: string): string => (path ? `${path}.${key}` : key);

/** Structural subtyping: may a value of the producer's schema (received) be read as the consumer's (expected)? */
export function checkSubtype(expected: z.ZodType, received: z.ZodType | undefined, path: string): Mismatch[] {
  const at = path || "(root)";
  if (!received) return [{ path: at, expected: describe(expected), received: "absent", reason: "the producer's schema has no field here" }];
  const e = unwrap(expected);
  const r = unwrap(received);
  const mismatch = (reason: string): Mismatch => ({ path: at, expected: describe(expected), received: describe(received), reason });
  const out: Mismatch[] = [];
  if (r.optional && !e.optional) out.push(mismatch("the producer may omit it"));
  if (r.nullable && !e.nullable) out.push(mismatch("the producer may send null"));

  const ed = defOf(e.schema);
  const rd = defOf(r.schema);
  if (ed.type === "unknown" || ed.type === "any") return out;
  if (rd.type === "unknown" || rd.type === "any") return [...out, mismatch("the producer does not constrain it")];
  if (rd.type === "union") {
    for (const option of rd.options as z.ZodType[]) {
      const m = checkSubtype(e.schema, option, path);
      if (m.length) return [...out, ...m.map((x) => ({ ...x, reason: `one of the producer's variants: ${x.reason}` }))];
    }
    return out;
  }
  if (ed.type === "union") {
    return (ed.options as z.ZodType[]).some((o) => checkSubtype(o, r.schema, path).length === 0) ? out : [...out, mismatch("it matches none of the types the consumer accepts")];
  }

  const literalValues = (d: Def): unknown[] => (d.type === "literal" ? (d.values as unknown[]) : d.type === "enum" ? Object.values(d.entries) : []);
  switch (ed.type) {
    case "string":
      if (rd.type === "string" || ((rd.type === "enum" || rd.type === "literal") && literalValues(rd).every((v) => typeof v === "string"))) return out;
      break;
    case "number":
      if (rd.type === "number" || (rd.type === "literal" && literalValues(rd).every((v) => typeof v === "number"))) return out;
      break;
    case "boolean":
      if (rd.type === "boolean" || (rd.type === "literal" && literalValues(rd).every((v) => typeof v === "boolean"))) return out;
      break;
    case "literal":
    case "enum": {
      const allowed = literalValues(ed);
      if (rd.type === "literal" || rd.type === "enum") {
        const extra = literalValues(rd).filter((v) => !allowed.includes(v));
        return extra.length ? [...out, mismatch(`the producer may also send ${extra.map(String).join(", ")}`)] : out;
      }
      return [...out, mismatch(`the producer does not restrict it to ${allowed.map(String).join(", ")}`)];
    }
    case "array":
      if (rd.type === "array") return [...out, ...checkSubtype(ed.element, rd.element, `${path}[]`)];
      break;
    case "object":
      if (rd.type === "object") {
        for (const [key, value] of Object.entries(ed.shape as Record<string, z.ZodType>)) out.push(...checkSubtype(value, (rd.shape as Record<string, z.ZodType>)[key], joinPath(path, key)));
        return out;
      }
      if (rd.type === "record") {
        for (const [key, value] of Object.entries(ed.shape as Record<string, z.ZodType>)) {
          if (unwrap(value).optional) continue;
          out.push({ path: joinPath(path, key), expected: describe(value), received: describe(r.schema), reason: "the producer's record does not guarantee this key" });
        }
        return out;
      }
      break;
    case "record":
      if (rd.type === "record") return [...out, ...checkSubtype(ed.valueType, rd.valueType, `${path}.*`)];
      if (rd.type === "object") {
        for (const [key, value] of Object.entries(rd.shape as Record<string, z.ZodType>)) out.push(...checkSubtype(ed.valueType, value, joinPath(path, key)));
        return out;
      }
      break;
    default:
      if (ed.type === rd.type) return out;
  }
  return [...out, mismatch("a different type")];
}

/** The schema at a handoff path, and whether anything along the way may be absent. */
function resolvePath(schema: z.ZodType, path: string): { schema: z.ZodType; optional: boolean } | undefined {
  let current = schema;
  let optional = false;
  const tokens = path.replace(/\[\d*\]/g, ".[]").split(".").filter(Boolean);
  for (const token of tokens) {
    const u = unwrap(current);
    optional = optional || u.optional;
    const d = defOf(u.schema);
    if (token === "[]") {
      if (d.type !== "array") return undefined;
      current = d.element;
    } else if (d.type === "object") {
      const next = (d.shape as Record<string, z.ZodType>)[token];
      if (!next) return undefined;
      current = next;
    } else if (d.type === "record") {
      current = d.valueType;
      optional = true;
    } else if (d.type === "union") {
      const found = (d.options as z.ZodType[]).map((o) => resolvePath(o, token)).filter((x): x is { schema: z.ZodType; optional: boolean } => !!x);
      if (!found.length) return undefined;
      current = found[0].schema;
      optional = optional || found.length < (d.options as z.ZodType[]).length || found[0].optional;
    } else if (d.type === "unknown" || d.type === "any") {
      return { schema: z.unknown(), optional: true };
    } else {
      return undefined;
    }
  }
  const last = unwrap(current);
  return { schema: current, optional: optional || last.optional };
}

/** The real HandoffEnvelopeSchema variant an agent emits for a boundary literal. */
export function boundaryVariant(boundary: string): z.ZodType | undefined {
  for (const option of (HandoffEnvelopeSchema as unknown as { options: z.ZodType[] }).options) {
    const literal = defOf(defOf(option).shape.handoff_boundary as z.ZodType).values?.[0];
    if (literal === boundary) return option;
  }
  return undefined;
}

// ─── Step-file read lint ──────────────────────────────────

const HANDOFF = /(?:\.\/)?verification\/runs\/latest\/(agent-[A-Za-z0-9-]+?)\/handoff\.json/;
const NOT_A_FIELD = new Set(["length", "forEach", "map", "filter", "includes", "some", "every", "join", "slice", "toString", "keys", "values"]);

function targetAgent(token: string, shellVars: Map<string, string>): string | undefined {
  const literal = token.match(HANDOFF);
  if (literal) return literal[1];
  const variable = token.match(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/);
  return variable ? shellVars.get(variable[1]) : undefined;
}

function chainPath(chain: string): string {
  const keys = chain.replace(/\?/g, "").split(".").filter(Boolean);
  while (keys.length && NOT_A_FIELD.has(keys[keys.length - 1])) keys.pop();
  return keys.join(".");
}

/** Paths a jq filter reads, and the boundary literal it compares, if any. */
function jqReads(filter: string): Array<{ path: string; boundary?: string }> {
  const reads: Array<{ path: string; boundary?: string }> = [];
  for (const alternative of filter.split("//").map((a) => a.trim())) {
    const boundary = alternative.match(/^\.handoff_boundary\s*==\s*"([A-Z_]+)"/);
    if (boundary) { reads.push({ path: "handoff_boundary", boundary: boundary[1] }); continue; }
    const leading = alternative.match(/^\.([A-Za-z_]\w*(?:\??\.[A-Za-z_]\w*)*)/);
    const has = alternative.match(/has\("([A-Za-z_]\w*)"\)/);
    if (leading) reads.push({ path: chainPath(leading[1]) });
    if (has) reads.push({ path: leading && /\.\[\d*\]\s*\|/.test(alternative) ? `${chainPath(leading[1])}[].${has[1]}` : has[1] });
  }
  return reads.filter((r) => r.path);
}

export async function lintStepFileReads(o: {
  stepsDir?: string;
  graph?: AgentNode[];
  producerSchema?: (boundary: string) => z.ZodType | undefined;
} = {}): Promise<StepFileRead[]> {
  const stepsDir = o.stepsDir ?? join("templates", "playbooks", "steps");
  const graph = o.graph ?? (await loadAgentGraph());
  const producerSchema = o.producerSchema ?? boundaryVariant;
  const byKey = new Map(graph.map((n) => [n.key, n]));
  const reads: StepFileRead[] = [];
  if (!existsSync(stepsDir)) return reads;

  for (const file of readdirSync(stepsDir).filter((f) => f.endsWith("-steps.md")).sort()) {
    const consumer = file.replace(/-steps\.md$/, "");
    const shellVars = new Map<string, string>();
    const jsVars = new Map<string, { agent: string; prefix: string }>();
    const lines = readFileSync(join(stepsDir, file), "utf8").split(/\r?\n/);
    const record = (lineIndex: number, agent: string, path: string, boundary?: string): void => {
      const producer = byKey.get(agent);
      const at = `${join(stepsDir, file).replace(/\\/g, "/")}:${lineIndex + 1}`;
      if (!producer) { reads.push({ at, consumer, producer: agent, path, resolved: false, note: "no agent in the graph has this run directory" }); return; }
      const schema = producerSchema(producer.outboundBoundary);
      if (boundary !== undefined) {
        reads.push({ at, consumer, producer: agent, path, resolved: boundary === producer.outboundBoundary, ...(boundary === producer.outboundBoundary ? {} : { note: `${agent} emits ${producer.outboundBoundary}, not ${boundary}` }) });
        return;
      }
      const found = schema ? resolvePath(schema, path) : undefined;
      reads.push({ at, consumer, producer: agent, path, resolved: !!found, ...(found ? {} : { note: `${producer.outboundBoundary} has no ${path}` }) });
    };

    lines.forEach((line, i) => {
      const assign = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=["']?(?:\.\/)?verification\/runs\/latest\/(agent-[A-Za-z0-9-]+?)\/handoff\.json/);
      if (assign) shellVars.set(assign[1], assign[2]);

      for (const m of line.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(([^)]*)\)\s*(?=[;,\n]|$)/g)) {
        const agent = targetAgent(m[2], shellVars);
        if (agent) jsVars.set(m[1], { agent, prefix: "" });
      }
      for (const m of line.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)((?:\??\.[A-Za-z_]\w*)+)\s*(?=[;,)\n]|$)/g)) {
        const base = jsVars.get(m[2]);
        if (base) jsVars.set(m[1], { agent: base.agent, prefix: joinPath(base.prefix, chainPath(m[3])) });
      }
      for (const m of line.matchAll(/require\(([^)]*)\)((?:\??\.[A-Za-z_]\w*)+)/g)) {
        const agent = targetAgent(m[1], shellVars);
        const path = chainPath(m[2]);
        if (agent && path) record(i, agent, path);
      }
      for (const [name, v] of jsVars) {
        const escaped = name.replace(/\$/g, "\\$");
        for (const m of line.matchAll(new RegExp(`(?<![\\w$.])${escaped}((?:\\??\\.[A-Za-z_]\\w*)+)`, "g"))) {
          if (line.slice(0, m.index).match(new RegExp(`(?:const|let|var)\\s+${escaped}\\s*=\\s*$`))) continue;
          const path = joinPath(v.prefix, chainPath(m[1]));
          if (path) record(i, v.agent, path);
        }
      }
      for (const m of line.matchAll(/\bjq\b((?:\s+-{1,2}[A-Za-z-]+)*)\s+('[^']*'|"(?:[^"\\]|\\.)*"|[^\s'"|;&]+)\s+("[^"]*"|'[^']*'|[^\s|;&)]+)/g)) {
        const agent = targetAgent(m[3], shellVars);
        if (!agent) continue;
        const filter = m[2].replace(/^['"]|['"]$/g, "");
        for (const r of jqReads(filter)) record(i, agent, r.path, r.boundary);
      }
    });
  }
  return reads;
}

// ─── The compiler ─────────────────────────────────────────

export async function compileContracts(opts: CompileOptions = {}): Promise<CompatibilityReport> {
  const graph = opts.graph ?? (await loadAgentGraph());
  const declarations = opts.declarations ?? EDGE_DECLARATIONS;
  const producerSchema = opts.producerSchema ?? boundaryVariant;
  const byKey = new Map(graph.map((n) => [n.key, n]));
  const declared = new Map(declarations.map((d) => [`${d.producer}->${d.consumer}`, d]));
  const inGraph = new Set<string>();
  const undeclared: string[] = [];
  const edges: EdgeReport[] = [];

  for (const node of graph) {
    for (const dep of node.dependsOn) {
      const id = `${dep}->${node.key}`;
      inGraph.add(id);
      const producer = byKey.get(dep);
      const boundary = producer?.outboundBoundary ?? "(unknown)";
      const schema = producer ? producerSchema(boundary) : undefined;
      const declaration = declared.get(id);
      const mismatches: Mismatch[] = [];
      if (!producer) mismatches.push({ path: "(edge)", expected: `an agent named ${dep}`, received: "absent", reason: "the dependency names no agent in the graph" });
      else if (!schema) mismatches.push({ path: "(envelope)", expected: `a HandoffEnvelopeSchema variant for ${boundary}`, received: "absent", reason: "the producer's boundary has no envelope variant" });
      if (!declaration) undeclared.push(id);
      for (const read of declaration?.reads ?? []) {
        const [file, text] = read.evidence.split(" :: ");
        if (!text || !existsSync(file) || !readFileSync(file, "utf8").includes(text)) {
          mismatches.push({ path: read.path, expected: "a read its consumer's playbook still makes", received: `no "${text}" in ${file}`, reason: "the evidence for this read has left the step file", evidence: read.evidence });
        }
        if (!schema) continue;
        const found = resolvePath(schema, read.path);
        const received = found ? (found.optional ? found.schema.optional() : found.schema) : undefined;
        for (const m of checkSubtype(read.expects, received, read.path)) mismatches.push({ ...m, evidence: read.evidence });
      }
      edges.push({ id, producer: dep, consumer: node.key, boundary, reads: declaration?.reads.length ?? 0, mismatches });
    }
  }

  const stale = [...declared.keys()].filter((id) => !inGraph.has(id));
  const step_file_reads = await lintStepFileReads({ stepsDir: opts.stepsDir, graph, producerSchema });
  const compatibleEdges = edges.filter((e) => e.mismatches.length === 0).length;
  return {
    total_edges: edges.length,
    compatible_edges: compatibleEdges,
    incompatible_edges: edges.length - compatibleEdges,
    edges,
    step_file_reads,
    undeclared_edges: undeclared,
    stale_declarations: stale,
    compatible: compatibleEdges === edges.length && undeclared.length === 0 && stale.length === 0 && step_file_reads.every((r) => r.resolved),
  };
}
