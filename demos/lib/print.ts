// Output formatting shared by the demos. Nothing here decides anything: every check lives in the demo that makes it.

export const heading = (text: string): void => {
  console.log(`\n${text}\n${'-'.repeat(text.length)}`);
};

export const line = (text = ''): void => {
  console.log(text);
};

/** Key-value rows, keys padded to one column. */
export const rows = (pairs: Array<[string, string | number]>): void => {
  const width = Math.max(...pairs.map(([k]) => k.length));
  for (const [k, v] of pairs) console.log(`  ${k.padEnd(width)}  ${v}`);
};

/** A plain table: the first row is the header. */
export const table = (cells: Array<Array<string | number>>): void => {
  const widths = cells[0].map((_, i) => Math.max(...cells.map((r) => String(r[i]).length)));
  cells.forEach((r, n) => {
    console.log('  ' + r.map((c, i) => String(c).padEnd(widths[i])).join('  ').trimEnd());
    if (n === 0) console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  });
};

export const short = (hash: string): string => `${hash.slice(0, 16)}…`;
