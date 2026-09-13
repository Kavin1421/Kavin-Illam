# Kavin Illam — Architecture

**Product:** Multi-project construction management, finance, and document portal  
**Status:** Phase 9 budget complete. Phase 10 (tasks + milestones) is next.  
**Audience:** Homeowner + engineer initially; designed for additional collaborators later.

This document is the source of truth for stack, module layout, data strategy, authorization, finance rules, document security, and deployment. Implementation must follow it phase by phase.

---

## 1. Architecture overview

Kavin Illam is a private, multi-project portal. Every project-scoped resource is isolated by `projectId`. Authorization is enforced exclusively on the server. The financial system is ledger-oriented (typed transactions, statuses, explicit links) rather than a naive credit/debit balance.

```text
Browser (Next.js App Router UI)
        │
        ▼
Server Components / Server Actions / Route Handlers
        │
        ├── Auth.js (session)
        ├── Authorization layer (membership + permission + visibility)
        ├── Domain modules (projects, finance, advances, payments, documents, …)
        ├── Prisma → MongoDB (Atlas / replica set)
        └── Cloudinary (signed upload + private delivery)
```

**Non-negotiables**

1. Security first; never trust the client for permissions.
2. Multi-project from day one; never mix project data.
3. Financial records are auditable and soft-deleted, never silently destroyed.
4. Private records never leak into shared totals, reports, exports, activity, or APIs.
5. Money uses integer minor units; no JavaScript floating-point arithmetic.
6. Secrets stay server-side (`CLOUDINARY_API_SECRET`, `DATABASE_URL`, `AUTH_SECRET`, etc.).

---

## 2. Locked technology stack

| Concern | Choice |
|---------|--------|
| Package manager | **pnpm** |
| Runtime | **Node.js 24 LTS** |
| Framework | **Next.js** (App Router) + **TypeScript** |
| UI | **Tailwind CSS** + **shadcn/ui** |
| Database | **MongoDB** via **Prisma** (`provider = "mongodb"`, `DATABASE_URL`) |
| Auth | **Auth.js (NextAuth v5)** — Credentials (email/password), DB sessions, invitations; email via **Resend** |
| Validation | **Zod** (client UX + server security); forms with **React Hook Form** |
| Charts | **Recharts** |
| Files | **Cloudinary** — server-signed upload; private/authenticated delivery; short-lived signed URLs after authorization |
| Money | Integer **minor units** (paise for INR) |
| Dates | **UTC** in DB; display default **Asia/Kolkata** via shared formatters |
| Currency display | `Intl.NumberFormat('en-IN', …)` |
| Quality | ESLint, Prettier, automated tests for authz and finance |
| Production | **Docker** + **Nginx** reverse proxy; MongoDB Atlas / replica-set compatible |

Do not add dependencies without checking whether an existing package already covers the need. Prefer mature, maintained libraries and keep the tree minimal.

---

## 3. Module structure

```text
src/
  app/                      # App Router routes
    (auth)/                 # login, register, invite accept, password recovery
    (app)/                  # authenticated shell
      [projectSlug]/       # project-scoped pages
    api/                    # route handlers only when needed (Auth.js, signed uploads, health)
    notifications/
  components/               # presentation only — no authorization or finance rules
    ui/                     # shadcn primitives
    layout/                 # shell, nav, project switcher, mobile bottom nav, FAB
    finance/
    documents/
    …
  config/
    env.ts                  # Zod-validated environment; fail-fast in production
  lib/                      # pure shared utils (money, dates, currency, errors)
  server/
    auth/                   # Auth.js config, session helpers
    authorization/          # requireAuthenticatedUser, requireProjectPermission, canView*
    db/                     # Prisma client singleton
    projects/
    finance/                # accounts, categories, transactions, budgets, numbering
    advances/
    payments/               # payment requests + transaction linking
    documents/              # Cloudinary, versioning, access URLs
    audit/
    notifications/
    activity/
    search/
  validators/               # Zod schemas shared by actions and forms
  types/
prisma/
  schema.prisma
  seed.ts                   # development/demo only — never auto-run in production
docker/
  nginx/                    # Phase 14
```

**Separation rule:** Business logic lives under `src/server/*`. React components render; they do not decide who can see or mutate data.

Prefer Server Components. Use Server Actions for mutations. Use Route Handlers for Auth.js callbacks, Cloudinary signing, health checks, and other non-UI integrations. Do not create unnecessary public APIs.

