// LIVE demo: this one calls a real model and costs real money. It is deliberately outside the numbered
// set, so `npm run demo` never reaches it and CI keeps refusing every outbound connection.
//
// It proves three things a recorded fixture cannot: that forced tool choice really returns schema-valid
// structure from a live model, that the content-addressed key hits and misses for the right reasons, and
// that N concurrent identical calls make exactly one dispatch.
import { z } from 'zod';
import { InputEnricher, MemoryLRUCache, type LLMClient } from './enricher';
import { heading, line, rows, table } from '../../lib/print';

// Two providers, because a reader is more likely to hold one than the other, and because the product this
// was extracted from keeps its fallbacks vendor-diverse for the same reason.
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const OPENROUTER = process.env.OPENROUTER_API_KEY;
const PROVIDER = ANTHROPIC ? 'anthropic' : OPENROUTER ? 'openrouter' : null;
const MODEL = PROVIDER === 'openrouter' ? 'anthropic/claude-haiku-4.5' : 'claude-haiku-4-5-20251001';
const KEY = ANTHROPIC ?? OPENROUTER;

// What the caller wants back. The model never sees this as prose — it becomes the tool's input schema.
const BriefSchema = z.object({
  company: z.string().describe('The target company named in the input, exactly as written.'),
  industry: z.string().describe('The industry the company operates in.'),
  objective: z.enum(['expand', 'displace', 'retain', 'enter']).describe('What the user is trying to do.'),
  signals: z.array(z.string()).max(4).describe('Concrete facts the input carries. Never invent one.'),
});

heading('What this demo will do');
rows([
  ['provider', PROVIDER ?? 'none — no key is set'],
  ['model', MODEL],
  ['calls', 'at most 3'],
  ['typical cost', 'well under one US cent'],
  ['keys it reads', 'ANTHROPIC_API_KEY, else OPENROUTER_API_KEY'],
  ['network', 'yes. Every other demo in this repository refuses one.'],
]);

if (!KEY || !PROVIDER) {
  line('');
  line('Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is set, so nothing was called and nothing spent.');
  line('This is not a failure: the demo was not asked to run. Set either key and run it again.');
  line('');
  line('Every other demo in this repository needs no key, no account and no network.');
  process.exit(0);
}

/** A provider refusal, carried with its status so the demo can name the reason instead of printing a stack. */
class ProviderError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`provider returned ${status}`);
    this.name = 'ProviderError';
  }
}

/** The minimal Messages client, over fetch. The SDK is never imported, so this repo gains no dependency. */
const client: LLMClient = {
  messages: {
    async create(req) {
      const url =
        PROVIDER === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'https://openrouter.ai/api/v1/messages';
      // The key travels in a header. It is never put in a URL, where it would reach server logs, browser
      // history and Referer headers.
      const headers: Record<string, string> =
        PROVIDER === 'anthropic'
          ? { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
          : { authorization: `Bearer ${KEY}`, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(req) });
      if (!res.ok) throw new ProviderError(res.status, (await res.text()).slice(0, 400));
      return (await res.json()) as never;
    },
  },
};

