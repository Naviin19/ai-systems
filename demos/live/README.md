# Live demos

Everything in `demos/01-…` through `demos/09-…` runs with no key, no account and no network, and CI runs
those on Linux, macOS and Windows with every outbound connection refused. **Nothing in this directory
does.**

These demos call a real model, cost real money, and are deliberately outside the numbered set, so
`npm run demo` never reaches them and the hermetic guarantee above stays true.

| Demo | Command | Keys it reads | Calls | Typical cost |
|---|---|---|---|---|
| [enrich](enrich/) | `npm run demo:enrich` | `ANTHROPIC_API_KEY`, else `OPENROUTER_API_KEY` | at most 3 | well under one US cent |

## The rules they follow

**They say what they will do before they do it.** Every live demo prints its provider, model, call count
and cost estimate first, and only then acts.

**No key means nothing happens, and that is not a failure.** With no key set, the demo explains that it was
not asked to run and exits 0. It does not fail, because nothing was tried.

**A refusal is named, never a stack trace.** A rejected key, an account with no credits and a rate limit
are three different facts, and each is reported as itself. All of them exit **2** — could not run — which
is never reported as a pass. A demo that died in a stack trace would be demonstrating the opposite of what
these are about.

**Keys travel in headers.** Never in a URL, where they would reach server logs, browser history and
Referer headers.
