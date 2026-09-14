// Extracted from the factory repository (skill-ecosystem, private),
// scripts/lib/embed-output.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * embed-output.ts — Phase 11b embedding infrastructure (plan v4.1.0);
 * real deterministic embedder landed 2026-08-02 (was a hash-derived mock).
 *
 * Embeds agent output text for semantic-drift comparison. Caches at
 * build-log/semantic-baseline/{agent_id}/embeddings/{buildId}.json.
 *
 * EMBEDDER: feature-hashed character-trigram frequency vector, L2-normalized
 * (64-dim). Deterministic, ZERO API cost, and a genuine lexical embedding:
 * similar texts get nearby vectors, different texts diverge — unlike the
 * pre-2026-08-02 mock, whose all-positive sin(hash) components put ANY two
 * texts at ~0.75-0.9 cosine, structurally unable to cross the 0.82 drift
 * threshold. This measures LEXICAL/structural drift, not deep semantics;
 * swap in an embedding API here for semantic distance and bump EMBEDDER_ID.
 *
 * Cache + baseline compatibility: cache files store { embedder, embedding }.
 * A cache entry (or baseline line) whose embedder does not match EMBEDDER_ID
 * is stale and must not be compared — embedText() recomputes over legacy
 * cache entries; detect-semantic-drift skips mismatched baselines and asks
 * for regeneration (scripts/generate-drift-baselines.ts).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Provider selection (2026-08-02, semantic upgrade):
 *   EMBED_PROVIDER=deterministic (default) — trigram-hash lexical embedder,
 *     zero cost, no key, CI-safe. Measures lexical/structural drift.
 *   EMBED_PROVIDER=openrouter — real semantic embeddings via OpenRouter
 *     (env:EMBED_MODEL, default openai/text-embedding-3-small). Requires
 *     OPENROUTER_API_KEY (env or .env.local). Failure is LOUD — this module
 *     throws rather than silently falling back, because a silent fallback
 *     would interleave embedder generations across runs. Call-site registry:
 *     factory.embed-output.semantic-embedder.
 *
 * Switching providers changes EMBEDDER_ID, which makes existing baselines
 * incomparable by design — clear build-log/semantic-baseline/{agent}/build-*.jsonl
 * and re-run scripts/generate-drift-baselines.ts after a switch.
 */
const EMBED_PROVIDER = (process.env.EMBED_PROVIDER ?? 'deterministic').toLowerCase();
const EMBED_MODEL = process.env.EMBED_MODEL ?? 'openai/text-embedding-3-small';
const CALL_SITE_ID = 'factory.embed-output.semantic-embedder'; // configs/call-site-registry.factory.json

/**
 * Provenance tag stamped into caches, baselines, and drift reports so vectors
 * from different embedder generations are never silently compared.
 */
export const EMBEDDER_ID =
  EMBED_PROVIDER === 'openrouter' ? `openrouter:${EMBED_MODEL}:v1` : 'trigram-hash-64-v1';

const DIM = 64;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function computeEmbeddingHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Deterministic lexical embedding: bag of character trigrams, feature-hashed
 * into DIM buckets, L2-normalized. Pure function — no cache, no I/O.
 */
export function embedTextDeterministic(text: string): number[] {
  const vec: number[] = new Array(DIM).fill(0);
  const t = text.toLowerCase();
  for (let i = 0; i + 3 <= t.length; i++) {
    vec[fnv1a(t.slice(i, i + 3)) % DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
  return norm === 0 ? vec : vec.map(v => v / norm);
}

function loadOpenRouterKey(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const content = readFileSync(resolve('.env.local'), 'utf8');
    const match = content.match(/^OPENROUTER_API_KEY=(.+)$/m);
    if (match) return match[1].replace(/^["']|["']$/g, '').trim();
  } catch { /* fall through */ }
  throw new Error(
    `EMBED_PROVIDER=openrouter requires OPENROUTER_API_KEY (env or .env.local). ` +
    `Unset EMBED_PROVIDER for the deterministic zero-cost embedder.`,
  );
}

/** Embedding models cap input around 8K tokens; truncate defensively. */
const MAX_EMBED_CHARS = 24_000;

/**
 * Real semantic embedding via OpenRouter (key in Authorization header per the
 * repo security rule — never in the URL). Throws on any failure: a silent
 * fallback would mix embedder generations across runs.
 */
async function embedViaOpenRouter(text: string): Promise<number[]> {
  const key = loadOpenRouterKey();
  const resp = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, MAX_EMBED_CHARS) }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(
      `${CALL_SITE_ID}: OpenRouter embeddings HTTP ${resp.status}: ${body.slice(0, 200)}` +
      (resp.status === 403 ? ' (403 usually means the key hit its spend limit — raise it or unset EMBED_PROVIDER)' : ''),
    );
  }
  const json = (await resp.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = json.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(`${CALL_SITE_ID}: OpenRouter embeddings response missing data[0].embedding`);
  }
  return embedding;
}

export async function embedText(text: string, agentId: string, buildId: string): Promise<number[]> {
  const cacheDir = join('build-log', 'semantic-baseline', agentId, 'embeddings');
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `${buildId}.json`);

  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
      // Current format: { embedder, embedding }. Legacy (pre-provenance) caches
      // are bare arrays from the retired mock — stale, recompute over them.
      // A cache from a DIFFERENT embedder generation is likewise recomputed.
      if (cached && cached.embedder === EMBEDDER_ID && Array.isArray(cached.embedding)) {
        return cached.embedding;
      }
    } catch { /* unreadable cache — recompute */ }
  }

  const embedding =
    EMBED_PROVIDER === 'openrouter' ? await embedViaOpenRouter(text) : embedTextDeterministic(text);
  writeFileSync(cachePath, JSON.stringify({ embedder: EMBEDDER_ID, embedding }));
  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
