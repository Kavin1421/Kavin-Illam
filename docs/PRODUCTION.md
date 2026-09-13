# Production deployment

Self-host **Kavin Illam** behind Nginx with a Node 24 container. MongoDB is expected to be **Atlas** (or your own replica set) — not bundled in Compose.

```text
Internet → Nginx (TLS, headers, reverse proxy)
                → Next.js (standalone, port 3000)
                      → MongoDB Atlas
                      → Cloudinary
                      → Resend / SMTP
```

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- MongoDB Atlas (or replica-set) connection string
- Cloudinary project (documents)
- SMTP or Resend for email
- Domain + TLS certificates for production HTTPS

## Environment

Copy [`.env.example`](../.env.example) to `.env.production.local` on the host (gitignored).

| Variable                     | Required          | Notes                                               |
| ---------------------------- | ----------------- | --------------------------------------------------- |
| `DATABASE_URL`               | Yes               | `mongodb+srv://…` Atlas URI                         |
| `AUTH_SECRET`                | Yes               | ≥ 32 random characters                              |
| `AUTH_URL` / `NEXTAUTH_URL`  | Yes (prod)        | **Public** origin, e.g. `https://illam.example.com` |
| `CLOUDINARY_*`               | Yes if using docs | Secret never exposed to browser                     |
| `RESEND_API_KEY` or `SMTP_*` | Recommended       | Invitations / recovery                              |
| `SMTP_FROM`                  | With email        | From address                                        |

**Do not** commit `.env*` secrets. **Do not** run `pnpm db:seed` against production.

Validate schema against the target database once before go-live:

```bash
# From a trusted machine with prod DATABASE_URL loaded
pnpm db:push
```

Prefer controlled migrations / reviews for schema changes; `db:push` is fine for early Atlas setups but review indexes in Atlas.

## Build & run (Compose)

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

1. Build a new image tagged with git SHA.
2. `docker compose up -d --build app` (or pull the new tag).
3. Confirm `/api/health` and a smoke login.
4. Rollback by redeploying the previous image tag.

## Security checklist

- [ ] TLS terminated at Nginx; HSTS enabled in prod
- [ ] `AUTH_URL` matches the public HTTPS origin
- [ ] Strong unique `AUTH_SECRET`
- [ ] Atlas IP allowlist / private networking
- [ ] Seed/demo data never applied in production
- [ ] Container runs as non-root (`nextjs` user)
- [ ] `client_max_body_size` sized for document uploads (32m default)

## Related

- Architecture: [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Compose: [`docker-compose.yml`](../docker-compose.yml)
- Nginx: [`docker/nginx/`](../docker/nginx/)
