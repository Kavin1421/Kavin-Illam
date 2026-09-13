# Kavin Illam — UI Redesign

**Direction:** Luxury Contemporary Architecture  
**Goal:** Evolve from a plain white admin panel into a premium architectural finance + project portal — without changing backend, routes, or authz.

**Stack (current):** Next.js 16 App Router · React 19 · Tailwind 4 · shadcn (radix-nova) · Lucide · CVA · Source Sans 3 + Source Serif 4 · no Framer Motion (CSS / tw-animate)

---

## 1. Current visual problems

| Issue                                    | Evidence                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Flat white / neutral-only theme          | `globals.css` `:root` is pure oklch white/gray                      |
| No application shell                     | Global header + footer only; project nav is a wrap of ghost buttons |
| Weak brand signal                        | “Kavin Illam” as plain heading; no monogram, no navy sidebar        |
| Flat metric cards                        | Dashboard uses identical `Card` blocks with little hierarchy        |
| Sparse empty white                       | `max-w-6xl` + large padding without denser composition              |
| Generic status chrome                    | Default shadcn badges; no semantic financial palette                |
| No design tokens for gold / ivory / navy | Only neutral shadcn mapping                                         |
| Limited motion                           | Almost no intentional entrance / hover systems                      |
| Mobile = shrunk desktop                  | Horizontal wrap-nav; no drawer / bottom nav                         |
| Charts not present / unstyled if added   | No chart color tokens                                               |

---

## 2. New visual direction

**Name:** Luxury Contemporary Architecture

**Feels like:** Calm private command center for building a home — trust, money, craftsmanship, long-term value.

**Not:** Generic CRM, neon SaaS, banking purple, glassmorphism circus.

**Principles**

1. Restraint first — decoration earns its place
2. Navy for structure; gold for rare accent
3. Ivory canvas + white surfaces
4. Financial numbers dominate hierarchy
5. Micro-interactions communicate state, never spectacle
6. Server remains security boundary — UI never hides unauthorized data with CSS

---

## 3. Color system

### Brand

| Token            | Hex       | Role                                |
| ---------------- | --------- | ----------------------------------- |
| `--ki-navy`      | `#101828` | Primary / sidebar / primary buttons |
| `--ki-midnight`  | `#172033` | Sidebar hover / elevated navy       |
| `--ki-ivory`     | `#F8F6F1` | App background                      |
| `--ki-white`     | `#FFFFFF` | Cards / surfaces                    |
| `--ki-stone`     | `#E9E5DC` | Borders / muted fills               |
| `--ki-champagne` | `#C9A86A` | Premium accent (sparingly)          |
| `--ki-gold`      | `#B89455` | Accent hover / muted gold           |
| `--ki-charcoal`  | `#252A34` | Strong body text                    |
| `--ki-muted`     | `#667085` | Secondary text                      |

### Semantic

| Token          | Hex       | Use                              |
| -------------- | --------- | -------------------------------- |
| `--ki-success` | `#168A63` | Income / completed / paid        |
| `--ki-warning` | `#C98522` | Pending / expiring               |
| `--ki-danger`  | `#C94B4B` | Rejected / overdue / destructive |
| `--ki-info`    | `#3E6FA8` | Neutral informational            |

### Mapped shadcn tokens (light)

- `background` → ivory
- `foreground` → navy/charcoal
- `card` → white
- `primary` → deep navy
- `accent` (brand) → champagne (new `--brand` / premium variant)
- `muted` → stone-tinted
- `destructive` → danger
- `sidebar` → deep navy family

### Gradients (rare)

- Premium navy: `135deg, #101828 → #1B263B → #283A52`
- Gold accent: `135deg, #B89455 → #D8BD83`
- Warm wash: `135deg, #F8F6F1 → #FFFFFF`

### Dark mode (token-ready)

Background `#0B0F17` · surface `#111827` · secondary `#172033` · text `#F8FAFC` · muted `#98A2B3` · gold `#D6B875` · borders `rgba(255,255,255,0.08)`

---

## 4. Typography system

| Role                    | Face                      | Size           | Notes                             |
| ----------------------- | ------------------------- | -------------- | --------------------------------- |
| Display / project title | Playfair Display          | 32–42px        | Brand + project hero only         |
| Page title              | Playfair or Inter         | 28–34px        | Prefer Playfair for project names |
| Section                 | Inter                     | 18–22px        | Sans                              |
| Metric                  | Inter (tabular)           | 28–36px        | Never serif for money             |
| Body                    | Inter                     | 14–16px        | UI default                        |
| Secondary               | Inter                     | 12–13px        | Labels, meta                      |
| Mono                    | Geist Mono / ui-monospace | numbers, codes | Transaction numbers               |

**Migration:** Source Serif 4 → **Playfair Display**; Source Sans 3 → **Inter**; mono → **JetBrains Mono**. Serif reserved for brand/project/page titles — never buttons, tables, or money.

---

## 5. Spacing system

