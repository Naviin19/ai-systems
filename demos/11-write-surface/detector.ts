// The detector, reduced from the factory's scripts/detect-unregistered-write-surfaces.mjs. Node built-ins only.
//
// The registry holds one row per SURFACE: a persistent place more than one agent can write and later read. Four
// checks hold the registry to the tree:
//   1. write sites   — every file that calls a filesystem write is named by a row's writers[] or sits under an
//                      allowlisted path
//   2. anchors       — a row that reaches a prompt or a session names, for each writer and reader, a string found
//                      IN THAT FILE; a mention in some other file does not count
//   3. allowlist     — an allowlisted file whose write call is AIMED at a path that reaches a prompt must be listed
//                      on that row; allowlisting a tree excuses its scratch files, never a path into a prompt
//   4. envelope keys — every top-level handoff key that carries free text is declared at the schema's own count,
//                      so a new key fails and so does a declaration that has gone stale
import { existsSync, readFileSync, readdirSync } from 'node:fs';

export interface Writer { file: string; anchor?: string }
export interface ReadBack { reader_file: string; anchor?: string; reaches: string }
export interface NamedBy { file: string; role: string; reason: string }
export interface Surface {
  id: string;
  path_pattern: string;
  path_literals?: string[];
  writers: Writer[];
  written_by?: string;
  read_back: ReadBack[];
  content: string;
  integrity: string;
  tamper_evident: boolean;
  watched_by: string[];
  channel_class: string;
  named_by?: NamedBy[];
}
export interface Registry {
  _schema_version: string;
  scan_trees: string[];
  allowlist: Array<{ path: string; reason: string }>;
  surfaces: Surface[];
  envelope_free_text: {
    schema: string;
    keys: Record<string, { count: number; channel_class: string; note?: string }>;
    boundary_payload: { per_boundary: Record<string, number> };
  };
}
export type Check = 'write-site' | 'anchor' | 'allowlist-hides-channel' | 'envelope-free-text';
export interface Finding { check: Check; file?: string; surface?: string; detail: string }
export interface Census { variants: number; keys: Record<string, number>; per_boundary: Record<string, number> }
export interface Coverage { file: string; writeCalls: number; rows: string[]; allowlisted: string | null }
export interface Inspection { findings: Finding[]; scanned: string[]; writing: string[]; coverage: Coverage[]; census: Census }
// JSON Schema nodes are walked structurally; their shape is whatever the generator emitted.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SchemaNode = any;

const REACHES = ['agent_prompt', 'session_context', 'human_only', 'none'];
export const REACHING = new Set(['agent_prompt', 'session_context']);
const CONTENT = ['free_text', 'schema_shape_free_content', 'schema_constrained'];
const INTEGRITY = ['append_only_enforced', 'append_only_convention', 'write_once', 'overwritable'];
const CHANNEL_CLASS = ['sanctioned_agent_to_agent', 'sanctioned_agent_to_operator', 'sanctioned_operator_to_agent', 'machine', 'unsanctioned_observed'];
const NAMED_ROLES = ['reads_only', 'plants_in_temp', 'historical_writer'];
const MIN_REASON = 12;
const SCAN_EXTENSIONS = new Set(['.ts', '.js', '.mjs']);

// A write call. The sync names are unambiguous. The promise names are common words, so they count only behind an
// fs-like receiver, or bare in a file that imports them from fs/promises.
const SYNC_WRITE = /\b(writeFileSync|appendFileSync|renameSync|copyFileSync|cpSync|createWriteStream)\s*\(/;
const RECEIVER_WRITE = /\b(?:fs|fsp|fsPromises|promises)\s*\.\s*(writeFile|appendFile|rename|copyFile|cp)\s*\(/;
const BARE_PROMISE_WRITE = /(?<![.\w])(writeFile|appendFile|copyFile)\s*\(/;
const IMPORTS_FS_PROMISES = /['"](?:node:)?fs\/promises['"]/;

// Comment lines are dropped by line, never with a block-comment expression: that would read the slash-star inside
// a glob string as a comment opener and strip real code after it.
const codeLines = (text: string): string[] => text.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));

export const writeCallsIn = (text: string): number => {
  const barePromise = IMPORTS_FS_PROMISES.test(text);
  return codeLines(text).filter((l) => SYNC_WRITE.test(l) || RECEIVER_WRITE.test(l) || (barePromise && BARE_PROMISE_WRITE.test(l))).length;
};

export const walk = (dir: string, out: string[] = []): string[] => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, out);
    else if (SCAN_EXTENSIONS.has(e.name.slice(e.name.lastIndexOf('.')))) out.push(p);
  }
  return out;
};