---

## 4. Multi-project model

A user may own or belong to many projects. Example: Kevin → `Kavin Illam`, `Future Project`, etc.

Every project-specific entity stores `projectId`. Guessing an ObjectId must never grant access.

**Project fields (conceptual)**

- `id`, `name`, `slug`, `description`, `projectType`, `address`
- `startDate`, `expectedCompletionDate`, `actualCompletionDate`
- `estimatedBudget` (minor units), `currency` (default `INR`), `status`
- `ownerId`, `createdAt`, `updatedAt`

**Project context in UI**

- Desktop and mobile always show the active project (e.g. `Kavin Illam / Finance`).
- Project switcher lists only projects the user is a member of.
- Search defaults to the current project; global search only across authorized projects.

---

## 5. Authorization model

### 5.1 Request pipeline

Every project-scoped server operation must:

1. Authenticate the user.
2. Resolve the project (by id or slug).
3. Verify active project membership.
4. Verify the required permission.
5. Verify resource-level visibility (and restricted ACL if applicable).
6. Perform the operation.
7. Write audit / activity where required.

```text
Request → requireAuthenticatedUser
       → resolveProject
       → requireProjectMember
       → requireProjectPermission(permission)
       → canView* / canEdit* (visibility)
       → domain operation
       → AuditLog + Activity (as applicable)
```

Authorization helpers are centralized in `src/server/authorization/` and must be independently testable. UI hiding is UX only — never the security boundary.

### 5.2 Roles

Initial roles:

| Role | Intent |
|------|--------|
| `OWNER` | Full control |
| `ADMIN` | Near-full project administration |
| `ENGINEER` | Shared finance view, payment requests, settlements, documents, assigned tasks |
| `CONTRACTOR` | Restricted collaborator (seeded permissions; tighten as needed) |
| `ARCHITECT` | Documents / tasks oriented |
| `ACCOUNTANT` | Finance-heavy view/edit as configured |
| `VIEWER` | Read shared surfaces only |

Do **not** check role names inside domain code for authorization. Check **permissions**. Roles map to permission sets (seeded defaults; later editable in project settings).

### 5.3 Permissions (examples)

- `PROJECT_VIEW`, `PROJECT_EDIT`
- `FINANCE_VIEW`, `FINANCE_CREATE`, `FINANCE_EDIT`, `FINANCE_APPROVE`, `FINANCE_DELETE`
- `DOCUMENT_VIEW`, `DOCUMENT_UPLOAD`, `DOCUMENT_EDIT`, `DOCUMENT_DELETE`
- `PAYMENT_REQUEST_CREATE`, `PAYMENT_REQUEST_APPROVE`
- `BUDGET_VIEW`, `BUDGET_EDIT`
- `TASK_VIEW`, `TASK_CREATE`, `TASK_EDIT`
- `MEMBER_VIEW`, `MEMBER_INVITE`, `MEMBER_REMOVE`
- `AUDIT_VIEW`

### 5.4 Default matrices (seed intent)

**OWNER / ADMIN** — full project, finance, members, audit, destructive soft-delete/archive of authorized entities.

**ENGINEER**

- Allowed: `PROJECT_VIEW`; shared `FINANCE_VIEW`; `PAYMENT_REQUEST_CREATE`; shared document upload/view; advance settlement submit; task updates as assigned; project activity on permitted resources.
- Denied: owner private records; unrelated projects; changing owner permissions; deleting financial history; private documents; escalating roles.

**VIEWER** — read shared surfaces only.

### 5.5 Visibility

Important user-created resources support:

| Value | Meaning |
|-------|---------|
| `PRIVATE` | Creator / authorized owner only |
| `PROJECT_SHARED` | Members with the relevant permission |
| `RESTRICTED` | Explicitly selected members only (`DocumentAccess` / equivalent ACL) |

Server must enforce visibility on:

- Single-resource get
- List queries
- Dashboard totals
- Reports and CSV exports
- Activity feeds
- Notifications payloads
- Document preview/download URL issuance

**Private personal expenses** must not appear in shared project accounting unless explicitly treated as project finance. Collaborators must not see amount, attachments, notes, or activity for private items — including via ID enumeration.

### 5.6 Project members

`ProjectMember`: `userId`, `projectId`, `role`, `status`, `joinedAt`, `invitedBy`.

Engineer (and other collaborator) access is **invitation-based and explicit**. Membership checks run on every project operation.

