# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Tracker is a full-stack personal finance management application built with Next.js 15. It features transaction tracking, budgeting, goal setting, recurring transactions, AI-powered insights, and a conversational chatbot named "Saathi".

**Tech Stack**:
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Neon serverless)
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: Google Gemini 2.0 Flash
- **UI**: Tailwind CSS 4, Radix UI (shadcn/ui new-york style), Framer Motion
- **State**: React Context API (no Redux/Zustand)

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run dev:turbo        # Start dev server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema changes to database
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed database (if configured)
```

No test framework is configured. Node >=20.18 <23 is required.

## Architecture Overview

### State Management

**AppContext** (`contexts/AppContext.tsx`, ~1800 lines) is the single source of truth for all global state. It provides CRUD operations for every entity and implements **optimistic updates** with temporary IDs (`temp-${Date.now()}-${randomString}`).

**Two-phase loading** makes the app interactive quickly:
- **Phase 1 (Core)**: Accounts, recent transactions (limit 300), budgets, categories, notifications, settings
- **Phase 2 (Advanced)**: Parties, goals, watchlists, recurring transactions, templates, settlements, receipts

Loading stages progress: `"preparing"` → `"syncing"` → `"organizing"` → `"ready"`

**Usage**: `const { transactions, addTransaction, isLoading } = useApp()` — all data flows through AppContext.

### Authentication Flow

- **Middleware** (`middleware.ts`): `withAuth` from NextAuth protects all routes except `/api`, `/auth`, and static files
- **Session strategy**: JWT (not database sessions) for middleware compatibility, 30-day max age
- **API protection**: Every protected route calls `requireAuth()` from `lib/session.ts` first
- **User isolation**: All database queries must filter by `userId`

### API Design Patterns

All API routes in `app/api/` follow this structure:

```typescript
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

export async function GET(request: NextRequest) {
  const user = await requireAuth()
  const data = await getCachedUserData({
    userId: user.id,
    scope: USER_CACHE_SCOPES.transactions,
    keyParts: [stableSearchParamsKey(searchParams)],
    revalidateSeconds: 10,
    loader: async () => prisma.model.findMany({ where: { userId: user.id } })
  })
  return NextResponse.json(data)
}
```

**Key conventions**:
- Always `requireAuth()` first, always filter by `userId`
- GET routes use `getCachedUserData()` with appropriate cache scope and TTL
- Mutations use `prisma.$transaction()` with `{ maxWait: 10_000, timeout: 20_000 }` for multi-step operations
- After mutations, call `invalidateUserCache(user.id, [relevant scopes])`
- Error shape: `{ error: string }` with status 400/401/404/500
- Transaction amounts are stored as signed values: negative for expenses, positive for income (normalized via `normalizeTransactionAmount`)
- Tags are trimmed, deduplicated; recurring transactions auto-get a "recurring" tag

### Server-Side Caching

`lib/server-cache.ts` provides tagged caching via Next.js `unstable_cache`:
- Cache keys follow `user:${userId}:${scope}` pattern
- 19 cache scopes defined in `USER_CACHE_SCOPES` (accounts, transactions, budgets, syncCore, syncAdvanced, etc.)
- Selective invalidation: only invalidate affected scopes per operation

### Database Schema

Prisma schema in `prisma/schema.prisma` defines 20+ models. Key points:
- All user-owned models have `userId` field with `@@index([userId])`
- `Transaction.amount` is a signed Float (negative = expense, positive = income)
- `Budget` supports types (monthly/event/trip), methods (envelope/fixed_cap/goal_linked), periods (monthly/custom/rolling)
- `SubBudget` tracks per-category allocations within a budget
- Settlement groups support multi-user expense splitting with invitations
- JSON columns used for complex data: `Transaction.splits`, `SettlementGroupTransaction.splitData`, `Insight.data`
- All models use `@@map("snake_case_table_names")`

### Data Flow for Transactions

When a transaction is created/updated/deleted, the API route automatically handles cascading side effects:
1. Update the transaction itself
2. Recalculate affected account balance(s)
3. Upsert party if provided
4. Recalculate budget spending (find applicable budgets by date range, update `totalSpent` and `subBudgets[].spent`)
5. Handle recurring transaction tracking if applicable

### Component Organization

Components are organized by feature in `components/`:
- `budget/`, `transactions/`, `goals/`, `recurring/`, `settlements/`, `watchlists/`, `templates/` — feature modules
- `dashboard/`, `analytics/`, `insights/` — reporting/visualization
- `chat/` — Saathi AI chatbot (`SaathiChat.tsx`, `SaathiWorkspace.tsx`)
- `settings/` — Accounts, Categories, Parties, Preferences management
- `ui/` — Radix UI primitives styled with Tailwind (shadcn/ui)

Largest components: `RecurringTransactionsManagement.tsx` (~1600 lines), `BudgetManagement.tsx` (~1560 lines), `SettlementsManagement.tsx` (~1260 lines), `TransactionsList.tsx` (~1210 lines).

### AI Integration

Google Gemini 2.0 Flash powers two features:
1. **Saathi Chatbot** (`app/api/chat/route.ts`): Streaming conversational assistant with context about user's accounts, transactions, budgets, and goals
2. **Insights Generation** (`app/api/insights/generate/route.ts`): Analyzes spending patterns, generates recommendations stored in database

### Adding a New Feature

1. Define model in `prisma/schema.prisma`, run `npm run db:push`
2. Create API route in `app/api/[feature]/route.ts` using `requireAuth()` + `userId` filtering + cache pattern
3. Add client types to `lib/types.ts`
4. Add state + CRUD methods to `contexts/AppContext.tsx` (follow optimistic update pattern)
5. Create components in `components/[feature]/`
6. Create page in `app/[feature]/page.tsx`

### Key Files

| File | Purpose |
|------|---------|
| `contexts/AppContext.tsx` | All global state, CRUD ops, optimistic updates |
| `lib/session.ts` | `requireAuth()` and `getCurrentUser()` |
| `lib/server-cache.ts` | `getCachedUserData()`, `invalidateUserCache()`, cache scopes |
| `lib/prisma.ts` | Prisma client singleton (dev-safe global) |
| `lib/types.ts` | Client-side TypeScript interfaces for all models |
| `lib/auth.ts` | NextAuth config (Google OAuth, JWT strategy) |
| `lib/utils.ts` | `cn()` class name utility (clsx + tailwind-merge) |
| `middleware.ts` | Route protection via NextAuth `withAuth` |
| `app/api/sync/route.ts` | Unified data sync endpoint (core vs advanced scopes) |
| `types/next-auth.d.ts` | NextAuth session type augmentation (adds `user.id`) |

### Environment Setup

Copy `.env.example` to `.env.local`:

```bash
DATABASE_URL="postgresql://..."           # Neon PostgreSQL
NEXTAUTH_SECRET="..."                     # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."                    # Google Cloud Console
GOOGLE_CLIENT_SECRET="..."               # Google Cloud Console
GEMINI_API_KEY="..."                      # Google AI Studio (optional, AI features need it)
NODE_ENV="development"
```

### Documentation

Comprehensive docs in `docs/`:
- `docs/architecture/` — System architecture, tech stack, data flow, state management
- `docs/api/` — API endpoint documentation
- `docs/development/` — Form inventory and development guides
