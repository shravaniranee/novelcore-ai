const fs = require('fs');
function readEnv(path) {
  if (!fs.existsSync(path)) return {};
  const out = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = { ...readEnv('.env'), ...readEnv('.env.local') };
const u = env.DATABASE_URL || '';
const d = env.DIRECT_URL || '';
console.log(JSON.stringify({
  has_database_url: !!u,
  is_neon: /neon\.tech|neon\.build/i.test(u),
  has_ssl: /sslmode=/i.test(u),
  looks_local: /localhost|127\.0\.0\.1/i.test(u),
  has_direct_url: !!d,
  has_groq: !!(env.GROQ_API_KEY && !/placeholder|your_groq/i.test(env.GROQ_API_KEY)),
  has_openai: !!(env.OPENAI_API_KEY && !/placeholder|your-openai|sk-your/i.test(env.OPENAI_API_KEY)),
  has_supabase: !!(env.NEXT_PUBLIC_SUPABASE_URL && !/your-project-id/i.test(env.NEXT_PUBLIC_SUPABASE_URL)),
  demo_mode: env.DEMO_MODE ?? '(unset defaults true)',
}, null, 2));
