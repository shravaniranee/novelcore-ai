/**
 * Ensures DIRECT_URL exists locally (required by Prisma schema).
 * If missing, copies DATABASE_URL → DIRECT_URL.
 * Does not print secret values.
 */
const fs = require('fs');

function upsertEnvFile(path) {
  if (!fs.existsSync(path)) return { path, updated: false, reason: 'missing' };
  let text = fs.readFileSync(path, 'utf8');
  const dbMatch = text.match(/^DATABASE_URL=(.*)$/m);
  if (!dbMatch) return { path, updated: false, reason: 'no_database_url' };

  if (/^DIRECT_URL=/m.test(text)) {
    return { path, updated: false, reason: 'direct_url_already_set' };
  }

  const insertion = `\n# Prisma direct connection (migrations). For Neon, use non-pooled URL.\nDIRECT_URL=${dbMatch[1]}\n`;
  if (!text.endsWith('\n')) text += '\n';
  text += insertion;
  fs.writeFileSync(path, text, 'utf8');
  return { path, updated: true, reason: 'added_direct_url_from_database_url' };
}

const results = ['.env', '.env.local'].map(upsertEnvFile);
console.log(JSON.stringify(results, null, 2));