| Token        | Value |
| ------------ | ----- |
| `--space-1`  | 4px   |
| `--space-2`  | 8px   |
| `--space-3`  | 12px  |
| `--space-4`  | 16px  |
| `--space-5`  | 20px  |
| `--space-6`  | 24px  |
| `--space-8`  | 32px  |
| `--space-10` | 40px  |
| `--space-12` | 48px  |

**Shell:** Sidebar 250–280px · Header 72px · Content max ~1440px · Page pad 24–40px

---

## 6. Border radius system

| Token         | Value    | Use                 |
| ------------- | -------- | ------------------- |
| `--radius-sm` | 8px      | Compact controls    |
| `--radius`    | 10px     | Buttons / inputs    |
| `--radius-lg` | 14–16px  | Cards               |
| `--radius-xl` | 20–24px  | Hero / large panels |
| Pill          | `9999px` | Status badges only  |

---

## 7. Shadow system

| Level            | Value                                |
| ---------------- | ------------------------------------ |
| `--shadow-sm`    | `0 4px 20px rgba(16, 24, 40, 0.06)`  |
| `--shadow-md`    | `0 12px 40px rgba(16, 24, 40, 0.06)` |
| `--shadow-lg`    | `0 16px 40px rgba(16, 24, 40, 0.10)` |
| `--shadow-focus` | `0 0 0 3px rgba(16, 24, 40, 0.08)`   |

No multi-layer glow. Flat sections allowed.

---

## 8. Animation system

| Token               | Value                           |
| ------------------- | ------------------------------- |
| `--duration-fast`   | 160ms                           |
| `--duration-normal` | 200ms                           |
| `--duration-slow`   | 400ms                           |
| `--ease-out`        | `cubic-bezier(0.16, 1, 0.3, 1)` |

**Patterns:** Card fade-up stagger · count-up metrics · tab underline · sidebar width · dialog scale · drawer slide · chart once-on-view

**Rules:** No bounce · no infinite decoration · always honor `prefers-reduced-motion`

**Tech:** Prefer CSS + `tw-animate-css`; add Motion only if needed later.

---

## 9. Component system (planned)

Shell: `AppShell`, `Sidebar`, `MobileSidebar`, `TopHeader`, `ProjectSwitcher`, `GlobalSearch` / `CommandPalette`, `UserMenu`, `Breadcrumbs`, `MobileBottomNav`

Content: `PageHeader`, `MetricCard`, `FinancialMetricCard`, `SectionHeader`, `StatusBadge`, `ProgressBar`, `EmptyState`, `Skeleton`, `QuickAction`, `ActivityTimeline`, `FilterBar`, `DataTable`

Domain: `TransactionRow`, `DocumentCard`, `PaymentRequestCard`, `AdvanceCard`, `MilestoneTimeline`, `TaskCard`, `ChartCard`

Improve existing shadcn `Button` / `Card` / `Input` / `Badge` / `Dialog` via tokens before inventing duplicates.

---

## 10. Responsive strategy

| Breakpoint      | Shell                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| ≥1280           | Expanded navy sidebar + header                                           |
| 1024–1279       | Collapsible sidebar                                                      |
| &lt;768         | Drawer + optional bottom nav (Home / Finance / Documents / Tasks / More) |
| Tables          | Card rows on mobile                                                      |
| Dashboard order | Status → budget → spent → advances → attention → charts → lists          |

QA widths: 1440 · 1280 · 1024 · 768 · 430 · 390 · 375 · 320

---

## 11. Accessibility strategy

- Visible focus rings (`--shadow-focus` / ring tokens)
- Semantic landmarks (`nav`, `main`, `aside`)
- ARIA for sidebar collapse, command palette, drawers
- Contrast: navy on ivory, white on navy; gold never sole status signal
- Keyboard: Cmd/Ctrl+K search, Esc close, arrow menus
- `prefers-reduced-motion: reduce` disables transforms / count-up

---

## Implementation phases

| Phase | Focus                                      | Status          |
| ----- | ------------------------------------------ | --------------- |
| 1     | Design tokens                              | **Complete**    |
| 2     | Global typography                          | **Complete**    |
| 3     | Application shell                          | Next            |
| 3–6   | App shell / sidebar / header / project nav | Pending         |
| 7     | Buttons / forms / dialogs                  | Pending         |
| 8–19  | Feature pages                              | Pending         |
| 20–24 | Mobile / motion / a11y / perf / QA         | Pending         |

**Gate after each phase:** `pnpm lint` · `pnpm typecheck` · `pnpm build` (+ tests when logic touched)

---

## Architectural decisions

1. **Token-first:** Remap shadcn CSS variables so existing `bg-primary`, `bg-card`, etc. inherit the new language without rewriting every page immediately.
2. **No backend changes** for redesign.
3. **CSS motion first** — avoid new animation deps until shell needs them.
4. **Sidebar is navy** even in light mode (brand structure, not “dark mode”).
5. **Private data:** redesign never client-filters unauthorized rows.
