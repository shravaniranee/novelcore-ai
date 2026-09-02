# Vercel Deployment Checklist (NovelCore AI)

This repo is prepared for Vercel + Neon (Postgres + pgvector).

## What the repo already does for you

- `postinstall`: `prisma generate`
- `build`: `prisma generate && next build`
- `vercel-build`: `prisma generate && prisma migrate deploy && next build`
- `vercel.json` uses `npm run vercel-build`
- Prisma `directUrl` support for Neon pooled vs direct connections

## What YOU must do (secrets / cloud UI)

### 1) Put Neon URLs into local `.env` (do not commit)

From Neon dashboard → Connection details:

1. Copy **Pooled** connection string → `DATABASE_URL`
2. Copy **Direct** connection string → `DIRECT_URL`
3. Ensure both include `?sslmode=require` (append if missing)
4. Database name should match (e.g. `novelcore` or `neondb`)

Example shape (fake values):

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
DEMO_MODE=true
```

### 2) Enable pgvector on Neon

In Neon SQL Editor run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3) Apply migrations (local machine against Neon)

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma migrate status
```

### 4) Push code to GitHub

```bash
git add package.json prisma/schema.prisma vercel.json .env.example
git commit -m "Prepare NovelCore for Vercel + Neon"
git push
```

### 5) Import project on Vercel

1. https://vercel.com/new → import this repo
2. Framework: Next.js
3. Build command should come from `vercel.json` (`npm run vercel-build`)

### 6) Add Vercel Environment Variables

Project → Settings → Environment Variables (Production + Preview):

Required:
- `DATABASE_URL` (Neon pooled)
- `DIRECT_URL` (Neon direct)
- `DEMO_MODE=true`

Optional (full features):
- `GROQ_API_KEY`, `GROQ_MODEL`
- `OPENAI_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIM`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Never add `NEXT_PUBLIC_GROQ_API_KEY`.

### 7) Deploy

Click Deploy / push to `main`. Open the `.vercel.app` URL and smoke-test `/app`.

### 8) Supabase redirect URLs (if using auth)

In Supabase Auth settings, add:
- `https://YOUR-PROJECT.vercel.app`
- `https://YOUR-PROJECT.vercel.app/**`
- your custom domain if any

## Notes

- First deploy with `DEMO_MODE=true` is the safest.
- Groq can be omitted; report/analysis deterministic fallback still works.
- Do not paste real connection strings into chat or commit them.
