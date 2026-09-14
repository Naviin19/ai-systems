// Extracted from the factory repository (skill-ecosystem, private),
// contracts/enforcement/edge-registry.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * edge-registry.ts — what each agent reads from the handoffs it depends on ([AIS4-1]).
 *
 * The producer side is never written here. It is the real HandoffEnvelopeSchema variant for the producer's
 * outboundBoundary (contracts/types/operational/handoff-envelope.ts), which the contract compiler resolves
 * from configs/agent-*.config.ts. Before [AIS4-1] this file hand-copied each producer's "output", so a real
 * contract could change and every edge still compiled; those copies were the enforcement engine's own
 * step-output shapes and now live, labelled as such, in step-edge-schemas.ts.
 *
 * One declaration per edge of today's graph, so a new dependency cannot go unconsidered: the compiler
 * reports any edge without one, and any declaration for an edge the graph no longer has.
 *
 * A read is a path into the persisted handoff.json, the type the consumer relies on there, and evidence:
 * "<step file> :: <text the step file contains>". The compiler fails a read whose evidence has left the
 * step file, so a declaration cannot outlive the playbook line it describes. Only reads that rely on a
 * field's type are declared. Every jq and node read in the step files is resolved separately by the
 * compiler's step-file lint, which also checks the boundary literal each pre-flight compares.
 */

import { z } from "zod";

export interface ConsumerRead {
  /** Dot path into handoff.json; "[]" steps into an array's elements. */
  path: string;
  /** The type the consumer relies on at that path. */
  expects: z.ZodType;
  /** "<step file> :: <text it contains>" */
  evidence: string;
}

export interface EdgeDeclaration {
  producer: string;
  consumer: string;
  reads: ConsumerRead[];
}

const steps = (agent: string, text: string): string => `templates/playbooks/steps/${agent}-steps.md :: ${text}`;
const PASS_FAIL = z.enum(["PASS", "FAIL"]);

export const EDGE_DECLARATIONS: EdgeDeclaration[] = [
  {
    producer: "agent-00",
    consumer: "agent-01",
    reads: [
      { path: "boundary_payload.build_clearance", expects: z.enum(["APPROVED", "CONDITIONAL", "BLOCKED"]), evidence: steps("agent-01", "boundary_payload?.build_clearance") },
    ],
  },
  { producer: "agent-01", consumer: "agent-02", reads: [] },
  { producer: "agent-02", consumer: "agent-03a", reads: [] },
  { producer: "agent-03a", consumer: "agent-03b", reads: [] },
  { producer: "agent-03b", consumer: "agent-03c", reads: [] },
  { producer: "agent-01", consumer: "agent-03c", reads: [] },
  { producer: "agent-03c", consumer: "agent-04", reads: [] },
  { producer: "agent-04", consumer: "agent-05", reads: [] },
  { producer: "agent-03c", consumer: "agent-05", reads: [] },
  { producer: "agent-05", consumer: "agent-06", reads: [] },
  { producer: "agent-06", consumer: "agent-07", reads: [] },
  {
    producer: "agent-04",
    consumer: "agent-08",
    reads: [
      { path: "boundary_payload.golden_master_routes", expects: z.array(z.object({ path: z.string() })), evidence: steps("agent-08", '.[0] | has("path")') },
    ],
  },
  { producer: "agent-08", consumer: "agent-09", reads: [] },
  {
    producer: "agent-09",
    consumer: "agent-10",
    reads: [
      { path: "boundary_payload.pixel_diff_status", expects: PASS_FAIL, evidence: steps("agent-10", "p.pixel_diff_status !== 'PASS'") },
      { path: "boundary_payload.lighthouse_status", expects: PASS_FAIL, evidence: steps("agent-10", "p.lighthouse_status !== 'PASS'") },
    ],
  },
  {
    producer: "agent-07",
    consumer: "agent-10",
    reads: [
      { path: "boundary_payload.test_suites_passed", expects: z.array(z.string()), evidence: steps("agent-10", "JSON.stringify(p.test_suites_passed)") },
      { path: "boundary_payload.coverage_pct", expects: z.number(), evidence: steps("agent-10", "p.coverage_pct") },
    ],
  },
  {
    producer: "agent-10",
    consumer: "agent-11",
    reads: [
      { path: "boundary_payload.staging_url", expects: z.string(), evidence: steps("agent-11", ".boundary_payload.staging_url") },
      { path: "boundary_payload.deploy_command", expects: z.string(), evidence: steps("agent-11", ".boundary_payload.deploy_command") },
      { path: "boundary_payload.is_idempotent", expects: z.boolean(), evidence: steps("agent-11", ".boundary_payload.is_idempotent") },
    ],
  },
  { producer: "agent-00", consumer: "agent-12", reads: [] },
  { producer: "agent-01", consumer: "agent-12", reads: [] },
  { producer: "agent-03a", consumer: "agent-12", reads: [] },
  { producer: "agent-research-reader", consumer: "agent-research-graph-builder", reads: [] },
  { producer: "agent-research-graph-builder", consumer: "agent-research-synthesizer", reads: [] },
  { producer: "agent-research-synthesizer", consumer: "agent-marketing-availability-builder", reads: [] },
  { producer: "agent-marketing-availability-builder", consumer: "agent-marketing-availability-validator", reads: [] },
];
