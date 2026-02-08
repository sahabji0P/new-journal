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
- **UI**: Tailwind CSS, Radix UI, Framer Motion
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

## Architecture Overview

### State Management

**AppContext** (`/contexts/AppContext.tsx`) is the single source of truth for global state:
- Manages all financial data (accounts, transactions, budgets, goals, etc.)
- Provides CRUD operations for all entities
- Implements **optimistic updates**: UI updates immediately, then syncs with API
- Uses **two-phase loading**:
  - Phase 1: Core data (accounts, recent transactions, budgets, categories)
  - Phase 2: Advanced data (goals, watchlists, recurring transactions, templates, settlements, receipts)

**Usage pattern**:
```typescript
import { useApp } from '@/contexts/AppContext';

const { transactions, accounts, addTransaction, isLoading } = useApp();
```

**Key principle**: All data operations go through AppContext, which handles API calls and state synchronization.

### Authentication Flow

- **Middleware** (`middleware.ts`): Protects all routes except `/api`, `/auth`, and static files
- **API Routes**: Use `requireAuth()` from `/lib/session.ts` to validate session
- **Session**: JWT-based (not database sessions) for middleware compatibility
- **User isolation**: All database queries filtered by `userId`

```typescript
// In API routes:
import { requireAuth } from "@/lib/session";

const user = await requireAuth(); // Throws if not authenticated
const data = await prisma.transaction.findMany({
  where: { userId: user.id }
});
```

### Data Flow

1. User interacts with UI component
2. Component calls AppContext method (e.g., `addTransaction`)
3. AppContext performs optimistic update (immediate UI feedback)
4. AppContext makes API request to `/api/transactions`
5. API route validates authentication via `requireAuth()`
6. API validates input and performs database operation via Prisma
7. API updates related data (account balances, budget spending)
8. API returns response
9. AppContext syncs state with server response
10. UI re-renders with final data

### API Design Patterns

All API routes follow this structure:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Query with user isolation
    const data = await prisma.model.findMany({
      where: { userId: user.id }
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }
}
```

**Key patterns**:
- Always call `requireAuth()` first in protected routes
- Always filter database queries by `userId`
- Use Prisma transactions when updating multiple related entities
- Return consistent error shapes: `{ error: string }`
- Status codes: 200 (success), 201 (created), 400 (validation), 401 (unauthorized), 500 (server error)

### Database Schema

Prisma schema in `/prisma/schema.prisma` defines 17+ models:

**Core Models**:
- `User` - User accounts (NextAuth integration)
- `FinancialAccount` - User's bank/credit accounts
- `Transaction` - Income and expense transactions
- `Category` - Transaction categories (customizable)
- `Party` - Payees/payers

**Advanced Features**:
- `Budget` & `SubBudget` - Budget management with envelope/fixed-cap methods
- `Goal` - Financial goals with progress tracking
- `Watchlist` - Track spending by category/tag/payee
- `RecurringTransaction` - Automated recurring bills/income
- `TransactionTemplate` - Quick transaction templates
- `Settlement` - Track who owes whom (split expenses)
- `Receipt` - Attach receipts to transactions
- `Notification` - In-app notifications
- `Insight` - AI-generated spending insights
- `ChatMessage` - Saathi chatbot conversation history
- `UserSettings` - User preferences

**Important**: Transactions store `amount` as signed values (negative for expenses, positive for income). The `type` field is also tracked separately.

### Component Organization

Components are organized by feature:

```
/components
├── analytics/         # Spending charts and analysis
├── budget/           # Budget management
├── chat/             # Saathi AI chatbot
├── dashboard/        # Dashboard widgets
├── exports/          # Data export functionality
├── goals/            # Goal tracking
├── insights/         # AI insights panel
├── receipts/         # Receipt upload/viewing
├── recurring/        # Recurring transaction management
├── settings/         # Settings pages
├── settlements/      # Settlement (split expense) tracking
├── splits/           # Split expense forms
├── templates/        # Transaction templates
├── transactions/     # Transaction forms and lists
├── ui/               # Radix UI components (shadcn-style)
├── watchlists/       # Watchlist management
└── [shared components]
```

**UI Components**: Located in `/components/ui/` - these are Radix UI primitives styled with Tailwind. Use these as building blocks.

### AI Integration

**Google Gemini 2.0 Flash** powers two features:

1. **Saathi Chatbot** (`/api/chat/route.ts`):
   - Conversational financial assistant
   - Context-aware: receives user's accounts, recent transactions, budgets, goals
   - Streaming responses for real-time interaction

2. **Insights Generation** (`/api/insights/generate/route.ts`):
   - Analyzes spending patterns
   - Generates budget alerts and recommendations
   - Stored in database for persistent display

**Environment variable**: `GEMINI_API_KEY` (get from Google AI Studio)

## Working with this Codebase

### Adding a New Feature

1. **Define database model** in `prisma/schema.prisma` (if needed)
2. **Run migrations**: `npm run db:push`
3. **Create API route** in `/app/api/[feature]/route.ts`
   - Always use `requireAuth()` first
   - Filter by `userId`
4. **Add to AppContext** (`/contexts/AppContext.tsx`):
   - Add state array
   - Add CRUD methods
   - Add API sync in `syncData()` or phase 2 sync
5. **Create UI components** in `/components/[feature]/`
6. **Create page** in `/app/[feature]/page.tsx`
7. **Add navigation** to sidebar/menu if needed

### Modifying Transactions

When changing transactions, remember to:
1. Update the transaction
2. Recalculate affected account balance(s)
3. Update budget spending (if expense and has category)
4. Check watchlist alerts
5. Update recurring transaction tracking (if applicable)

The API route `/app/api/transactions/route.ts` handles all these side effects automatically.

### Working with Budgets

Budgets support three types:
- **monthly**: Standard monthly budget
- **event**: One-time event (wedding, vacation)
- **trip**: Travel budget

Budget methods:
- **envelope**: Allocate specific amounts per category
- **fixed_cap**: Single total cap across all spending
- **goal_linked**: Tied to a savings goal

Budget periods:
- **monthly**: Calendar month
- **custom**: Specific date range
- **rolling**: Last 30 days

When updating transactions, the API automatically recalculates budget spending.

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
DATABASE_URL="postgresql://..."           # Neon PostgreSQL URL
NEXTAUTH_SECRET="..."                     # Generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."                    # Google Cloud Console
GOOGLE_CLIENT_SECRET="..."                # Google Cloud Console

# Optional (AI features won't work without it)
GEMINI_API_KEY="..."                      # Google AI Studio

NODE_ENV="development"
```