---

## 6. Database strategy

### 6.1 MongoDB + Prisma

- Provider: `mongodb`.
- Identifiers: ObjectId — `@id @default(auto()) @map("_id") @db.ObjectId`.
- Compatible with MongoDB Atlas and replica-set deployments.
- Do not assume relational joins; design query patterns and indexes deliberately.
- Prefer references; embed only where it helps (e.g. audit `diff` snapshots, small restricted ACL lists).

### 6.2 Core collections (conceptual)

| Collection | Purpose |
|------------|---------|
| `User` | Profile, status, lastLoginAt |
| `Account`, `Session`, `VerificationToken` | Auth.js |
| `Project` | Multi-project container |
| `ProjectMember` | Membership + role |
| `Invitation` | Pending invites |
| `RolePermission` or seeded role→permission map | Authorization |
| `FinancialAccount` | Bank/cash/UPI tracking accounts (no full credentials) |
| `Category` | System + project custom categories |
| `FinancialTransaction` | Ledger entries |
| `TransactionAllocation` | Optional splits / budget linkage |
| `PaymentRequest` | Approval workflow |
| `Advance` | Advance principal |
| `AdvanceSettlement` | Settlements against advances |
| `Budget`, `BudgetCategory` | Planned vs committed vs paid |
| `Document`, `DocumentVersion`, `DocumentAccess` | Files + versions + ACL |
| `Task`, `Milestone` | Operational tracking |
| `Comment` | On requests, transactions, documents, tasks |
| `Notification`, `NotificationPreference` | In-app notifications |
| `AuditLog` | Security/finance sensitive history |
| `Activity` | Human-readable project feed |
| `ProjectCounter` | Human-readable number sequences |

### 6.3 Soft delete & archive

Financial records:

- `deletedAt`, `deletedBy`, `deletionReason`
- Never hard-delete important financial history
- Only owners/admins perform destructive administrative actions

Documents:

- Prefer archive (`status: ARCHIVED`) over hard delete
- Versions retained for audit and restore

### 6.4 Indexing (intent)

Create indexes for real query patterns, including:

| Pattern | Index intent |
|---------|----------------|
| Membership | `ProjectMember`: unique `(projectId, userId)` |
| Transactions | `(projectId, transactionDate)`, `(projectId, categoryId)`, `(projectId, status)`, `(projectId, createdAt)` |
| Payment requests | `(projectId, status)` |
| Documents | `(projectId, category)`, `(projectId, createdAt)` |
| Tasks | `(projectId, status)` |
| Audit | `(projectId, createdAt)` |
| Visibility filters | compound indexes including `visibility` / `createdBy` where queries require them |

Review indexes when query patterns stabilize (Phases 5–12).

### 6.5 Numbering

Human-readable numbers are **not** primary keys.

Examples (prefix derived from project code/slug):

- Transactions: `KIL-EXP-000001`, `KIL-ADV-000002`, `KIL-PAY-000003`, `KIL-SET-000004`
- Documents: `KIL-DOC-000001`
- Payment requests: `KIL-REQ-000001`
- Advances: `KIL-ADV-000001`

Allocated via `ProjectCounter` (or equivalent) on the server.

---

## 7. Financial system

### 7.1 Design principles

- Not a simple `credit - debit = balance` toy model.
- Typed transactions with direction, status, links, and audit.
- Explicit relationships between payment requests, payments, advances, and settlements.
- No duplicate silent ledger rows when paying a request — link to the transaction.

### 7.2 Money

- Store amounts as **integer minor units** (e.g. ₹500.50 → `50050` paise).
- Currency code on project and transaction (default `INR`); architecture supports additional currencies later.
- All calculations in integer arithmetic on the server.
- Format for display with centralized helpers using `en-IN`.

### 7.3 Transaction model (conceptual fields)

`id`, `projectId`, `transactionNumber`, `type`, `direction`, `amount`, `currency`, `categoryId`, `subcategoryId`, `accountId`, `paidByUserId`, `paidTo`, `recipientType`, `recipientId`, `transactionDate`, `dueDate`, `status`, `paymentMethod`, `referenceNumber`, `description`, `notes`, `visibility`, `createdBy`, `approvedBy`, `approvedAt`, `createdAt`, `updatedAt`, soft-delete fields.

**Types:** `EXPENSE`, `INCOME`, `TRANSFER`, `REFUND`, `ADJUSTMENT`, `ADVANCE`, `SETTLEMENT`

