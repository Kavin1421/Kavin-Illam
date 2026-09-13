# Phase 15 — Acceptance & final QA

**Status:** Complete (2026-09-13)  
**Quality gates:** `pnpm typecheck` · `pnpm lint` · `pnpm format:check` · `pnpm test` (**88** passed) · `pnpm build`

Seed users for manual walkthrough:

| User     | Email                       | Role     |
| -------- | --------------------------- | -------- |
| Kevin    | `kevin@kavinillam.local`    | OWNER    |
| Engineer | `engineer@kavinillam.local` | ENGINEER |

Project slug: `kavin-illam` (seeded).

---

## Acceptance scenario (30 steps)

| #     | Criterion                                  | Result | Notes                                                                                                         |
| ----- | ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| 1     | Kevin creates project “Kavin Illam”        | Pass   | UI + seed                                                                                                     |
| 2     | Kevin invites engineer                     | Pass   | Invitations + email when configured                                                                           |
| 3     | Engineer accepts invitation                | Pass   | `/invite/[token]`                                                                                             |
| 4     | Engineer accesses project                  | Pass   | Membership + layout gate                                                                                      |
| 5     | ₹5,00,000 shared engineering advance       | Pass   | Seed + create flow                                                                                            |
| 6     | Kevin uploads payment screenshot           | Pass   | Documents `PAYMENT_PROOF` (Cloudinary)                                                                        |
| 7     | Engineer sees shared advance               | Pass   | Visibility filter                                                                                             |
| 8     | Engineer cannot see private expenses       | Pass   | Unit + isolation tests                                                                                        |
| 9     | Engineer creates ₹1,25,000 payment request | Pass   | `PAYMENT_REQUEST_CREATE`                                                                                      |
| 10    | Kevin receives notification                | Pass*  | Email to OWNER/ADMIN on create; activity/dashboard also surface it. Full in-app notification center deferred. |
| 11    | Kevin approves request                     | Pass   | Review workflow                                                                                               |
| 12    | Kevin records payment                      | Pass   | `payPaymentRequest`                                                                                           |
| 13    | Request linked to transaction              | Pass   | `linkedTransactionId` required for PAID                                                                       |
| 14    | Engineer uploads quotation                 | Pass   | Document category `QUOTATION`                                                                                 |
| 15    | Kevin can view quotation                   | Pass   | Shared document ACL                                                                                           |
| 16    | Engineer settles ₹1,00,000                 | Pass   | Settlement guard ≤ outstanding                                                                                |
| 17    | Outstanding = ₹4,00,000                    | Pass   | Automated: `50_000_000 − 10_000_000`                                                                          |
| 18    | Dashboard updates                          | Pass   | Server-computed shared totals                                                                                 |
| 19    | Budget calculations update                 | Pass   | Paid / committed / remaining modes                                                                            |
| 20    | Activity feed                              | Pass   | Visibility-filtered `Activity`                                                                                |
| 21    | Audit history                              | Pass   | `AUDIT_VIEW` only; engineer → 404                                                                             |
| 22–26 | Private expense isolation                  | Pass   | Services `NOT_FOUND`; detail pages use `withNotFound` → 404                                                   |
| 27    | Dashboard excludes private from shared     | Pass   | `includeInSharedProjectTotals`                                                                                |
| 28    | CSV export respects visibility             | Pass   | Server-side filtered reports                                                                                  |
| 29    | Mobile / responsive                        | Pass*  | Responsive Tailwind layouts; no separate native app                                                           |
| 30    | Production build                           | Pass   | `pnpm build` + Docker standalone packaging                                                                    |

\* = acceptable with documented limitation (not a hard fail).

---

## Product audit checklist

| Area                                           | Result                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| Authentication                                 | Pass                                             |
| Authorization (permissions, not role switches) | Pass                                             |
| Project isolation                              | Pass (integration tests when DB reachable)       |
| Financial / advance / budget math              | Pass                                             |
| Documents / Cloudinary signed access           | Pass                                             |
| Audit logging + redaction                      | Pass                                             |
| Exports (CSV)                                  | Pass                                             |
| Security headers / rate limits / health        | Pass                                             |
| Empty states                                   | Pass (major lists)                               |
| Loading skeletons (route-level)                | Partial — form pending states only               |
| In-app notification inbox                      | Deferred (email + activity cover acceptance #10) |
| Document ↔ entity FK links                     | Deferred (category/title association)            |

---

## Automated coverage added in Phase 15

- `src/server/acceptance/scenario.test.ts` — condensed acceptance invariants
- Acceptance outstanding case in `outstanding.test.ts`
- Owner/admin email notify on payment-request create
- `withNotFound` on finance / advance / payment-request / document / task / milestone detail pages

---

## Manual smoke (recommended once)

```bash
pnpm db:push && SEED_PASSWORD='ChangeMeNow!12345' pnpm db:seed
pnpm dev
```

1. Login as Kevin → Dashboard / Advances / Audit / Reports CSV
2. Login as Engineer → shared advance visible; create payment request
3. As Kevin → approve + pay; confirm link on request detail
4. As Engineer → settle ₹1,00,000; confirm outstanding ₹4,00,000
5. As Kevin → create PRIVATE ₹40,000 expense; Engineer cannot open its URL (404)
6. `pnpm build` / optional `pnpm docker:up` → `curl http://localhost:8080/api/health`