### TypeScript Types

Shared types in `/lib/types.ts` - these mirror Prisma models but are used in client components. When adding new models:
1. Update Prisma schema
2. Run `npm run db:generate`
3. Update `/lib/types.ts` with client-safe types (strip Prisma metadata)

### Performance Considerations

- **Optimistic updates**: UI feels instant even with network latency
- **Two-phase loading**: App becomes interactive quickly (core data first)
- **Database indexes**: Schema includes indexes on frequently queried fields (`userId`, `date`, `category`, etc.)
- **Lazy loading**: Heavy components (charts, AI chat) are lazy-loaded

### Testing Locally

1. Set up Neon PostgreSQL database
2. Configure `.env.local`
3. Push schema: `npm run db:push`
4. Start dev server: `npm run dev`
5. Sign in with Google
6. Data persists to your Neon database

### Common Patterns

**Optimistic update pattern** (used throughout AppContext):
```typescript
const addItem = async (data) => {
  const tempId = `temp-${Date.now()}`;

  // 1. Optimistic update
  setItems(prev => [...prev, { ...data, id: tempId }]);

  try {
    // 2. API call
    const response = await fetch('/api/items', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const item = await response.json();

    // 3. Replace temp with real
    setItems(prev => prev.map(i => i.id === tempId ? item : i));

    // 4. Sync related data
    await syncRelatedData();

    toast.success('Item created');
    return item;
  } catch (error) {
    // 5. Revert on error
    setItems(prev => prev.filter(i => i.id !== tempId));
    toast.error('Failed to create item');
    throw error;
  }
};
```

**Date handling**: Use `date-fns` for date operations (already installed)

**Formatting**: Use AppContext methods:
- `formatCurrency(amount)` - Respects user's currency settings
- `formatDate(date)` - Respects user's date format preference

## Documentation

Comprehensive docs in `/docs/`:
- `/docs/architecture/` - System architecture, tech stack, data flow, state management
- `/docs/api/` - API endpoint documentation
- `/docs/getting-started/` - Setup guides

Read the architecture docs before making significant changes to understand design decisions.
