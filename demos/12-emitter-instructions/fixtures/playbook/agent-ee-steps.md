# Agent EE — emitter path

Agent EE holds two tools: `read_upstream_state` and `emit_handoff`. Neither opens a file. Its upstream
handoff arrives in the prompt as SEED_STATE.

## Step 1 — read the upstream state

- Take `boundary_payload.spec_sections` from SEED_STATE. Every section you cite must be one it lists.
- Images: `next/image` on every raw `<img>` under the paths grepped below

⚡ Verify: `test -f product-spec.md || exit 1`

## Step 2 — draft and emit

# Nothing below this comment runs a shell. `cat handoff.json` would, and is not an order here.

⚡ Verify: the `build_clearance` you emit is "APPROVED".
⚡ Verify: every entry in the `routes` you emit names a section SEED_STATE carries.

```bash
# self-check on the draft you hold in memory, not a file
jq -e '.routes | length > 0' <<< "$DRAFT"
```
