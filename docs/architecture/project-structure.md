# Project Structure

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Directory Overview

```
new-journal/
├── app/                      # Next.js 15 App Router
│   ├── api/                 # Backend API routes
│   ├── dashboard/           # Dashboard page
│   ├── transactions/        # Transaction pages
│   ├── budget/             # Budget page
│   ├── analytics/          # Analytics page
│   ├── settings/           # Settings pages
│   ├── auth/               # Auth pages (signin, error)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirects)
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── ui/                 # Reusable UI primitives
│   ├── dashboard/          # Dashboard widgets
│   ├── transactions/       # Transaction components
│   ├── budget/            # Budget components
│   ├── goals/             # Goals components
│   ├── analytics/         # Analytics charts
│   ├── settings/          # Settings forms
│   ├── chat/              # AI chat components
│   └── ...                # Other feature components
├── contexts/               # React Context providers
│   └── AppContext.tsx     # Main application state
├── lib/                    # Utilities and configuration
│   ├── prisma.ts          # Prisma client singleton
│   ├── auth.ts            # NextAuth configuration
│   ├── session.ts         # Session helpers
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── prisma/                 # Database
│   └── schema.prisma      # Database schema
├── types/                  # Type definitions
│   └── next-auth.d.ts     # NextAuth type extensions
├── public/                 # Static files
│   └── uploads/           # Uploaded files (receipts)
├── docs/                   # Documentation
├── .env                    # Environment variables (gitignored)
├── .env.example            # Environment template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind config
├── next.config.js          # Next.js config
└── README.md               # Project README
```

## Key Directories Explained

### `/app` - Next.js App Router

**Purpose**: Pages and API routes using Next.js 15 App Router.

**Structure**:
- Each folder is a route (e.g., `/dashboard` → `app/dashboard/`)
- `page.tsx` defines the page component
- `layout.tsx` defines shared layout
- `api/` folder contains backend API routes

**Example**:
```
app/
├── dashboard/
│   └── page.tsx           → /dashboard
├── transactions/
│   ├── page.tsx           → /transactions
│   ├── history/
│   │   └── page.tsx       → /transactions/history
│   └── recurring/
│       └── page.tsx       → /transactions/recurring
└── api/
    ├── accounts/
    │   └── route.ts       → /api/accounts
    └── transactions/
        └── route.ts       → /api/transactions
```

### `/components` - React Components

**Purpose**: Reusable React components organized by feature.

**Organization**:
- `/ui` - Basic UI primitives (Button, Dialog, etc.)
- Feature folders - Components for specific features
- Each folder groups related components

**Example**:
```
components/
├── ui/
│   ├── button.tsx
│   ├── dialog.tsx
│   └── input.tsx
├── transactions/
│   ├── TransactionsList.tsx
│   ├── TransactionFormModern.tsx
│   └── TransactionDetail.tsx
└── dashboard/
    ├── Dashboard.tsx
    ├── ActionItemsCard.tsx
    └── CashFlowChart.tsx
```

### `/contexts` - State Management

**Purpose**: React Context providers for global state.

**Key File**: `AppContext.tsx`
- Central state management
- CRUD operations for all entities
- Data synchronization
- Optimistic updates

**Usage**:
```typescript
import { useApp } from '@/contexts/AppContext';

function Component() {
  const { accounts, addAccount, isLoading } = useApp();
  // ...
}
```

### `/lib` - Utilities & Configuration

**Purpose**: Shared utilities, helpers, and configurations.

**Key Files**:
- `prisma.ts` - Prisma client instance
- `auth.ts` - NextAuth configuration
- `session.ts` - Session helpers
- `types.ts` - Shared TypeScript types
- `utils.ts` - Utility functions

### `/prisma` - Database

**Purpose**: Database schema and migrations.

**Key File**: `schema.prisma`
- Defines all data models
- Relationships and indexes
- Migrations generated from this

**Commands**:
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Sync schema to database
npm run db:studio    # Open Prisma Studio
```

### `/docs` - Documentation

**Purpose**: Comprehensive project documentation.

**Structure**: See [Documentation Hub](../README.md)

## File Naming Conventions

### Components
- **PascalCase**: `TransactionsList.tsx`
- **Descriptive names**: `TransactionFormModern.tsx` (not `Form.tsx`)

### API Routes
- **route.ts**: API endpoint file
- **lowercase folders**: `app/api/accounts/route.ts`

### Utilities
- **camelCase**: `utils.ts`, `session.ts`

### Types
- **.d.ts** for declarations: `next-auth.d.ts`
- **types.ts** for shared types

## Import Paths

Using TypeScript path aliases:

```typescript
// Instead of: '../../../contexts/AppContext'
import { useApp } from '@/contexts/AppContext';

// Instead of: '../../components/ui/button'
import { Button } from '@/components/ui/button';
```

**Configuration**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Environment Files

- `.env` - Local environment variables (gitignored)
- `.env.example` - Template with placeholder values
- `.env.local` - Next.js local overrides (gitignored)
- `.env.production` - Production variables (gitignored)

## Build Output

**Development**:
```
npm run dev
```
Output in `.next/` folder (gitignored)

**Production**:
```
npm run build
npm run start
```
Optimized build in `.next/` folder

## Related Documentation

- [Tech Stack](./tech-stack.md)
- [Database Schema](./database-schema.md)
- [State Management](./state-management.md)

---
