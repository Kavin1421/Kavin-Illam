# Kavin Illam

Private, multi-project construction management, finance, and document portal.

## Status

**Phase 2 — Authentication + users: complete**

Registration, login/logout, profile, password change/recovery, email verification foundation, collaborator invitations, rate limiting, and seed users.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full system design.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- MongoDB + Prisma
- Auth.js (NextAuth v5) credentials + JWT sessions
- Nodemailer SMTP (Resend optional)
- Zod env validation
- Vitest

## Setup

1. Copy `.env.example` to `.env.local` and fill required values:

   - `DATABASE_URL`
   - `AUTH_SECRET` (≥ 32 chars)
   - `AUTH_URL` / `NEXTAUTH_URL`

   Optional email: SMTP_* or `RESEND_API_KEY` (+ `SMTP_FROM`).

2. Install, push schema, seed, run:

```bash
pnpm install
pnpm db:push
SEED_PASSWORD='YourSecurePass123' pnpm db:seed
pnpm dev
```

Seeded local users (development only):

- `kevin@kavinillam.local`
- `engineer@kavinillam.local`

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |
| `pnpm db:push` | Sync Prisma schema to MongoDB |
| `pnpm db:seed` | Seed Kevin + Engineer (dev only) |

## Phase map

| Phase | Status |
|-------|--------|
| 0 Discovery & architecture | Complete |
| 1 Foundation | Complete |
| 2 Auth + users | Complete |
| 3 Projects | Next |

## Security

Never commit `.env.local` or secrets. Password hashes and email tokens are never returned to the client. Auth routes are rate-limited in-memory (replace with Redis for multi-instance production).
