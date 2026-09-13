# Production deployment

Deploy **Kavin Illam** either on **Netlify** (Next.js runtime) or **self-host** behind Nginx with a Node 24 container. MongoDB is expected to be **Atlas** (or your own replica set) — not bundled in Compose.

```text
Internet → Netlify CDN / Functions   OR   Nginx (TLS) → Next.js standalone
                → MongoDB Atlas
                → Cloudinary
                → Resend / SMTP
```

## Prerequisites

- MongoDB Atlas (or replica-set) connection string
- Cloudinary project (documents)
- SMTP or Resend for email
- For self-host: Docker Engine 24+, Docker Compose v2, domain + TLS

## Environment

Copy [`.env.example`](../.env.example) for local/self-host (gitignored). On Netlify, set the same keys in **Site configuration → Environment variables** — never commit secrets.

| Variable                     | Required          | Notes                                               |
| ---------------------------- | ----------------- | --------------------------------------------------- |
| `DATABASE_URL`               | Yes               | `mongodb+srv://…` Atlas URI                         |
| `AUTH_SECRET`                | Yes               | ≥ 32 random characters                              |
| `AUTH_URL` / `NEXTAUTH_URL`  | Yes (prod)        | **Public** origin, e.g. `https://illam.example.com` |
| `CLOUDINARY_*`               | Yes if using docs | Secret never exposed to browser                     |
| `RESEND_API_KEY` or `SMTP_*` | Recommended       | Invitations / recovery                              |
| `SMTP_FROM`                  | With email        | From address                                        |
| `MONGO_DB_NAME`              | Optional          | Atlas DB name only — not a credential               |
| `SUPERADMIN_EMAILS`          | Optional          | Extra superadmins (comma-separated). Always includes `kkavinkumar24@gmail.com` |

**Do not** commit `.env*` secrets. **Do not** run `pnpm db:seed` against production.

### Access control

- Platform superadmin (`kkavinkumar24@gmail.com`, plus optional `SUPERADMIN_EMAILS`) is the only account that can create projects directly.
- Other users request **join existing** or **create new** from `/projects/request`; superadmin approves at `/admin/access-requests`.
- Project owners can still invite members the usual way after a project exists.

## Netlify

Config lives in [`netlify.toml`](../netlify.toml). The `@netlify/plugin-nextjs` (OpenNext) adapter provisions SSR; you do **not** need `output: "standalone"` on Netlify.

### Required UI settings (or deploys will fail)

1. **Site configuration → Build & deploy → Build settings**
   - Prefer letting [`netlify.toml`](../netlify.toml) win (`publish = ".next"`).
   - Do **not** set publish to `public` — `@netlify/plugin-nextjs` will fail with “publish directory does not contain expected Next.js build output”.
2. **Plugins:** Next.js runtime / `@netlify/plugin-nextjs` enabled (also declared in `netlify.toml`).
3. After changing build settings: use **Clear cache and deploy site** once so an old bloated `.next` (cache/standalone) is not reused.

### What `netlify.toml` already does

- Sets `publish = ".next"` (required by the Next.js plugin)
- Runs `rm -rf .next/cache .next/dev` after build so the serverless handler stays under the **250 MB** Lambda limit
- Skips `output: "standalone"` on Netlify (standalone is Docker/self-host only)
- Omits `.netlify/**` / `.next/**` from secrets scanning (server env is inlined into SSR chunks by design)
- Omits `MONGO_DB_NAME` from secrets key scanning (name, not a secret)
- Prisma `rhel-openssl-3.0.x` binary target for Lambda

### Env on Netlify

Set at least: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`, plus Cloudinary/SMTP as needed. Prefer the Netlify UI or CLI — not committed files.

Validate schema against the target database once before go-live:

```bash
# From a trusted machine with prod DATABASE_URL loaded
pnpm db:push
```

Prefer controlled migrations / reviews for schema changes; `db:push` is fine for early Atlas setups but review indexes in Atlas.

## Build & run (Compose / self-host)

```bash
# Fill .env.production.local first
docker compose up --build -d
curl -fsS http://localhost:8080/api/health
```

- App health: `GET /api/health` (via Nginx `:8080`, or app direct `:3010`)
- Nginx host ports: `8080`→80, `8443`→443 (avoids clashing with other stacks on 80/443)
- App debug publish: `3010`→3000 (optional; keep closed in hardened prod)

Image-only:

```bash
docker build -t kavin-illam:latest .
docker run --rm -p 3010:3000 --env-file .env.production.local kavin-illam:latest
```

## TLS (Nginx)

1. Obtain certificates (e.g. Let’s Encrypt / Certbot).
2. Copy `fullchain.pem` and `privkey.pem` into `docker/nginx/certs/` (gitignored contents).
3. Uncomment the HTTPS server block in `docker/nginx/conf.d/kavin-illam.conf`.
4. Set `AUTH_URL` / `NEXTAUTH_URL` to `https://your-domain`.
5. `docker compose up -d --force-recreate nginx`

## Health & orchestration

`GET /api/health` returns:

- `200` + `"status":"ok"` when MongoDB `ping` succeeds
- `503` + `"status":"degraded"` when the database is unreachable

Use this for Docker `HEALTHCHECK`, load balancers, and uptime monitors. Middleware excludes `/api/health` from auth.

## Logging

Application logs are structured JSON-ish lines via `src/lib/logger.ts` (stdout/stderr). Collect with Docker logging drivers, journald, or a log shipper.

Never log passwords, tokens, cookies, or Cloudinary secrets. Audit metadata is redacted server-side.

## MongoDB backups

Atlas (recommended):

1. Enable **Continuous Cloud Backup** (or snapshot schedule) on the cluster.
2. Document restore drills quarterly (point-in-time restore to a staging cluster).
3. Restrict network access (IP allowlist / private endpoint); least-privilege DB users.
4. Keep connection strings in a secrets manager — not in images or git.

Self-hosted replica set:

1. Schedule `mongodump` (or filesystem snapshots of the data volume) off-peak.
2. Encrypt backup artifacts at rest; store off-site.
3. Test `mongorestore` into a non-production environment regularly.

Application-level soft deletes do **not** replace database backups.

## Cloudinary & email

- Documents use signed upload + short-lived delivery URLs; rotate API secrets if leaked.
- Keep `CLOUDINARY_API_SECRET` server-only.
- Configure SPF/DKIM for the sending domain when enabling Resend/SMTP.

## Updates & rollback

**Netlify:** redeploy a previous deploy from the Deploys UI, or revert the git commit.

**Docker:**

1. Build a new image tagged with git SHA.
2. `docker compose up -d --build app` (or pull the new tag).
3. Confirm `/api/health` and a smoke login.
4. Rollback by redeploying the previous image tag.

## Security checklist

- [ ] TLS (Netlify HTTPS or Nginx); HSTS in hardened self-host
- [ ] `AUTH_URL` matches the public HTTPS origin
- [ ] Strong unique `AUTH_SECRET`
- [ ] Atlas IP allowlist / private networking
- [ ] Seed/demo data never applied in production
- [ ] Netlify publish is `.next` (not `public`); build clears `.next/cache` so the handler stays under 250 MB
- [ ] Container runs as non-root (`nextjs` user) when self-hosting
- [ ] `client_max_body_size` sized for document uploads (32m default)

## Related

- Architecture: [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Netlify: [`netlify.toml`](../netlify.toml)
- Compose: [`docker-compose.yml`](../docker-compose.yml)
- Nginx: [`docker/nginx/`](../docker/nginx/)
