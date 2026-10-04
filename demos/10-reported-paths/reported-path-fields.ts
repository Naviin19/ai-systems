// Extracted from the software factory (private),
// contracts/enforcement/reported-path-fields.ts at 5d5fb3f1, on 2026-09-27.
// Changed on extraction:
//   - PathFieldRow is imported from ./reported-paths, extracted alongside
//   - every `note` is shortened to one line; boundary, path, kind, author and roots are unchanged
//
// Every path-shaped leaf the handoff envelope carries, and what each one actually IS. `kind` is a decision a
// person made per field, not a pattern: `golden_master_routes[].path` is a URL route, and a gate that
// name-matched `*_path` would report it as a missing file on every run. The rows are derived by walking the
// generated envelope schema, not hand-listed.
import type { PathFieldRow } from './reported-paths';

/** Artifacts an agent produces during its own dispatch. They are harvested from the sandbox into the
 *  agent's run directory, so `{runDir}` is the primary root; repo-root is a fallback because several
 *  research step files name their outputs workspace-relative. */
const RUN_ARTIFACT_ROOTS = ['{runDir}', '.'];

export const REPORTED_PATH_FIELDS: PathFieldRow[] = [
  // ── research cluster (phases 100-104) ──────────────────────────────────────
  {
    boundary: 'READER_TO_GRAPH',
    path: 'boundary_payload.notes_emitted[]',
    kind: 'filesystem',
    author: 'orchestrator',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'reading-notes/{slug}.notes.md. Stamped by the orchestrator from the notes it writes; the stamp predicts, the write may fail, so it is still resolved.',
  },
  {
    boundary: 'GRAPH_TO_SYNTHESIS',
    path: 'boundary_payload.graph_manifest_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'graph/graph-manifest.json, written during the graph-builder dispatch.',
  },
  {
    boundary: 'GRAPH_TO_SYNTHESIS',
    path: 'boundary_payload.amendments_present[]',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'graph/.amendments/post-{session}-amendment.json. Path-shaped under a name the suffix rule cannot see; listed in PATH_SHAPED_EXTRA.',
  },
  {
    boundary: 'SYNTHESIS_TO_PRODUCT',
    path: 'boundary_payload.synthesis_artifact_paths[]',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'synthesis/cross-source-claims.md and synthesis/coverage-report.json.',
  },
  {
    boundary: 'AVAILABILITY_TO_LIBRARY',
    path: 'boundary_payload.availability_artifact_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'availability/{methodology-session}.md.',
  },
  {
    boundary: 'AVAILABILITY_TO_LIBRARY',
    path: 'boundary_payload.amendment_record_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'availability/amendments/{session}-amendment-{ts}.md. Nullable — a null is not a claim and is never resolved.',
  },
  {
    boundary: 'RESEARCH_VALIDATOR_TO_LEARNING',
    path: 'boundary_payload.builder_artifact_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'The builder output the validator read, named back so the verdict can be traced to it.',
  },

  // ── build pipeline ─────────────────────────────────────────────────────────
  {
    boundary: 'SPEC_TO_FOUNDATION',
    path: 'boundary_payload.spec_validation_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'Agent 00\'s spec-validation report. Agent 00 holds only emit_handoff, so this path is written by the orchestrator harvest.',
  },
  {
    boundary: 'FRONTEND_CORE_TO_BROWSER_TESTING',
    path: 'boundary_payload.golden_master_routes[].path',
    kind: 'route',
    author: 'agent',
    note: 'NOT A FILE. A URL route such as "/dashboard" that agent 08 navigates to and screenshots. Declared so a name-matching implementation cannot report it as a missing file.',
  },
  {
    boundary: 'HARDENING_TO_LEARNING',
    path: 'boundary_payload.rounds[].browser_runs[].failures[].screenshot_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'Optional. A screenshot of a failing browser run, written during agent 11 hardening.',
  },
  {
    boundary: 'HARDENING_TO_LEARNING',
    path: 'boundary_payload.rounds[].browser_runs[].failures[].ssim_diff_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'Optional. The SSIM diff image for a visual regression.',
  },
  {
    boundary: 'HARDENING_TO_LEARNING',
    path: 'boundary_payload.rounds[].browser_runs[].failures[].console_log_path',
    kind: 'filesystem',
    author: 'agent',
    roots: RUN_ARTIFACT_ROOTS,
    note: 'Optional. Captured browser console output for a failing run.',
  },
  {
    boundary: 'HARDENING_TO_LEARNING',
    path: 'boundary_payload.rounds[].applied_edits[].file_path',
    kind: 'foreign',
    author: 'agent',
    note: 'A source file in the PRODUCT repository that agent 11 edited. The product tree is not checked out beside the factory, so resolving it here fails on every honest run.',
  },
  {
    boundary: 'HARDENING_TO_LEARNING',
    path: 'boundary_payload.rounds[].keep_file_overrides[].file_path',
    kind: 'foreign',
    author: 'agent',
    note: 'A KEEP-frozen product source file a human allowed to change. Product tree, as above.',
  },
  {
    boundary: 'PROMPT_MANAGER',
    path: 'boundary_payload.library_path',
    kind: 'foreign',
    author: 'agent',
    note: 'The prompts/ directory in the product. Agent 12 runs against a product workspace and writes {productRoot}/.manager/ itself.',
  },
  {
    boundary: 'PROMPT_MANAGER',
    path: 'boundary_payload.prompts[].conflict_path',
    kind: 'foreign',
    author: 'agent',
    note: 'A .conflict.md beside the product prompt it describes. Nullable; required only when status="conflict".',
  },
];
