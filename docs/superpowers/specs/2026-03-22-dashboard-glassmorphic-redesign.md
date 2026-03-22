# Dashboard Glassmorphic Redesign

## Goal
Redesign the dashboard with a glassmorphic card style inspired by the Finux reference UI, while keeping the existing warm OkLCh color palette (golden primary, dark purple background). Apply the glass treatment app-wide. This spec covers only the dashboard phase — other pages follow if the user approves.

## Design Decisions

### Glassmorphic Card Treatment
- Cards get `backdrop-blur-xl` with semi-transparent backgrounds (`bg-card/50`) and subtle white border (`border-white/[0.08]`)
- Inner glow via `shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`
- This replaces the current opaque `bg-card border` style
- Applied via updated `Card` component in `components/ui/card.tsx` — affects entire app

### New CSS Utilities (globals.css)
- `.glass-card` utility: combines blur, transparency, border, and inner glow
- `.glass-card-hover`: adds subtle brightness increase on hover

### Dashboard Layout (3 rows)

**Row 1 — Summary Cards** (4-column grid, 2-col on mobile)
- Total Balance (with mini sparkline bars showing last 7 days spending)
- Monthly Income (with green trend indicator ↑ % change vs last month)
- Monthly Expenses (with red trend indicator)
- Net Cash Flow (conditional green/red)
- Each card: glassmorphic, compact, value prominent (text-2xl), label small above

**Row 2 — Charts** (2-column: 60/40 split)
- Left: Cash Flow trend line chart (income + expenses, 6 months) — simplified, no sub-cards, chart embedded directly in glass card
- Right: Daily Spending bar chart with time-range toggle (1W / 1M / 3M) — new `SpendingChart.tsx` component

**Row 3 — Lists** (2-column: 50/50)
- Left: Recent Transactions (last 8, with category icon, description, date, amount) — cleaner row style with hover glass effect
- Right: Accounts & Cards grid (2x2 grid showing account name, type icon, balance, masked account number if available)

**Action Items**: Rendered as a compact alert banner above Row 1 when items exist (not a full card). Collapsible.

**Account Scope Filter**: Moves into a subtle dropdown/popover in the page header instead of a horizontal scroll bar.

### Component Changes

| File | Action |
|------|--------|
| `components/ui/card.tsx` | Update Card base class to glassmorphic style |
| `app/globals.css` | Add glass utility classes |
| `components/dashboard/Dashboard.tsx` | Full rewrite with new layout |
| `components/dashboard/CashFlowChart.tsx` | Simplify — remove sub-cards, cleaner chart |
| `components/dashboard/SpendingChart.tsx` | **New** — daily spending bar chart with time filters |
| `components/dashboard/AccountsGrid.tsx` | **New** — 2x2 accounts display grid |
| `components/dashboard/ActionItemsCard.tsx` | Restyle as compact alert banner |
| `components/dashboard/SummaryCard.tsx` | **New** — extracted, glassmorphic, with sparkline/trend |

### What's NOT changing
- AppContext, data flow, API routes, Prisma schema
- Recharts library (still used for all charts)
- Lucide icons
- Color palette (OkLCh golden primary, dark purple background)
- Authentication, routing, other pages (for now)

## Files Touched (Dashboard Phase)
1. `app/globals.css` — add glass utilities
2. `components/ui/card.tsx` — glassmorphic base
3. `components/dashboard/Dashboard.tsx` — new layout
4. `components/dashboard/CashFlowChart.tsx` — simplified
5. `components/dashboard/SpendingChart.tsx` — new
6. `components/dashboard/AccountsGrid.tsx` — new
7. `components/dashboard/ActionItemsCard.tsx` — restyle
