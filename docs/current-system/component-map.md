# Component Map And Connections

> Audience: engineers who want to understand how mounted parts of the app connect
> Last Updated: March 6, 2026

## 1. App Shell

### `app/layout.tsx`

This is the root composition point for the authenticated product shell.

Mounted here:

- `SessionProvider`
- `ThemeProvider`
- `AppProvider`
- `CommandPalette`
- `AppToaster`

Everything inside the authenticated application depends on this stack.

### `app/page.tsx`

- If a NextAuth session exists, the user is redirected to `/dashboard`.
- If there is no session, the landing page is rendered.

This means the conversational dashboard is the first in-product screen after sign-in.

## 2. Navigation And Page Shell

### `components/PageLayout.tsx`

Shared page chrome for most authenticated pages.

Connected to:

- `components/AppSidebar.tsx`
- theme toggle
- command palette trigger
- mobile sheet navigation

### `components/AppSidebar.tsx`

Current primary navigation:

- `Saathi` -> `/dashboard`
- `Analytics` -> `/analytics`
- `Settlements` -> `/settlements`
- `Transactions` subtree
- `Settings` subtree

This is the clearest product-level confirmation that Saathi is the current primary entry point.

## 3. Primary Entry: Saathi Workspace

### `app/dashboard/page.tsx`

This route renders:

- `PageLayout` with `fullBleed`
- `SaathiWorkspace`

### `components/chat/SaathiWorkspace.tsx`

This is the mounted conversational workspace.

Responsibilities:

- load chat history from `GET /api/chat`
- keep a local draft composer
- capture image and audio attachments
- serialize attachments to data URLs
- send user messages to `POST /api/chat`
- send confirmed card actions back to `POST /api/chat` as `toolRequests`
- store recent conversation in local storage
- dispatch `saathi:mutations` browser events after assistant replies
- track unresolved actionable cards per message

Connected to:

- `components/chat/SaathiAudioRecorder.tsx`
- `components/chat/SaathiMessageCards.tsx`
- `lib/saathi/local-history.ts`
- `app/api/chat/route.ts`
- `contexts/AppContext.tsx` indirectly through mutation refresh events

## 4. Saathi Card Layer

### `components/chat/SaathiMessageCards.tsx`

This is the execution surface for assistant metadata.

It renders:

- informational cards
- draft entity cards
- confirm cards
- interactive transaction editor cards
- bulk-apply controls for multiple actionable cards

Key behavior:

- actionable cards are draft entity cards and confirm cards
- resolved and dismissed card state is stored in `sessionStorage`
- confirming a card sends explicit `toolRequests` back to `/api/chat`
- draft transaction cards can be edited before submission

Connected to:

- `lib/saathi/schema.ts`
- `components/transactions/TransactionFormModern.tsx`
- `contexts/AppContext.tsx` for live transaction/account lookups

### `components/chat/SaathiAudioRecorder.tsx`

Browser-only recorder.

Responsibilities:

- capture microphone audio
- produce a local file for upload into the workspace composer
- fallback to manual upload when recording APIs are unavailable

## 5. State Hub

### `contexts/AppContext.tsx`

This is the main client-side state coordinator.

Responsibilities:

- boot the workspace through `/api/sync`
- hold the primary finance datasets in memory
- expose CRUD functions for most domains
- run optimistic transaction creation
- refresh affected slices after Saathi mutations
- run recurring processing on an hourly interval after initialization
- load settlement workspace data

Connected to:

- most feature pages and management components
- `/api/sync`
- domain APIs such as `/api/transactions`, `/api/budgets`, `/api/recurring`, `/api/settlements`, `/api/receipts`
- `saathi:mutations` custom browser event

## 6. Finance Management Surfaces

### Transactions area

Mounted routes:

- `/transactions`
- `/transactions/history`
- `/transactions/budget`
- `/transactions/recurring`
- `/transactions/templates`
- `/transactions/settlements`

Main connected components:

- `components/dashboard/Dashboard.tsx`
- `components/transactions/TransactionsList.tsx`
- `components/budget/BudgetManagement.tsx`
- `components/recurring/RecurringTransactionsManagement.tsx`
- `components/templates/TemplatesManagement.tsx`
- `components/settlements/SettlementsManagement.tsx`

All of these read and mutate data through `useApp()`, which then talks to the corresponding REST endpoints.

### Settings area

Mounted route:

- `/settings`

Connected components:

- `Accounts`
- `Categories`
- `Parties`
- `Preferences`
- `GeneralSettings`
- `SaathiLog`
- `UserAccount`

Notable detail:

- Goals and watchlists are currently reached through the "Advanced Tools" split panel, not a dedicated top-level route.

### Analytics area

Mounted route:

- `/analytics`

Connected components:

- `SpendingTrendsChart`
- `CategoryBreakdown`
- `InsightCards`

Important current-state detail:

- `InsightCards` is active.
- `InsightsPanel` is implemented but not mounted.
- Quick Stats cards on `/analytics` currently render placeholder `-` values.

## 7. Settlements Stack

### `app/settlements/page.tsx`

Mounts `SettlementsChatLayout`, the group-chat oriented settlements experience.

### `hooks/use-settlement-workspace.ts`

This is the high-level settlements orchestration hook.

Responsibilities:

- select current group
- open dialogs/sheets
- derive fallback balances and suggestions from group transactions
- call group and personal settlement actions exposed by `AppContext`

### `components/settlements/chat/GroupChatArea.tsx`

Connected to:

- `hooks/use-group-chat.ts`
- `useApp()` settlement actions
- dialogs for:
  - add expense
  - settle up
  - record in personal accounts

### `hooks/use-group-chat.ts`

Realtime chat hook for settlement groups.

Connected to:

- `GET /api/settlements/groups/[groupId]/messages`
- `POST /api/settlements/groups/[groupId]/messages`
- `POST /api/settlements/groups/[groupId]/analyze-bill`
- Pusher private channel `private-group-{groupId}`

Bound events:

- `new-message`
- `expense-added`
- `settlement-recorded`
- `member-joined`
- `typing`

## 8. API And Tooling Internals

### `app/api/chat/route.ts`

This is the effective Saathi orchestrator.

Connected to:

- prompt modules in `lib/saathi/*`
- `docs/saathi/CORE_KNOWLEDGE.md`
- CRUD route handlers for accounts, categories, parties, templates, transactions, and budgets
- `prisma.chatMessage`
- `prisma.saathiAuditLog`

### `lib/saathi/providers.ts`

Provider adapter layer.

Connected to:

- Gemini
- OpenRouter

### `lib/server-cache.ts`

Tagged cache wrapper used by most read routes and by sync/chat-context loaders.

## 9. Components Present But Not Mounted

### `components/chat/SaathiChat.tsx`

- Floating chat widget implementation.
- Still functional in isolation, but not mounted anywhere in the current route tree.

### `components/LazySaathiChat.tsx`

- Thin dynamic wrapper around `SaathiChat`.
- Not mounted.

### `components/chat/SaathiCardDock.tsx`

- Searchable shared-card browser for assistant metadata.
- Implemented but not mounted in `SaathiWorkspace`.

### `components/insights/InsightsPanel.tsx`

- Uses `/api/insights` and `/api/insights/generate`.
- Not mounted in the current route tree.

## 10. Connection Summary

If you want the shortest accurate map of the current system, use this:

- `app/page.tsx` sends signed-in users to `/dashboard`
- `/dashboard` mounts `SaathiWorkspace`
- `SaathiWorkspace` calls `/api/chat`
- `/api/chat` builds prompt + context, calls Gemini/OpenRouter, stages or executes tools, and persists metadata
- assistant metadata emits `mutations`
- `AppContext` listens for those mutations and refetches affected resource slices
- the rest of the product pages consume the same `AppContext` state and REST APIs