// Exact file, a directory (trailing slash), or a name with `*` inside one segment. Never a bare prefix:
// "scripts/checks/" must not cover "scripts/checks-and-balances.ts".
export const pathMatches = (pattern: string, rel: string): boolean => {
  if (pattern.endsWith('/')) return rel.startsWith(pattern);
  if (!pattern.includes('*')) return rel === pattern;
  const re = new RegExp(`^${pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);
  return re.test(rel);
};

// Check 3's reading of one file: which of `literals` can be a write call's DESTINATION. Only the destination argument
// is read: the first, or the second for the calls that take a source first. What is written is not where it is
// written, so a note read from run/board and saved to a temp copy is left alone. A literal counts when it sits in
// that argument, or when an identifier declared from it does. Declarations are followed to a fixed point; an
// identifier declared from a READ of the path holds content and is skipped.
const DECL = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+?)?=\s*(.+)$/;
const HOLDS_CONTENT = /\b(?:readFileSync|readFile|readdirSync|readdir|JSON\.parse)\s*\(/;
const SOURCE_FIRST = /^(?:renameSync|rename|copyFileSync|copyFile|cpSync|cp)$/;

// The top-level arguments of the call whose opening parenthesis is at `open`. Quotes and nesting are tracked well
// enough for argument boundaries; this is not a parser.
const callArguments = (src: string, open: number): string[] => {
  const args: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === '\\') cur += src[++i] ?? '';
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) { args.push(cur); return args; }
      depth--;
    }
    if (c === ',' && depth === 0) { args.push(cur); cur = ''; continue; }
    cur += c;
  }
  args.push(cur);
  return args;
};

export const destinationLiterals = (text: string, literals: string[]): string[] => {
  const lines = codeLines(text);
  const barePromise = IMPORTS_FS_PROMISES.test(text);
  const word = (id: string) => new RegExp(`(?<![\\w$.])${id.replace(/[$]/g, '\\$')}(?![\\w$])`);
  const tainted = new Map<string, string>(); // identifier -> the literal it was declared from
  for (let changed = true; changed;) {
    changed = false;
    for (const l of lines) {
      const m = l.match(DECL);
      if (!m || tainted.has(m[1]) || HOLDS_CONTENT.test(m[2])) continue;
      const lit = literals.find((x) => m[2].includes(x)) ?? [...tainted.entries()].find(([id]) => word(id).test(m[2]))?.[1];
      if (lit) { tainted.set(m[1], lit); changed = true; }
    }
  }
  const hit = new Set<string>();
  const code = lines.join('\n');
  const calls = [new RegExp(SYNC_WRITE.source, 'g'), new RegExp(RECEIVER_WRITE.source, 'g'), ...(barePromise ? [new RegExp(BARE_PROMISE_WRITE.source, 'g')] : [])];
  for (const re of calls) {
    for (let m = re.exec(code); m !== null; m = re.exec(code)) {
      const name = m[1];
      const args = callArguments(code, m.index + m[0].length - 1);
      const dest = (SOURCE_FIRST.test(name) ? args[1] : args[0]) ?? '';
      for (const x of literals) if (dest.includes(x)) hit.add(x);
      for (const [id, lit] of tainted) if (word(id).test(dest)) hit.add(lit);
    }
  }
  return [...hit];
};

// The registry, validated here and nowhere else: a second validator would be a second definition of the same shape.
export const validateRegistry = (reg: Registry): string[] => {
  const p: string[] = [];
  const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
  if (!reg || typeof reg !== 'object' || Array.isArray(reg)) return ['the registry is not a JSON object'];
  if (!str(reg._schema_version)) p.push('_schema_version is missing');
  if (!Array.isArray(reg.scan_trees) || !reg.scan_trees.length || !reg.scan_trees.every(str)) p.push('scan_trees must be a non-empty array of paths');
  if (!Array.isArray(reg.allowlist)) p.push('allowlist must be an array');
  else reg.allowlist.forEach((a, i) => {
    if (!a || !str(a.path)) p.push(`allowlist[${i}] has no path`);
    if (!a || !str(a.reason) || a.reason.trim().length < MIN_REASON) p.push(`allowlist[${i}] (${a?.path ?? '?'}) has no reason; every allowlist entry says why, in at least ${MIN_REASON} characters`);
  });
  if (!Array.isArray(reg.surfaces) || !reg.surfaces.length) p.push('surfaces must be a non-empty array');
  else {
    const ids = new Set<string>();
    reg.surfaces.forEach((s, i) => {
      const at = `surfaces[${i}] (${s?.id ?? '?'})`;
      if (!s || typeof s !== 'object') { p.push(`${at} is not an object`); return; }
      if (!str(s.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)) p.push(`${at}: id must be kebab-case`);
      else if (ids.has(s.id)) p.push(`${at}: duplicate id`);
      else ids.add(s.id);
      if (!str(s.path_pattern)) p.push(`${at}: path_pattern is missing`);
      if (!CONTENT.includes(s.content)) p.push(`${at}: content "${s.content}" is not one of ${CONTENT.join(', ')}`);
      if (!INTEGRITY.includes(s.integrity)) p.push(`${at}: integrity "${s.integrity}" is not one of ${INTEGRITY.join(', ')}`);
      if (!CHANNEL_CLASS.includes(s.channel_class)) p.push(`${at}: channel_class "${s.channel_class}" is not one of ${CHANNEL_CLASS.join(', ')}`);
      if (typeof s.tamper_evident !== 'boolean') p.push(`${at}: tamper_evident must be true or false: would a rewrite by another process be noticed by anything?`);
      if (!Array.isArray(s.watched_by) || !s.watched_by.every(str)) p.push(`${at}: watched_by must be an array of names; an unwatched surface says so with []`);
      if (!Array.isArray(s.read_back)) p.push(`${at}: read_back must be an array; a surface nothing reads back says so with []`);
      if (!Array.isArray(s.writers)) p.push(`${at}: writers must be an array`);
      const reaching = Array.isArray(s.read_back) && s.read_back.some((r) => REACHING.has(r?.reaches));
      (Array.isArray(s.read_back) ? s.read_back : []).forEach((r, j) => {
        if (!r || !str(r.reader_file)) p.push(`${at}: read_back[${j}] has no reader_file`);
        if (!r || !REACHES.includes(r.reaches)) p.push(`${at}: read_back[${j}].reaches "${r?.reaches}" is not one of ${REACHES.join(', ')}`);
        if (r && REACHING.has(r.reaches) && !str(r.anchor)) p.push(`${at}: read_back[${j}] reaches ${r.reaches} and names no anchor`);
      });
      (Array.isArray(s.writers) ? s.writers : []).forEach((w, j) => {
        if (!w || !str(w.file)) p.push(`${at}: writers[${j}] has no file`);
        if (reaching && w && !str(w.anchor)) p.push(`${at}: reaches an agent or a session, and writers[${j}] (${w.file ?? '?'}) names no anchor`);
      });
      if (Array.isArray(s.writers) && !s.writers.length && !str(s.written_by)) p.push(`${at}: no writers and no written_by; a surface written by hand, or by nothing found, says so in written_by`);
      if (reaching && (!Array.isArray(s.path_literals) || !s.path_literals.length || !s.path_literals.every(str))) p.push(`${at}: reaches an agent or a session, and names no path_literals for the allowlist check`);
      (Array.isArray(s.named_by) ? s.named_by : []).forEach((n, j) => {
        if (!n || !str(n.file)) p.push(`${at}: named_by[${j}] has no file`);
        if (!n || !NAMED_ROLES.includes(n.role)) p.push(`${at}: named_by[${j}].role "${n?.role}" is not one of ${NAMED_ROLES.join(', ')}`);
        if (!n || !str(n.reason) || n.reason.trim().length < MIN_REASON) p.push(`${at}: named_by[${j}] (${n?.file ?? '?'}) has no reason`);
      });
    });
  }
  const eft = reg.envelope_free_text;
  if (!eft || typeof eft !== 'object') p.push('envelope_free_text is missing');
  else {
    if (!str(eft.schema)) p.push('envelope_free_text.schema is missing');
    if (!eft.keys || typeof eft.keys !== 'object') p.push('envelope_free_text.keys is missing');
    else for (const [k, v] of Object.entries(eft.keys)) {
      if (!v || !Number.isInteger(v.count) || v.count < 0) p.push(`envelope_free_text.keys.${k}: count must be a whole number`);
      if (!v || !CHANNEL_CLASS.includes(v.channel_class)) p.push(`envelope_free_text.keys.${k}: channel_class "${v?.channel_class}" is not one of ${CHANNEL_CLASS.join(', ')}`);
    }
    if (!eft.boundary_payload || typeof eft.boundary_payload.per_boundary !== 'object') p.push('envelope_free_text.boundary_payload.per_boundary is missing');
    else for (const [b, n] of Object.entries(eft.boundary_payload.per_boundary)) if (!Number.isInteger(n) || n < 0) p.push(`envelope_free_text.boundary_payload.per_boundary.${b}: count must be a whole number`);
  }
  return p;
};

// Check 4's derivation: free-text leaves under each top-level key of each boundary variant. A string with no enum,
// const, format or pattern is free; a length cap does not make it less free. An open object carries anything.
export const freeLeaves = (node: SchemaNode, root: SchemaNode, seen = new Set<string>()): number => {
  if (!node || typeof node !== 'object') return 0;
  if (typeof node.$ref === 'string') {
    if (seen.has(node.$ref)) return 0;
    const target = node.$ref.replace(/^#\//, '').split('/').reduce((o: SchemaNode, k: string) => (o ? o[k.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), root);
    return freeLeaves(target, root, new Set([...seen, node.$ref]));
  }
  let n = 0;
  const types = Array.isArray(node.type) ? node.type : [node.type];
  if (types.includes('string') && !node.enum && node.const === undefined && !node.format && !node.pattern) n++;
  for (const k of ['anyOf', 'oneOf', 'allOf']) if (Array.isArray(node[k])) for (const c of node[k]) n += freeLeaves(c, root, seen);
  if (Array.isArray(node.prefixItems)) for (const c of node.prefixItems) n += freeLeaves(c, root, seen);
  if (node.items && typeof node.items === 'object') n += freeLeaves(node.items, root, seen);
  if (node.properties) for (const c of Object.values(node.properties)) n += freeLeaves(c, root, seen);
  const ap = node.additionalProperties;
  if (ap === true || (ap && typeof ap === 'object' && !Object.keys(ap).length)) n++;
  else if (ap && typeof ap === 'object') n += freeLeaves(ap, root, seen);
  return n;
};

export const envelopeCensus = (schema: SchemaNode): Census => {
  const variants: SchemaNode[] = schema.oneOf || schema.anyOf || [];
  const keys: Record<string, number> = {};
  const per_boundary: Record<string, number> = {};
  for (const v of variants) {
    const props = v.properties || {};
    const boundary: string = props.handoff_boundary?.const ?? '(no handoff_boundary const)';
    for (const [k, node] of Object.entries(props)) {
      const count = freeLeaves(node, schema);
      if (k === 'boundary_payload') per_boundary[boundary] = count;
      else keys[k] = Math.max(keys[k] ?? 0, count);
    }
  }
  for (const k of Object.keys(keys)) if (keys[k] === 0) delete keys[k];
  return { variants: variants.length, keys, per_boundary };
};

// The run. Everything reads under `root`, so the self-test can point it at a planted tree.
export const inspect = (root: string, reg: Registry, schema: SchemaNode): Inspection => {
  const findings: Finding[] = [];
  const read = (rel: string): string => readFileSync(`${root}/${rel}`, 'utf8');
  const scanned: string[] = [];
  for (const tree of reg.scan_trees) walk(`${root}/${tree}`, scanned);
  const rels = [...new Set(scanned.map((f) => f.slice(root.length + 1)))].sort();
  const calls = new Map(rels.map((rel) => [rel, writeCallsIn(read(rel))]));
  const writing = rels.filter((rel) => (calls.get(rel) ?? 0) > 0);

  const writerRows = (rel: string): Surface[] =>
    reg.surfaces.filter((s) => s.writers.some((w) => pathMatches(w.file, rel)) || (s.named_by ?? []).some((n) => n.role === 'historical_writer' && pathMatches(n.file, rel)));
  const allowEntry = (rel: string) => reg.allowlist.find((a) => pathMatches(a.path, rel));

  // 1. write sites
  const coverage: Coverage[] = [];
  for (const rel of writing) {
    const rows = writerRows(rel);
    const allow = allowEntry(rel);
    coverage.push({ file: rel, writeCalls: calls.get(rel) ?? 0, rows: rows.map((r) => r.id), allowlisted: allow ? allow.path : null });
    if (!rows.length && !allow) findings.push({ check: 'write-site', file: rel, detail: 'writes to disk and is named by no registry row and no allowlisted path; say which surface it writes and whether an agent reads it back' });
  }
  for (const s of reg.surfaces) for (const w of s.writers) {
    if (w.file.includes('*') || w.file.endsWith('/')) continue;
    if (!existsSync(`${root}/${w.file}`)) findings.push({ check: 'write-site', surface: s.id, file: w.file, detail: 'listed as a writer and is not on disk' });
    else if (rels.includes(w.file) && !writing.includes(w.file)) findings.push({ check: 'write-site', surface: s.id, file: w.file, detail: 'listed as a writer and holds no write call' });
  }

  // 2. anchors, read in the file the row names
  const anchorIn = (rel: string, anchor: string): boolean => existsSync(`${root}/${rel}`) && read(rel).includes(anchor);
  for (const s of reg.surfaces) {
    for (const w of s.writers) if (w.anchor && !w.file.includes('*') && !w.file.endsWith('/') && !anchorIn(w.file, w.anchor)) {
      findings.push({ check: 'anchor', surface: s.id, file: w.file, detail: `writer anchor ${JSON.stringify(w.anchor)} is not in ${w.file}` });
    }
    for (const r of s.read_back) if (r.anchor && !anchorIn(r.reader_file, r.anchor)) {
      findings.push({ check: 'anchor', surface: s.id, file: r.reader_file, detail: `reader anchor ${JSON.stringify(r.anchor)} is not in ${r.reader_file}` });
    }
  }

  // 3. an allowlisted tree cannot hide a channel
  const reachingRows = reg.surfaces.filter((s) => s.read_back.some((r) => REACHING.has(r.reaches)));
  for (const rel of writing) {
    if (!allowEntry(rel)) continue;
    const text = read(rel);
    for (const s of reachingRows) {
      const [literal] = destinationLiterals(text, s.path_literals ?? []);
      if (!literal) continue;
      const declared = s.writers.some((w) => pathMatches(w.file, rel)) || (s.named_by ?? []).some((n) => pathMatches(n.file, rel));
      if (!declared) findings.push({ check: 'allowlist-hides-channel', surface: s.id, file: rel, detail: `allowlisted, and a write call here can be aimed at ${JSON.stringify(literal)}, a path that reaches an agent or a session; list it on "${s.id}" as a writer, or under named_by with its role and a reason` });
    }
  }

  // 4. free-text handoff keys
  const census = envelopeCensus(schema);
  const declared = reg.envelope_free_text;
  for (const [k, n] of Object.entries(census.keys)) {
    const d = declared.keys[k];
    if (!d) findings.push({ check: 'envelope-free-text', detail: `handoff key "${k}" carries ${n} free-text leaf/leaves and is not declared; every such key is a channel into the next agent's prompt` });
    else if (d.count !== n) findings.push({ check: 'envelope-free-text', detail: `handoff key "${k}" is declared at ${d.count} free-text leaves and the schema has ${n}` });
  }
  for (const k of Object.keys(declared.keys)) if (!(k in census.keys)) findings.push({ check: 'envelope-free-text', detail: `handoff key "${k}" is declared and carries no free text in the schema; the declaration is stale` });
  for (const [b, n] of Object.entries(census.per_boundary)) {
    const d = declared.boundary_payload.per_boundary[b];
    if (d === undefined) findings.push({ check: 'envelope-free-text', detail: `boundary "${b}" is not declared; its payload carries ${n} free-text leaf/leaves` });
    else if (d !== n) findings.push({ check: 'envelope-free-text', detail: `boundary "${b}" payload is declared at ${d} free-text leaves and the schema has ${n}` });
  }
  for (const b of Object.keys(declared.boundary_payload.per_boundary)) if (!(b in census.per_boundary)) findings.push({ check: 'envelope-free-text', detail: `boundary "${b}" is declared and is not in the schema; the declaration is stale` });

  return { findings, scanned: rels, writing, coverage, census };
};