**Statuses:** `DRAFT`, `PENDING`, `APPROVED`, `PAID`, `PARTIALLY_PAID`, `CANCELLED`, `REJECTED`, `REFUNDED`

**Payment methods:** `CASH`, `BANK_TRANSFER`, `UPI`, `CARD`, `CHEQUE`, `NEFT`, `RTGS`, `IMPS`, `OTHER` — extensible; do not hard-code Indian methods into core business logic beyond the enum/config list.

### 7.4 Financial accounts

Track project/user accounts (HDFC, SBI, Cash, Credit Card, UPI, Other).

Fields: `name`, `type`, `institution`, `maskedIdentifier`, `openingBalance`, `currency`, `projectId`, `ownerId`, `status`.

**Never store** complete banking credentials, card CVV, or banking passwords.

### 7.5 Categories

Seed construction categories (LAND, ARCHITECTURE, ENGINEERING, CIVIL_WORK, MATERIALS, CEMENT, STEEL, …, MISCELLANEOUS). Allow project-specific custom categories.

### 7.6 Advances

```text
outstanding = originalAmount - sum(settlements) - sum(refunds)
```

- Computed **only on the server**.
- UI displays the server result; never re-derives as the source of truth.
- Settlements cannot exceed outstanding.
- Proof documents attach to advance / settlement / linked transactions as authorized.

### 7.7 Payment requests

Workflow:

```text
Payment Request → Approval / Reject / Request Changes → Payment → Transaction → Proof → Reconciliation → Settlement (if applicable)
```

- Owner actions: `APPROVE`, `REJECT`, `REQUEST_CHANGES`, `PAY`, `PARTIALLY_PAY`.
- Marking `PAID` requires a linked financial transaction (`linkedTransactionId`).
- Do not create duplicate financial records for the same payment event.

### 7.8 Accounting invariants

- Cannot mark PAID without amount and payment date.
- Settlement ≤ outstanding advance.
- Refund ≤ refundable original payment where applicable.
- Payment request cannot be PAID without linked transaction.
- Transaction cannot belong to another project (validate `projectId` consistency on all links).
- Amount edits write audit diffs (`from` / `to` / reason); do not silently rewrite history meaning.

### 7.9 Budget semantics

| Term | Meaning |
|------|---------|
| **Budget** | Planned amount |
| **Committed** | Approved/requested obligation not necessarily paid |
| **Paid** | Actual paid amount |
| **Remaining** | Per reporting mode: budget minus committed and/or paid — modes must be explicit and not mixed |
| **Variance** | Budget vs actual/committed as defined by the report |

Private transactions are excluded from shared budget/dashboard figures unless product rules explicitly include them for the owner-only view.

### 7.10 Reporting visibility

Reports and CSV exports aggregate **only** the caller’s authorized dataset. Never return full-collection aggregates to the browser for client-side filtering as the security boundary.

---

## 8. Document & Cloudinary strategy

### 8.1 Metadata in MongoDB

Documents store metadata and Cloudinary identifiers — not binary blobs.

Conceptual fields: `title`, `description`, `category`, `tags`, `fileName`, `mimeType`, `fileSize`, `cloudinaryPublicId`, `cloudinaryResourceType`, `secureDeliveryType`, `version`, `uploadedBy`, `visibility`, `status`, optional `issueDate` / `expiryDate` / `renewalDate`, numbering, timestamps.

**Categories:** CONTRACT, BOND, AGREEMENT, INVOICE, RECEIPT, PAYMENT_PROOF, QUOTATION, ESTIMATE, PLAN, DRAWING, APPROVAL, GOVERNMENT_DOCUMENT, IDENTITY_DOCUMENT, WARRANTY, CERTIFICATE, PHOTO, OTHER.

### 8.2 Versioning

Replacing a file creates a new `DocumentVersion` (version number, uploader, timestamp, change description). Authorized users may view, download, and restore versions. Never silently overwrite important documents.

### 8.3 Upload & access flow

1. Authenticate and authorize (`DOCUMENT_UPLOAD` / parent resource permission).
2. Validate extension, size, and MIME (do not trust MIME alone); reject dangerous formats; sanitize filename.
3. Generate server-signed upload parameters; never accept arbitrary client-supplied Cloudinary public IDs.
4. Persist metadata after successful upload.
5. Preview/download: authorize (`canViewDocument` / `canDownloadDocument`), then issue a **short-lived signed URL**.
6. Do not permanently expose private document URLs when unnecessary.
7. `CLOUDINARY_API_SECRET` never ships to the browser.

