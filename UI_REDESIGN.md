# Kavin Illam — UI Redesign

**Direction:** Dark Teal / Emerald Premium SaaS  
**Tagline:** Building a home, beautifully organized.  
**Goal:** Visual + UX transform of the existing product — **no** backend, route, authz, finance, or document-security rewrites.

**Stack:** Next.js 16 App Router · React 19 · Tailwind 4 · shadcn (radix-nova) · Lucide · CVA · Inter + Playfair Display + JetBrains Mono · CSS / `tw-animate` (no Framer Motion unless later required)

---

## Phase 1 — Codebase inspection (2026-09-13)

### What already works (do not rebuild)

| Area | Location | Notes |
|------|----------|--------|
| Auth | `(auth)/*`, Auth.js credentials JWT | Login/register/reset/verify/invite |
| Projects | `(app)/projects`, `/p/[slug]/*` | CRUD, membership, roles |
| Authz / visibility | `src/server/authorization/` | PRIVATE / SHARED / RESTRICTED; NOT_FOUND for outsiders |
| Finance | `src/server/finance/`, `/finance` | Integer paise; accounts; transactions |
| Advances / PRs / Budget / Docs / Tasks / Milestones | matching `src/server/*` + pages | Server-enforced |
| Reports / Activity / Audit | `/reports`, `/activity`, `/audit` | Visibility-filtered |
| Money helpers | `src/lib/money.ts` | Keep integer paise |

### Current UI inventory

| Layer | Status |
|-------|--------|
| Design tokens | Present but **navy / ivory / champagne** (prior redesign) — **superseded** by this brief |
| Typography | Playfair (headings) + Inter + JetBrains Mono in `layout.tsx` |
| App shell | `AppShellFrame`, `AppSidebar`, `AppHeader`, `SidebarProjectSwitcher`, `AuthChrome` |
| Nav | `nav-config.ts` — grouped Overview / Money / Build / Admin |
| shadcn UI | `button`, `card`, `input`, `badge`, `label`, `separator`, `skeleton`, `sonner` only |
| Domain UI | Mostly page-local + `*-forms.tsx`; **no** MetricCard / ChartCard / StatusBadge system yet |
| Dashboard | `/p/[slug]/page.tsx` — flat `Card` metrics; no charts, progress hero, glass, counters |
| Charts | Not installed / not used |
| Command palette | Header search disabled placeholder |
| Theme config | `src/app/globals.css` + `src/lib/design-tokens.ts` |

### Gap vs this brief

1. Identity must pivot: **dark teal + emerald**, not ivory canvas + navy sidebar + champagne.
2. Layered teal background + faint blueprint — missing.
3. Glass metric cards, progress hero, charts, attention panel — missing.
4. Emerald active nav / green CTAs — partial (sidebar is navy + champagne).
5. Command palette — not built.
6. Feature pages still read as light admin forms.
7. Missing reusable design-system components listed in brief §81.

### Hard constraints (unchanged)

- No fake data for polish  
- No floating-point money  
- No client-side privacy filtering  
- No Cloudinary URL exposure  
- Routes and permissions stay as-is  

---

## 2. Visual direction

**Name:** Dark Teal / Emerald Construction OS  

**Feels like:** Premium dark SaaS command center for building a home — progress, money, trust, craft.

**Not:** Corporate banking · 2015 ERP · neon gaming · rainbow glass circus · clone of any reference mock.

**Rules**

1. ~70% deep teal / dark surfaces · ~20% white / muted mint text · ~10% green / cyan / purple / blue / mint accents  
2. Green is the dominant accent; cyan / blue / purple / pink are supporting only  
3. Glass + glow used **selectively** (header, sidebar, metrics, modals) — not everywhere  
4. Financial numbers dominate hierarchy  
5. Micro-interactions communicate state; respect `prefers-reduced-motion`  
6. Server remains the security boundary  

---

## 3. Color system (tokens)

### Core palette

| Token | Hex / value | Role |
|-------|-------------|------|
| `--ki-bg` | `#063F3A` | Primary app background |
| `--ki-teal-deep` | `#064E49` | Elevated teal |
| `--ki-teal-dark` | `#053532` | Deep panels |
| `--ki-surface` | `#062D2A` | Darker surface |
| `--ki-sidebar` | `rgba(3, 40, 37, 0.92)` | Sidebar glass base |
| `--ki-emerald` | `#047857` | Emerald |
| `--ki-emerald-bright` | `#00C875` | Bright emerald |
| `--ki-cta` | `#00D084` | Primary CTA |
| `--ki-mint` | `#5EEAD4` | Mint accent / active icons |
| `--ki-mint-light` | `#A7F3D0` | Soft mint |
| `--ki-cyan` | `#22D3EE` | Info / budget accents |
| `--ki-blue` | `#3B82F6` | Supporting |
| `--ki-purple` | `#8B5CF6` | Advances / secondary |
| `--ki-pink` | `#EC4899` | Rare accent |
| `--ki-white` | `#FFFFFF` | Primary text |
| `--ki-off-white` | `#F1F5F9` | Soft text |
| `--ki-muted-white` | `#B8D6D1` | Secondary text |
| `--ki-muted` | `#8FAFAC` | Muted labels |
| `--ki-border` | `rgba(255,255,255,0.10)` | Default border |
| `--ki-border-subtle` | `rgba(255,255,255,0.06)` | Soft border |
| `--ki-warning` | `#F59E0B` | Pending / expiring |
| `--ki-danger` | `#EF4444` | Rejected / overdue / over budget |