async function main(): Promise<void> {
  const checks: Array<[string, boolean, string]> = [];
  const check = (n: string, ok: boolean, d: string): void => void checks.push([n, ok, d]);

  const RAW = 'we sell observability tooling, trying to get into Tata Capital — they appointed a new CTO in March';
  const cache = new MemoryLRUCache();
  const enricher = new InputEnricher(client);

  heading('1. Weak text in, typed object out');
  line(`  raw: "${RAW}"`);
  line('');
  const first = await enricher.enrich({ raw: RAW, schema: BriefSchema, cache, model: MODEL });
  line(`  ${JSON.stringify(first.data, null, 2).split('\n').join('\n  ')}`);
  const valid = BriefSchema.safeParse(first.data);
  check('the live model returned schema-valid structure', valid.success, `dispatches so far: ${enricher.dispatches}`);
  check('no field was invented beyond the schema', Object.keys(first.data).length === 4, `${Object.keys(first.data).length} fields`);

  heading('2. The key hits and misses for the right reasons');
  const again = await enricher.enrich({ raw: RAW, schema: BriefSchema, cache, model: MODEL });
  check('the same input hits the cache', again.cacheHit && again.cacheKey === first.cacheKey, `key ${first.cacheKey.slice(0, 16)}…`);

  // Same schema, fields declared in a different order. The fingerprint is normalised, so this must still hit.
  const Reordered = z.object({
    signals: z.array(z.string()).max(4).describe('Concrete facts the input carries. Never invent one.'),
    objective: z.enum(['expand', 'displace', 'retain', 'enter']).describe('What the user is trying to do.'),
    industry: z.string().describe('The industry the company operates in.'),
    company: z.string().describe('The target company named in the input, exactly as written.'),
  });
  const reorderedKey = enricher.computeCacheKey({ raw: RAW, schema: Reordered, model: MODEL, floor: 7.5 });
  const floorKey = enricher.computeCacheKey({ raw: RAW, schema: BriefSchema, model: MODEL, floor: 9.0 });

  table([
    ['what changed', 'key', 'outcome'],
    ['nothing', `${first.cacheKey.slice(0, 12)}…`, 'hit'],
    ['field declaration order', `${reorderedKey.slice(0, 12)}…`, reorderedKey === first.cacheKey ? 'hit — order is normalised away' : 'MISS'],
    ['quality floor 7.5 -> 9.0', `${floorKey.slice(0, 12)}…`, floorKey === first.cacheKey ? 'HIT' : 'miss — a different ask'],
  ]);
  check('declaration order does not change the key', reorderedKey === first.cacheKey, 'required[] sorted before hashing');
  check('a different quality floor is a different key', floorKey !== first.cacheKey, 'floor is folded into the key');

  heading('3. Five concurrent identical calls, one dispatch');
  const fresh = new InputEnricher(client);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => fresh.enrich({ raw: `${RAW} (concurrent)`, schema: BriefSchema, model: MODEL })),
  );
  rows([
    ['concurrent calls', '5'],
    ['dispatches made', String(fresh.dispatches)],
    ['reported as cache hits', String(results.filter((r) => r.cacheHit).length)],
  ]);
  line('');
  line('  The four that piggybacked are reported as misses, because that is what they are: they never read a');
  line('  cache. Reporting them as hits would overstate what the cache did.');
  check('five concurrent identical calls make one dispatch', fresh.dispatches === 1, `${fresh.dispatches} dispatch(es)`);
  check('piggybackers are not reported as cache hits', results.every((r) => !r.cacheHit), '0 of 5 claimed a hit');

  heading('What held');
  table([['check', 'result', 'detail'], ...checks.map(([n, ok, d]) => [n, ok ? 'held' : 'FAILED', d])]);
  line('');
  line(`Total live dispatches this run: ${enricher.dispatches + fresh.dispatches}.`);

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    line('');
    line(`${failed.length} check(s) failed: ${failed.map(([n]) => n).join('; ')}`);
    process.exitCode = 1;
  }

}

/**
 * A live demo that dies in a stack trace would be demonstrating the opposite of what it is about. Every
 * way this can fail gets a named reason and an exit code that says whether the mechanism was disproved or
 * simply never reached.
 */
main().catch((err: unknown) => {
  heading('It did not run');
  if (err instanceof ProviderError) {
    const why =
      err.status === 401 || err.status === 403
        ? 'the key was rejected — check which of the two keys is set, and that it is current'
        : err.status === 400 && /credit|billing|balance/i.test(err.body)
          ? 'the account has no credits — this is a billing state, not a defect in the mechanism'
          : err.status === 429
            ? 'rate limited — wait and run it again'
            : 'the provider refused the request';
    rows([
      ['provider', PROVIDER ?? 'none'],
      ['status', String(err.status)],
      ['reason', why],
    ]);
    line('');
    line('  Nothing above disproves the mechanism: the request never reached a model, so there is no');
    line('  result to report either way. Exit 2 — could not run, which is never a pass.');
    process.exitCode = 2;
    return;
  }
  rows([['error', err instanceof Error ? err.message : String(err)]]);
  line('');
  line('  Exit 2 — could not run.');
  process.exitCode = 2;
});