### 8.4 Preview

- Images and PDFs: in-app preview (zoom; PDF page navigation where practical).
- Unsupported types: metadata + download.
- Show version history, metadata, and access information on detail views.

---

## 9. Security model

| Control | Approach |
|---------|----------|
| Authentication | Auth.js secure cookies and DB sessions |
| CSRF | Framework/Auth.js defaults where applicable |
| Authorization | Every server operation independently verifies |
| Validation | Zod on all mutations; never trust client validation alone |
| Errors | User-safe messages + internal error codes; log details server-side; never expose raw DB/stack to users |
| Rate limiting | Auth and upload routes (foundation early; harden Phase 13) |
| Headers / CSP | Practical baseline in Next config; Nginx in production |
| Secrets | `.env` / host secrets only; `.env.example` placeholders; validated in `src/config/env.ts` |
| Logging | No passwords, tokens, secrets, or full card/bank credentials in logs or audit metadata |
| File upload | Authz + type/size/extension checks + sanitized metadata |
| ID enumeration | Authorization failure must not leak existence beyond safe error handling |

Follow OWASP-oriented practices throughout.

**Required env placeholders (`.env.example` in Phase 1):**

```text
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
```

---

## 10. Users, auth, and invitations

**User profile fields:** `id`, `name`, `email`, `phone`, `avatar`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`.

Implement securely:

- Login / logout / session handling
- Invitation create + accept (engineer and future roles)
- Password authentication recovery when credentials auth is enabled
- Email verification where applicable (Resend)

Do not expose password hashes, tokens, or other sensitive auth material to the client.

---

## 11. UX architecture (navigation & design)

### 11.1 Desktop navigation

Dashboard, Projects, Finance, Payment Requests, Advances, Documents, Tasks, Milestones, Reports, Activity, Members, Settings — always in project context, with a project switcher.

### 11.2 Mobile

Bottom navigation: Home, Finance, Documents, Tasks, More.  
Floating quick action: Expense, Income, Payment Request, Advance, Document, Task.

Optimize for phone-first owner workflows: quick expense, proof upload, approval, dashboard, notifications.

### 11.3 Design direction

Premium, minimal, professional construction/project-management feel.

- Strong typography, clean spacing, subtle borders, restrained shadows
- Clear financial hierarchy; excellent empty, loading (skeletons), error, and retry states
- Polished dialogs; toast notifications
- Avoid generic purple SaaS look, excessive gradients, and over-carded layouts
- Desktop tables; mobile compact financial cards/lists
- Accessibility: labels, keyboard focus, contrast; do not rely on color alone for status

### 11.4 Dashboard intent

Owner should immediately see: spent, where spent, pending, engineer needs, outstanding advances, documents needing attention, budget remaining, recent activity.

Surfaces: budget / paid / commitments / outstanding advances / remaining; charts; recent activity; upcoming payments, expiries, milestones.

---

## 12. Cross-cutting domains

| Domain | Notes |
|--------|-------|
| Activity feed | Human events linking to entities; respects visibility |
| Notifications | In-app; read/unread; preferences; `/notifications` |
| Comments | On payment requests, transactions, documents, tasks; inherit parent visibility |
| Search | Server-side filtered search within authorized project data |
| Audit log | CREATE/UPDATE/DELETE/APPROVE/REJECT/UPLOAD/DOWNLOAD/VIEW (sensitive)/INVITE/REMOVE_MEMBER/CHANGE_PERMISSION/PAYMENT/SETTLEMENT/RESTORE_VERSION — with actor, project, entity, timestamp, optional IP/UA, safe metadata/diff |
| Reports | Summary, expense, category, monthly, advance, payment request, budget vs actual, cash flow, outstanding, document register; CSV first; PDF later |
| Bulk ops | Multi-upload/tag/archive documents; export selected transactions; confirm destructive bulk actions |
| Tasks / milestones | Operational tracking with statuses TODO → CANCELLED; custom milestones allowed |

---

## 13. Deployment architecture

**Target (Phase 14):**

```text
Internet → Nginx (TLS, headers, reverse proxy)
                → Next.js Node 24 container
                      → MongoDB Atlas (or replica set)
                      → Cloudinary
                      → Resend
