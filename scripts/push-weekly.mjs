// Pushes one week's data into the team database. Run on the admin's computer:
//   node scripts/push-weekly.mjs weekly/2026-11-23.json
// The file holds any of: { "competitors": [...], "snapshots": [...], "sales": [...] } with the same
// columns as the database tables. Existing rows with the same key are replaced. Reads keys from ./.env.
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const ref = env.SUPABASE_PROJECT_REF, token = env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error('Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in .env'); process.exit(1); }
const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/push-weekly.mjs <file.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const keys = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
const service = (keys.find((k) => k.name === 'service_role') || keys.find((k) => k.type === 'secret')).api_key;
const conflict = { competitors: 'asin', snapshots: 'week_start,segment', sales: 'week_start,style' };
for (const table of Object.keys(conflict)) {
  const rows = data[table];
  if (!Array.isArray(rows) || !rows.length) continue;
  const res = await fetch(`https://${ref}.supabase.co/rest/v1/${table}?on_conflict=${conflict[table]}`, {
    method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error(`${table}: ${res.status} ${await res.text()}`); process.exit(1); }
  console.log(`${table}: ${rows.length} rows saved`);
}
