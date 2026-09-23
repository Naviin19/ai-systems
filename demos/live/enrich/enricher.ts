// Extracted from the runtime input-enrichment package: the cache key, the in-flight de-duplication, and the
// forced-tool dispatch. Reduced to what this demo exercises; see README.md for what was left behind.
import { createHash } from 'node:crypto';
import { z } from 'zod';

/** Bumping this purges every cached entry at once, without touching any stored record. */
const CACHE_KEY_VERSION = 'v1';
const DEFAULT_MAX_TOKENS = 8192;

/** Thrown when the model's answer was cut off. Distinct on purpose: the caller should raise the cap, not
 *  conclude the input cannot be enriched. */
export class EnrichmentTruncatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnrichmentTruncatedError';
  }
}

export interface CacheAdapter {
  get(key: string): Promise<unknown | null> | unknown | null;
  set(key: string, value: unknown): Promise<void> | void;
}

/** In-process, bounded, lazily expiring. The file states its own limit: single process only. */
export class MemoryLRUCache implements CacheAdapter {
  private map = new Map<string, { value: unknown; expires: number }>();
  constructor(
    private maxEntries = 1000,
    private ttlMs = 3_600_000,
  ) {}
  get(key: string): unknown | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (Date.now() > e.expires) {
      this.map.delete(key);
      return null;
    }
    // Move to end (LRU refresh) — Map iteration order = insertion order.
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }
  set(key: string, value: unknown): void {
    this.map.delete(key);
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

/** Sort `required` so the order a schema happens to declare its fields in cannot change the fingerprint. */
const normalizeJsonSchema = (s: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...s };
  if (Array.isArray(out.required)) out.required = [...(out.required as string[])].sort();
  if (out.properties && typeof out.properties === 'object') {
    const props = out.properties as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(props).sort()) {
      sorted[k] = typeof props[k] === 'object' && props[k] ? normalizeJsonSchema(props[k] as Record<string, unknown>) : props[k];
    }
    out.properties = sorted;
  }
  return out;
};

/** Deterministic serialisation: object keys emitted in sorted order at every depth. */
const stable = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
};