### Usage ratio

70% teal/dark · 20% white/muted · 10% accents (green dominant).

### shadcn mapping (default theme = dark teal product)

- `background` → `--ki-bg`  
- `foreground` → white  
- `card` → translucent / surface elevated  
- `primary` → CTA green  
- `muted-foreground` → muted teal-gray  
- `destructive` → danger  
- `sidebar` → dark teal glass family  
- `brand` → mint / bright emerald  

### Gradients

- Primary: `135deg, #047857 → #00C875`  
- Teal: `135deg, #063F3A → #047857`  
- Cyan / purple: supporting only  
- App wash: layered radials (emerald / cyan / purple) at low opacity  

### Architectural pattern

Blueprint grid / faint geometry at **0.02–0.05** opacity on teal — never wallpaper-loud.

---

## 4. Typography

| Role | Face | Notes |
|------|------|--------|
| Brand / hero titles | Playfair Display (existing) or confident Inter | White; large |
| UI / body | Inter | Default |
| Metrics | Inter tabular | 32–38px, weight 600–700, **never** serif for money |
| Meta | Inter | Uppercase tracking for labels |
| Mono | JetBrains Mono | Codes / refs |

---

## 5. Layout shell

| Token | Value |
|-------|--------|
| Sidebar | 250–280px (expanded) / icons-only collapsed |
| Header | 68–76px |
| Content max | ~1500px |
| Page pad | 24–40px |

Shell files to evolve (not replace routes):  
`app-shell.tsx` · `app-sidebar.tsx` · `app-header.tsx` · `project-switcher.tsx` · `auth-chrome.tsx` · `(app)/layout.tsx`

---

## 6. Component roadmap (build / improve, don’t duplicate)

**Shell:** AppShell, Sidebar, MobileDrawer, TopHeader, ProjectSwitcher, GlobalSearch, CommandPalette, UserMenu, Breadcrumbs  

**Content:** PageHeader, MetricCard, FinancialMetricCard, StatusBadge, ProgressBar, EmptyState, Skeleton, QuickAction, ActivityTimeline, FilterBar, DataTable, FormDrawer, ChartCard  

**Domain:** TransactionRow, DocumentCard, PaymentRequestCard, AdvanceCard, MilestoneTimeline, TaskCard, BudgetCard  

Improve existing shadcn `Button` / `Card` / `Input` / `Badge` via tokens before inventing twins.

---

## 7. Implementation phases (this brief)

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Inspect codebase | **Complete** |
| 2 | Design tokens | **Complete** |
| 3 | Global background / theme surfaces | **Complete** |
| 4 | Typography tune for dark teal | **Complete** |
| 5 | App shell frame | **Complete** |
| 6 | Sidebar polish (emerald active, footer user) | **Complete** (bundled with 5) |
| 7 | Header (transparent glass + search stub) | **Complete** (bundled with 5) |
| 8 | Nav density | Pending |
| 9 | Buttons / inputs / dropdowns | **Partial** (glass Card/Input/Button) |
| 10 | Dashboard | **Complete** (+ charts, home imagery) |
| 11 | Finance | **Complete** |
| 11–21 | Finance → Settings feature pages | Pending |
| 22–26 | Mobile · motion · a11y · perf · QA | Pending |

**Gate after each phase:** `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` when appropriate.

### Prior navy/ivory redesign

Phases completed under the previous “Luxury Contemporary Architecture” direction are **visually superseded**. Keep the shell architecture (sidebar + header + switcher); retoken and restyle to teal/emerald.

---

## 8. Architectural decisions

1. **Token-first** — Remap shadcn CSS variables so `bg-primary`, `bg-card`, etc. inherit the new language.  
2. **Default theme is dark teal** — product identity is dark; do not treat this as an optional `.dark` bolt-on.  
3. **No backend changes** for redesign.  
4. **CSS motion first** — `tw-animate` / CSS; avoid new animation deps until needed.  
5. **Reuse shell** — evolve Phase 3–4 shell components; don’t delete working navigation.  
6. **Private data** — never client-filter unauthorized rows.  

---

## 9. Design review checklist (per page)

- [ ] Still look like a generic admin panel? → redesign  
- [ ] Teal/emerald intentional, not rainbow?  
- [ ] Cards not over-colored?  
- [ ] Gradients / glow restrained?  
- [ ] Financial numbers obvious?  
- [ ] Readable contrast?  
- [ ] Feels like a real construction project home?  
