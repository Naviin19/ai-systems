// Fails when a tracked file names something that belongs to the software factory (private) and not to this
// repository: the private repository's name, a vendor the factory evaluated, a working name, an address, a local
// path or a database project ref. Run by CI on every push.
//
// The denied words are stored as SHA-256 hashes, not as text, because a list of them in a public file would publish
// the very names it exists to keep out. Every word in every tracked text file is lower-cased and hashed, and so is
// every run of hyphen-joined words inside it, so `name-part` is caught inside `name-part-suffix` too. Paths and
// project refs need no secret, so they are plain patterns.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DENIED = new Set([
  '096c3ea829fbceead6e02da884ea1391cc555580159c6706be1a8cb250371e82', // the private repository's name
  '9e66a118b9a0fb8cada5eb0f357806a21cc067fa4b9d9f76eb9773a24e022438', // the early sensor's working name
  'bc74d4c225d5b7d9149b370ab12c1f4aba41322dcb527d7ea1fa941028f176e8', // that sensor's vendor
  '23b26d97c884efdc9cbcfb208e8ab0f0e1a0f3c6d17eadafd03a5e77503b59c8', // a private programme directory
  '55de60a4d9afcab12c06f10e83859f80f9a2b12a0e79af406364f35e31036f43', // the operator's address
]);

const PATTERNS = [
  ['a local Windows home path', /\b[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s]+/],
  ['a local home path', /(?:^|[\s'"`(])\/(?:Users|home)\/[A-Za-z][\w.-]*/],
  ['a Supabase project ref', /\b[a-z0-9]{20}\.supabase\.co\b/],
];

const sha = (s) => createHash('sha256').update(s).digest('hex');

function* candidates(text) {
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) yield m[0].toLowerCase();
  for (const m of text.matchAll(/[A-Za-z0-9][A-Za-z0-9_-]*/g)) {
    const parts = m[0].toLowerCase().split('-');
    for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j <= parts.length; j++) yield parts.slice(i, j).join('-');
  }
}

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const hits = [];
for (const file of files) {
  let buf;
  try { buf = readFileSync(file); } catch { continue; }
  if (buf.subarray(0, 8000).includes(0)) continue; // binary
  const lines = buf.toString('utf8').split(/\r?\n/);
  lines.forEach((line, n) => {
    for (const c of candidates(line)) if (DENIED.has(sha(c))) hits.push(`${file}:${n + 1}: a denied name`);
    for (const [what, re] of PATTERNS) if (re.test(line)) hits.push(`${file}:${n + 1}: ${what}`);
  });
}

const unique = [...new Set(hits)];
if (unique.length) {
  console.error(unique.join('\n'));
  console.error(`\n${unique.length} private reference(s) in tracked files.`);
  process.exit(1);
}
console.log(`check-private: ${files.length} tracked files, nothing private.`);