/** The minimal slice of the Messages API this package uses. The SDK is never imported at runtime. */
export interface LLMClient {
  messages: {
    create(req: Record<string, unknown>): Promise<{
      stop_reason?: string;
      content: Array<{ type: string; name?: string; input?: unknown; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
}

export interface EnrichArgs<T extends z.ZodTypeAny> {
  raw: string;
  schema: T;
  context?: string;
  cache?: CacheAdapter;
  model?: string;
  floor?: number;
  maxTokens?: number;
}
export interface EnrichedResult<T> {
  data: T;
  cacheHit: boolean;
  cacheKey: string;
}

export class InputEnricher {
  private inFlight = new Map<string, Promise<unknown>>();
  /** Counted so a demo can prove de-duplication happened rather than assert it. */
  public dispatches = 0;

  constructor(private client: LLMClient) {}

  /**
   * The key is content-addressed over six inputs, NUL-separated. A schema change therefore produces a
   * clean miss rather than a stale hit, which is why no stored record needs a version field.
   */
  computeCacheKey<T extends z.ZodTypeAny>(args: EnrichArgs<T>): string {
    const json = normalizeJsonSchema(z.toJSONSchema(args.schema) as Record<string, unknown>);
    return createHash('sha256')
      .update(CACHE_KEY_VERSION)
      .update('\x00')
      .update(args.raw)
      .update('\x00')
      .update(stable(json))
      .update('\x00')
      .update(args.context ?? '')
      .update('\x00')
      .update(args.model ?? '')
      .update('\x00')
      .update(String(args.floor ?? 7.5))
      .digest('hex');
  }

  async enrich<T extends z.ZodTypeAny>(args: EnrichArgs<T>): Promise<EnrichedResult<z.infer<T>>> {
    const model = args.model ?? 'claude-haiku-4-5-20251001';
    const floor = args.floor ?? 7.5;
    const hash = this.computeCacheKey({ ...args, model, floor });

    // A hit is re-validated against the LIVE schema. A stale entry falls through to re-enrichment rather
    // than throwing: fail-safe, not fail-loud.
    if (args.cache) {
      const cached = await args.cache.get(hash);
      if (cached !== null && cached !== undefined) {
        const revalidated = args.schema.safeParse(cached);
        if (revalidated.success) return { data: revalidated.data, cacheHit: true, cacheKey: hash };
        // else: stale/invalid cache entry — fall through to re-enrich.
      }
    }

    // N concurrent identical calls make ONE dispatch; the rest await the same promise. They are reported
    // as misses, because that is what they are — they did not read a cache.
    const existing = this.inFlight.get(hash);
    if (existing) return { data: (await existing) as z.infer<T>, cacheHit: false, cacheKey: hash };

    const p = this.doEnrich(args, model, floor);
    this.inFlight.set(hash, p);
    try {
      const data = await p;
      if (args.cache) Promise.resolve(args.cache.set(hash, data)).catch(() => {});
      return { data, cacheHit: false, cacheKey: hash };
    } finally {
      this.inFlight.delete(hash);
    }
  }

  private async doEnrich<T extends z.ZodTypeAny>(args: EnrichArgs<T>, model: string, floor: number): Promise<z.infer<T>> {
    const maxTokens = args.maxTokens ?? DEFAULT_MAX_TOKENS;
    // The Anthropic API infers the JSON Schema dialect and rejects unknown top-level keys like "$schema".
    const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(args.schema) as Record<string, unknown>;
    const contextLine = args.context ? `\nContext: ${args.context}\n` : '';
    const userContent = `Enrich the following user input. Call the emit_enriched tool with the structured result.${contextLine}\nUser input: "${args.raw}"`;
    const system = `You turn weak user input into a schema-valid structured object.
INPUT: one raw string, possibly vague, possibly incomplete.
TRANSFORMATION: disambiguate the intent, project it onto the schema, and infer only what the input supports.
OUTPUT: a single call to emit_enriched. Never prose.
CONSTRAINTS: never invent a specific fact the input does not carry; leave an optional field out rather than guess it; aim for a quality floor of ${floor}.`;

    // The tool's input_schema IS the caller's schema. Forced tool choice means constrained decoding
    // produces schema-compliant output rather than prose someone then has to parse.
    const enrichTool = {
      name: 'emit_enriched',
      description: 'Emit the enriched user input as a structured JSON object matching the provided schema.',
      input_schema: jsonSchema,
    };

    for (let attempt = 1; attempt <= 2; attempt++) {
      const messages =
        attempt === 1
          ? [{ role: 'user', content: userContent }]
          : [
              { role: 'user', content: userContent },
              { role: 'assistant', content: '[Previous attempt did not produce valid output. Retrying with explicit tool call.]' },
              { role: 'user', content: 'Please call the emit_enriched tool now with the enriched data.' },
            ];

      this.dispatches += 1;
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        system,
        messages,
        tools: [enrichTool],
        tool_choice: { type: 'tool', name: 'emit_enriched' },
      });

      // A payload cut off at the cap is incomplete. Surfaced as a distinct, actionable error so the caller
      // raises maxTokens rather than concluding the input is un-enrichable.
      if (response.stop_reason === 'max_tokens') {
        throw new EnrichmentTruncatedError(`hit max_tokens cap (${maxTokens}) on attempt ${attempt}`);
      }

      const toolBlock = response.content.find((b) => b.type === 'tool_use' && b.name === 'emit_enriched');
      if (toolBlock) {
        const parsed = args.schema.safeParse(toolBlock.input);
        if (parsed.success) return parsed.data;
      }
    }
    throw new Error('Enrichment failed: neither tool_use nor text fallback produced schema-valid output after 2 attempts.');
  }
}
