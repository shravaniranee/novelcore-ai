/**
 * Writes Neon DATABASE_URL + DIRECT_URL into .env without echoing secrets.
 *
 * Usage (PowerShell):
 *   node scripts/set-neon-urls.js "<POOLED_URL>" "<DIRECT_URL>"
 *
 * Or put URLs in a gitignored file `.neon-urls` as:
 *   DATABASE_URL=...
 *   DIRECT_URL=...
 * then run:
 *   node scripts/set-neon-urls.js --from-file
 */
const fs = require('fs');

function normalizeUrl(raw) {
  let u = String(raw || '').trim().replace(/^["']|["']$/g, '');
  if (!u) return '';
  if (!/sslmode=/i.test(u)) {
    u += (u.includes('?') ? '&' : '?') + 'sslmode=require';
  }
  return u;
}

function upsertKey(text, key, value) {
  const line = `${key}="${value}"`;
  if (new RegExp(`^${key}=`, 'm').test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  }
  if (!text.endsWith('\n')) text += '\n';
  return text + line + '\n';
}

function readFromFile() {
  if (!fs.existsSync('.neon-urls')) {
    throw new Error('Missing .neon-urls file. Create it with DATABASE_URL= and DIRECT_URL= lines.');
  }
  const map = {};
  for (const line of fs.readFileSync('.neon-urls', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(DATABASE_URL|DIRECT_URL)\s*=\s*(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return map;
}

let pooled;
let direct;

if (process.argv[2] === '--from-file') {
  const map = readFromFile();
  pooled = map.DATABASE_URL;
  direct = map.DIRECT_URL || map.DATABASE_URL;
} else {
  pooled = process.argv[2];
  direct = process.argv[3] || process.argv[2];
}

pooled = normalizeUrl(pooled);
direct = normalizeUrl(direct);

if (!pooled || !direct) {
  console.error('Usage: node scripts/set-neon-urls.js "<POOLED_URL>" "<DIRECT_URL>"');
  console.error('   or: node scripts/set-neon-urls.js --from-file');
  process.exit(1);
}

if (!/neon\.tech|neon\.build/i.test(pooled)) {
  console.error('Refusing to write: DATABASE_URL does not look like a Neon URL.');
  process.exit(1);
}

const path = fs.existsSync('.env') ? '.env' : '.env.local';
let text = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
text = upsertKey(text, 'DATABASE_URL', pooled);
text = upsertKey(text, 'DIRECT_URL', direct);
if (!/^DEMO_MODE=/m.test(text)) {
  text = upsertKey(text, 'DEMO_MODE', 'true');
}
fs.writeFileSync(path, text, 'utf8');

console.log(JSON.stringify({
  updated_file: path,
  database_url_is_neon: /neon\.tech|neon\.build/i.test(pooled),
  direct_url_is_neon: /neon\.tech|neon\.build/i.test(direct),
  pooled_has_pooler: /pooler/i.test(pooled),
  ssl_enabled: true,
}, null, 2));
