# CareerOS AI

Assisted Career OS for India manufacturing (Purchase / SCM / plant). You Confirm every apply.

## Run locally

```bash
npm run dev
```

App: `careeros/apps/web` — http://localhost:3000

Copy `careeros/apps/web/.env.example` to `careeros/apps/web/.env.local`.

## Vercel

- **Root Directory:** `careeros/apps/web` (must point here — not repo root, not `careeros`)
- **Framework:** Next.js
- If Root Directory is `careeros`, Vercel runs Turbo and will fail. Override Build to `npm run build --prefix apps/web` or switch Root to `apps/web`.
- Do not commit secrets. Set env in Vercel (see `.env.example`).

Minimum to log in on production:

- `JWT_SECRET` (strong random, not the example value)
- `NEXT_PUBLIC_SITE_URL` = your `https://….vercel.app` (or custom domain)

For live OEM seats: `TINYFISH_API_KEY`. For durable users: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. For better packets: `OPENAI_API_KEY` or `GEMINI_API_KEY`. For cron: `CRON_SECRET` matching Vercel Cron.