```

- `Dockerfile` + `docker-compose.yml` where appropriate
- Health endpoint for orchestration
- Structured logging
- Backup strategy documented for MongoDB
- Production env documentation
- Demo/seed data **never** auto-applied in production

---

## 14. Testing strategy

Mandatory coverage areas:

- Authentication and sessions
- Authorization and project isolation (User A cannot access Project B)
- Visibility: private / shared / restricted
- Document access and signed URL gating
- Payment request workflow and paid-without-link rejection
- Advance and settlement math
- Budget calculations and financial totals
- Soft deletion behavior
- Audit logging for sensitive actions
- Critical server actions

Acceptance scenario (end-to-end) is defined in the product brief: Kevin creates project → invites engineer → shared advance → private expense isolation → payment request → approve/pay/link → settlement outstanding → dashboard/activity/audit/export/mobile/production build.

---

## 15. Phase map

| Phase | Deliverable |
|-------|-------------|
| **0** | Discovery + this architecture document |
| **1** | Next.js, Tailwind, shadcn, env validation, Prisma/Mongo, auth shell, basic layout, logging — app runs |
| **2** | Auth complete: login/logout/session/profile/invitation foundation |
| **3** | Projects CRUD, switcher, members, invitations, roles |
| **4** | Centralized authorization + isolation tests |
| **5** | Financial core: accounts, categories, transactions, calculations |
| **6** | Advances: create, outstanding, settle, refund, history |
| **7** | Payment requests: create, approve/reject/changes, pay + link, notifications |
| **8** | Documents: Cloudinary, upload, versions, preview, download |
| **9** | Budget: categories, committed/paid/variance, budget dashboard |
| **10** | Tasks + milestones |
| **11** | Premium project dashboard |
| **12** | Reports + CSV export |
| **13** | Audit review + security hardening |
| **14** | Docker, Nginx, production docs, health, backups |
| **15** | Final QA against acceptance scenario |

**Gate rule:** After each phase run TypeScript check, lint, tests, and production build. Fix failures before starting the next phase. Summarize: what shipped, files changed, DB changes, security notes, tests, next phase.

Do not leave TODO placeholders for core functionality within a phase that claims completion.

---

## 16. Explicit non-goals (now)

Do not implement unless later required:

WhatsApp notifications, OCR/AI categorization, GST-heavy accounting, full vendor/PO/inventory/BOQ modules, e-signature, bank import, third-party accounting sync.

Keep extension points clean (vendors, tax fields, integrations) without building them prematurely.

---

## 17. Phase 0 discovery record

| Item | Finding |
|------|---------|
| Workspace | `/Users/kavinkumar/Kavin/Godevs/Kavin-Illam` |
| Prior application code | **None** — empty greenfield |
| Package manager / lockfile | Absent (will use pnpm in Phase 1) |
| Next.js / Prisma / Auth / UI | Absent |
| Docker / Nginx | Absent |
| Git | Initialized in Phase 0 (local only) |

Nothing existing was overwritten.

---

## 18. Decision log (security & finance)

| Decision | Rationale |
|----------|-----------|
| Permission checks, not role switches in domain code | Prevents brittle role sprawl and privilege bugs |
| Credentials auth uses JWT sessions | Auth.js does not support database sessions with the Credentials provider; Prisma Session/Account models remain for adapter readiness |
| Auth rate limits are in-memory | Fine for single-instance; use Redis (or equivalent) before multi-instance production |
| Invitation.projectId optional | Phase 2 invite foundation; project membership binding lands in Phase 3 |
| Role→permission matrix in code | Seeded defaults in `src/server/authorization/permissions.ts`; editable DB matrix can come later |
| Non-members get NOT_FOUND | Avoids project-id enumeration via FORBIDDEN vs NOT_FOUND distinction |
| Private visibility | Creator or project OWNER only; never in shared totals; collaborators get NOT_FOUND |
| Integer minor units | Avoids IEEE-754 money errors |
| Soft delete for finance | Auditability and recovery |
| Explicit payment-request ↔ transaction link | Prevents duplicate ledger entries |
| Server-only advance outstanding formula | Single source of truth |
| Visibility on reads, totals, exports, activity | Stops private leakage via aggregates and feeds |
| Cloudinary secret server-only + short-lived URLs | Controlled document access |
| pnpm + phased delivery | Reproducible installs; controlled complexity |

When a future change has meaningful security or financial impact, append it here.
