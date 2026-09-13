# Kavin Illam

Private, multi-project construction management, finance, and document portal.

## Status

**Phase 15 — Final QA / acceptance: complete**

All planned phases (0–15) are done. See [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) for the acceptance matrix and [`docs/PRODUCTION.md`](docs/PRODUCTION.md) for self-hosting.

## Local development

```bash
pnpm install
pnpm db:push
SEED_PASSWORD='YourSecurePass123' pnpm db:seed
pnpm dev
```

Seeded: `kevin@kavinillam.local` (OWNER), `engineer@kavinillam.local` (ENGINEER), project `kavin-illam`.

## Production

**Netlify:** connect the repo, set env vars, keep publish as `.next` via [`netlify.toml`](netlify.toml) (never `public`). See [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

**Self-host (Docker):**

```bash
docker compose up --build -d
curl -fsS http://localhost:8080/api/health
```

**Never** run `pnpm db:seed` against production.

## Phase map

| Phase                    | Status   |
| ------------------------ | -------- |
| 0–14                     | Complete |
| 15 Final QA / acceptance | Complete |
