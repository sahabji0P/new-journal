# Tech Stack

> **Audience**: Developers
> **Last Updated**: February 8, 2026

## Overview

Money Tracker uses modern, production-ready technologies chosen for developer experience, performance, and maintainability.

## Core Framework

### Next.js 15.2.4
**Why**: Full-stack React framework with built-in API routes, SSR, and optimal performance.

**Key Features Used**:
- App Router (file-based routing)
- Server Components for performance
- API Routes for backend
- Image Optimization
- Built-in TypeScript support

**Alternatives Considered**: Remix, vanilla React + Express
**Why Next.js**: Best DX, large ecosystem, Vercel deployment

### React 19.0.0
**Why**: Industry-standard UI library with excellent ecosystem.

**Key Features Used**:
- Hooks (useState, useEffect, useMemo, useCallback)
- Context API for state management
- Server Components
- Suspense and Error Boundaries

### TypeScript 5
**Why**: Type safety prevents runtime errors and improves DX.

**Benefits**:
- Catch errors at compile time
- Excellent IDE autocomplete
- Self-documenting code
- Refactoring confidence

## Database & ORM

### PostgreSQL (via Neon)
**Why**: Robust, feature-rich relational database.

**Advantages**:
- ACID compliance
- Complex queries support
- JSON columns for flexibility
- Excellent Prisma integration

**Hosting**: [Neon](https://neon.tech) - Serverless PostgreSQL
- Auto-scaling
- Branching for dev/test
- Generous free tier

### Prisma ORM 6.19.0
**Why**: Type-safe database access with excellent DX.

**Features**:
- Auto-generated TypeScript types
- Migrations
- Introspection
- Prisma Studio (DB GUI)

**Example**:
```typescript
const accounts = await prisma.financialAccount.findMany({
  where: { userId: user.id },
  include: { transactions: true }
});
```

## Authentication

### NextAuth.js 4.24.13
**Why**: Authentication library built for Next.js.

**Features**:
- OAuth providers (Google)
- Session management
- JWT or database sessions
- Built-in CSRF protection

### Google OAuth 2.0
**Why**: Ubiquitous, trusted, easy to implement.

**Setup**: Google Cloud Console

## AI Integration

### Google Gemini 2.0 Flash
**Why**: Advanced reasoning, large context window, cost-effective.

**Use Cases**:
- Financial insights generation
- Natural language chat
- Spending analysis
- Personalized recommendations

**SDK**: `@google/generative-ai` 0.24.1

## UI Framework & Styling

### Tailwind CSS 4.1.12
**Why**: Utility-first CSS for rapid development.

**Advantages**:
- No CSS file bloat
- Consistent design system
- Responsive utilities
- Dark mode support

### Radix UI
**Why**: Unstyled, accessible UI primitives.

**Components Used**:
- Dialog, Select, Switch
- Checkbox, Tabs, Progress
- Label, Slot

**Benefits**:
- Accessibility built-in
- Unstyled (full control)
- Keyboard navigation

### Framer Motion 12.23.12
**Why**: Smooth animations and transitions.

**Use Cases**:
- Page transitions
- Component animations
- Hover effects

## Data Visualization

### Recharts 3.4.1
**Why**: React charting library built on D3.

**Charts Used**:
- Line charts (cash flow)
- Bar charts (category spending)
- Pie charts (budget breakdown)
- Area charts (trends)

## Additional Libraries

### date-fns 4.1.0
**Why**: Modern, lightweight date manipulation.

**Alternatives**: moment.js (heavier), dayjs

### Zod 4.1.12
**Why**: TypeScript-first schema validation.

**Use Case**: API request validation

### Lucide React 0.542.0
**Why**: Beautiful, consistent icon library.

**Alternative**: Heroicons, Feather Icons

### Sonner 2.0.7
**Why**: Toast notifications.

**Features**: Customizable, promise-based, stacking

### clsx & tailwind-merge
**Why**: Conditional className utilities.

## Development Tools

### ESLint 9
**Why**: Code quality and consistency.

**Config**: `eslint-config-next`

### Prisma Studio
**Why**: Visual database management.

**Usage**: `npm run db:studio`

## Package Manager

### npm
**Why**: Standard, reliable, no extra configuration.

**Alternatives**: yarn, pnpm

## Deployment

### Vercel (Recommended)
**Why**: Built by Next.js creators, zero-config.

**Features**:
- Automatic deployments
- Preview URLs
- Edge network
- Environment variables

**Alternative**: Railway, Render, DigitalOcean

## Dependencies Summary

```json
{
  "next": "15.2.4",
  "react": "^19.0.0",
  "typescript": "^5",
  "prisma": "^6.19.0",
  "@google/generative-ai": "^0.24.1",
  "next-auth": "^4.24.13",
  "tailwindcss": "^4.1.12",
  "recharts": "^3.4.1",
  // ... see package.json for complete list
}
```

## Version Requirements

- **Node.js**: >=20.18 <23
- **npm**: 9.x or higher
- **PostgreSQL**: 14+ (via Neon)

## Related Documentation

- [Project Structure](./project-structure.md)
- [Authentication](./authentication.md)
- [AI Integration](./ai-integration.md)

---
