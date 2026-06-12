// Generates taxonomy.csv from taxonomy.json and prints coverage stats.
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./taxonomy.json', import.meta.url), 'utf8'));
const fields = ['code', 'rail', 'native_description', 'leg', 'category', 'retryability', 'owner', 'customer_message', 'iso20022_equivalent'];

const esc = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
const csv = [fields.join(',')]
  .concat(data.codes.map(c => fields.map(f => esc(String(c[f] ?? ''))).join(',')))
  .join('\n');
writeFileSync(new URL('./taxonomy.csv', import.meta.url), csv + '\n');

// Coverage report
const byRail = {};
const missing = [];
for (const c of data.codes) {
  byRail[c.rail] = (byRail[c.rail] || 0) + 1;
  for (const f of fields) if (!c[f]) missing.push(`${c.rail}:${c.code} missing ${f}`);
}
console.log('Total codes:', data.codes.length);
console.log('By rail:', JSON.stringify(byRail));
console.log('Entries missing fields:', missing.length ? missing : 'none');
const enums = data.meta;
const bad = data.codes.filter(c => !enums.legs.includes(c.leg) || !enums.categories.includes(c.category) || !enums.retryability.includes(c.retryability) || !enums.owners.includes(c.owner));
console.log('Entries with invalid enum values:', bad.length ? bad.map(c => `${c.rail}:${c.code}`) : 'none');
console.log('CSV written: taxonomy.csv');
