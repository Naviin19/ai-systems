// Extracted from the factory repository (skill-ecosystem, private),
// contracts/registry/blast-radius.ts at d490466, on 2026-09-14.
// Unchanged apart from this header.

/**
 * blast-radius.ts — what a contract change reaches ([AIS4-3]).
 *
 * Usage: npx tsx contracts/registry/blast-radius.ts <SchemaName | kebab-name>
 *
 * Walks imported_by in contracts/registry/registry.json from the named schema and reports every schema,
 * database table, prompt and skill file the change reaches. Prompts are the playbook templates, step files
 * and build prompts that read the schema or a schema that depends on it. Before [AIS4-3] the walk stopped at
 * schemas, tables and skill files, over a registry that held 22 of 48 schemas, so a contract change could
 * not show the playbooks it would break.
 */

import * as fs from 'fs';

interface Registry {
  schemas: Array<{ name: string; tier: string; zod_type_path: string; json_schema_path: string; imported_by: string[] }>;
  schema_to_table_references: Array<{ table: string; schemas: string[] }>;
  skill_file_traceability: Record<string, string[]>;
  prompt_traceability: Record<string, string[]>;
}

const registry = JSON.parse(fs.readFileSync('contracts/registry/registry.json', 'utf8')) as Registry;
const arg = process.argv[2];
const known = registry.schemas.map((s) => s.name).join(', ');

if (!arg) {
  console.error('Usage: blast-radius.ts <SchemaName>');
  console.error(`Schemas: ${known}`);
  process.exit(1);
}

const target = registry.schemas.find((s) => s.name === arg || s.json_schema_path.endsWith(`/${arg}.schema.json`));
if (!target) {
  console.error(`Schema not found: ${arg}`);
  console.error(`Schemas: ${known}`);
  process.exit(1);
}

const byName = new Map(registry.schemas.map((s) => [s.name, s]));
const visited = new Set<string>();
const queue = [target.name];
while (queue.length > 0) {
  const current = queue.shift()!;
  if (visited.has(current)) continue;
  visited.add(current);
  for (const dependent of byName.get(current)?.imported_by ?? []) if (!visited.has(dependent)) queue.push(dependent);
}
const reached = new Set(visited);
visited.delete(target.name);

const touches = (schemas: string[]): boolean => schemas.some((n) => reached.has(n));
const tables = [...new Set(registry.schema_to_table_references.filter((r) => touches(r.schemas)).map((r) => r.table))];
const prompts = Object.entries(registry.prompt_traceability).filter(([, s]) => touches(s)).map(([file]) => file);
const skills = Object.entries(registry.skill_file_traceability).filter(([, s]) => touches(s)).map(([file]) => file);

console.log(`Schema: ${target.name} (${target.tier}, ${target.zod_type_path})`);
console.log(`Affected schemas: ${[...visited].join(', ') || '(none)'}`);
console.log(`Affected tables: ${tables.join(', ') || '(none)'}`);
console.log(`Prompts: ${prompts.join(', ') || '(none)'}`);
console.log(`Source skill files: ${skills.join(', ') || '(none)'}`);
console.log(`Total blast radius: ${visited.size} schemas + ${tables.length} tables + ${prompts.length} prompts`);
