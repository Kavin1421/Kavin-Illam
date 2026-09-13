# Kavin Illam

Private, multi-project construction management, finance, and document portal.

## Status

**Phase 3 — Projects: complete**

Project CRUD, project switcher, members, role-permission matrix, and project-bound invitations.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full system design.

## Setup

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Seeded:

- Kevin (`kevin@kavinillam.local`) — OWNER of **Kavin Illam**
- Engineer (`engineer@kavinillam.local`) — ENGINEER member
- Project: `/p/kavin-illam`

Password comes from `SEED_PASSWORD` or the seed default in `prisma/seed.ts`.

## Key routes

| Route | Purpose |
|-------|---------|
| `/projects` | List your projects |
| `/projects/new` | Create project |
| `/p/[slug]` | Project overview |
| `/p/[slug]/members` | Members + invites |
| `/p/[slug]/settings` | Edit / archive |
| `/invite/[token]` | Accept project invitation |

## Phase map

| Phase | Status |
|-------|--------|
| 0–2 | Complete |
| 3 Projects | Complete |
| 4 Authorization tests | Next |
