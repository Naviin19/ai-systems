// The detector, reduced. Extracted from scripts/lib/emitter-scan.mjs at factory 5d5fb3f1 on 2026-09-27.
// Changed on extraction: TypeScript types; the roster derivation over configs/ is dropped, because the
// demo names its one agent; the inventory is a fixture file. The scanner and the classifier are unchanged.

export interface Hit {
  line: number;
  command: string;
  file: string;
  span: string;
  text: string;
}

export type RouteClass = 'NO_ROUTE' | 'WRONG_ROUTE' | 'SELF_READ';

export interface Inventory {
  agent: string;
  /** Instructions already on record, as `CLASS — LINENO: <text>` or the bare command. */
  evidence: string[];
}

/** Commands that reach the filesystem. `test` and `[` are matched with their file flags. */
export const FS_COMMANDS = ['cat', 'awk', 'jq', 'sed', 'head', 'tail', 'grep', 'wc', 'ls', 'test', '\\['];

/** A token that names a file: an extension in use, or an explicit glob. */
export const FILE_TOKEN = /[\w./$*{}-]+\.(?:md|json|jsonl|ts|tsx|js|mjs|sql|ya?ml|txt)\b|\*\.[a-z]+/;

/**
 * Spans of text that could be a command: fenced blocks, and inline backtick runs. Prose outside
 * both is never a command, which keeps a sentence containing the word "grepped" out of the findings.
 */
export const commandSpans = (line: string, inFence: boolean): string[] => {
  if (inFence) return [line];
  const spans: string[] = [];
  for (const m of line.matchAll(/`([^`]+)`/g)) spans.push(m[1]);
  return spans;
};

/** Is a filesystem command in COMMAND POSITION inside this span? */
export const fsCommandIn = (span: string): string | null => {
  for (const cmd of FS_COMMANDS) {
    // start of span, or after a pipe / && / || / ; / $( / (
    const re = new RegExp(`(?:^|\\||&&|\\|\\||;|\\$\\(|\\()\\s*${cmd}\\b`);
    if (re.test(span)) return cmd.replace('\\\\', '');
  }
  return null;
};

/** Every instruction in a step file that would need a shell to touch a file. */
export const scanStepFile = (text: string): Hit[] => {
  const found: Hit[] = [];
  let inFence = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (/^\s*#/.test(line)) return; // a comment is not an instruction
    for (const span of commandSpans(line, inFence)) {
      const cmd = fsCommandIn(span);
      if (!cmd) continue;
      const file = span.match(FILE_TOKEN);
      if (!file) continue; // no file named: not this class
      found.push({ line: i + 1, command: cmd, file: file[0], span: span.trim(), text: line.trim() });
      break;
    }
  });
  return found;
};

/**
 * Can the agent reach this data at all? The one mechanical question.
 *
 *   SELF_READ    its own emitted handoff, read back off disk. The agent authored it, so an
 *                emit-time self-check replaces the read.
 *   WRONG_ROUTE  an upstream handoff, read by file path. The orchestrator already puts it in
 *                the prompt as SEED_STATE; the field is there and only the route is wrong.
 *   NO_ROUTE     anything else. No route exists; this needs a decision.
 */
export const classify = (hit: Hit, self: string): RouteClass => {
  const ref = hit.file.match(/agent-([0-9a-z]+)\//);
  if (ref) {
    if (`agent-${ref[1]}` === self) return 'SELF_READ';
    if (/verification\/runs\//.test(hit.file)) return 'WRONG_ROUTE';
  }
  return 'NO_ROUTE';
};

/** Normalised comparison text: line numbers drift, wording does not. */
export const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Is this instruction already in the inventory? Matching is generous in both directions, because
 * stored evidence is neither a whole line nor a bare command: some entries carry a `CLASS — LINENO:`
 * prefix, some are truncated, some keep the "⚡ Verify:" prefix. The 15-character floor stops a stub
 * from matching everything.
 */
export const accountedFor = (hit: Hit, evidence: string[]): boolean => {
  const line = norm(hit.text);
  const span = norm(hit.span);
  for (const raw of evidence) {
    const ev = norm(String(raw).replace(/^[A-Z_]+\s*[—-]\s*\d+:\s*/, ''));
    if (ev.length < 15) continue;
    if (line.includes(ev) || ev.includes(span) || ev.includes(line)) return true;
  }
  return false;
};
