# Memory And State

> Audience: engineers who need to understand what Saathi remembers, what the UI keeps in memory, and what is cached
> Last Updated: March 6, 2026

## 1. The Short Version

The current system has several kinds of memory, but it does not have a vector store, embeddings index, or long-term semantic memory service.

Saathi memory today is a combination of:

- live database context
- persisted chat history
- short local conversation memory
- assistant metadata summaries
- audit logs
- in-memory app state
- Next.js tagged caches

## 2. App State Memory

### `contexts/AppContext.tsx`

This is the main client-side in-memory state store.

It holds:

- accounts
- transactions
- budgets
- categories
- parties
- goals
- watchlists
- recurring transactions
- notifications
- settings
- templates
- settlements
- settlement groups
- settlement invitations
- receipts

This state is what most mounted pages render against.

### Important behavior

- transaction creation is optimistic and uses temporary ids
- post-Saathi mutations trigger targeted refetches instead of a full workspace reload

## 3. Server Cache Memory

### `lib/server-cache.ts`

Most read routes use tagged Next.js caching through `unstable_cache`.

Cache scopes include:

- accounts
- transactions
- budgets
- budget-summary
- categories
- parties
- goals
- watchlists
- recurring
- notifications
- settings
- templates
- settlements
- settlement-group-messages
- receipts
- insights
- chat-history
- chat-context
- sync-core
- sync-advanced

Invalidation happens through `invalidateUserCache(userId, scopes)`.

## 4. Saathi Runtime Context Memory

### `fetchChatContext()` in `app/api/chat/route.ts`

This is the live database-backed memory used during generation and tool execution.

Depending on message intent, it loads a subset of:

- accounts
- transactions
- budgets
- goals
- recent insights
- categories
- parties
- templates

### Cache behavior

- cache scope: `chat-context`
- cache duration: 30 seconds
- cache key includes:
  - current month
  - selected resource slices
  - whether runtime slices are included

### Why there are two modes

- generation mode loads broader runtime context, including goals and recent insights
- tool-execution mode often loads a smaller context without extra runtime slices

## 5. Persisted Chat Memory

### `prisma.chatMessage`

Every Saathi turn persists:

- `role`
- `content`
- `metadata`
- `createdAt`

Assistant metadata stores:

- `uiVersion`
- `provider`
- `cards`
- `executedTools`
- `mutations`

### What this is used for

- reloading conversation history in the workspace
- recovering pending draft/confirm actions on later confirmation turns
- summarizing prior card/tool context back into new prompts

## 6. Local Short-Term Memory

### `lib/saathi/local-history.ts`

The browser keeps a short rolling memory in `localStorage` under:

- `saathi:recent-conversation`

It stores up to 6 messages with small metadata fragments:

- cards
- executed tools
- provider
- mutations

### Why it exists

- avoids needing a full database read on every turn
- keeps enough card context nearby for immediate follow-up messages

### Current limit behavior

- cards are trimmed
- executed tools are trimmed
- mutations are trimmed
- only user and assistant roles are retained

## 7. Session-Scoped Card Memory

### `components/chat/SaathiMessageCards.tsx`

This component stores per-message UI state in `sessionStorage`.

Keys:

- `saathi-resolved-{messageId}`
- `saathi-dismissed-{messageId}`

### What this means

- draft or confirm cards can be resolved without changing the persisted chat message
- card UI state survives in-tab navigation but is not treated as canonical server state

## 8. Audit Memory

### `prisma.saathiAuditLog`

Every executed tool can create a durable audit row with:

- tool
- operation
- resource
- status
- summary
- details
- user request
- linked user and assistant message ids

### Why this matters

`ChatMessage` is conversation history.

`SaathiAuditLog` is operational history.

They are related, but not the same thing.

### Important current-state note

Clearing chat history through `DELETE /api/chat` does not clear `SaathiAuditLog`.

## 9. Prompt Knowledge Memory

### `docs/saathi/CORE_KNOWLEDGE.md`

This is the human-maintained knowledge document injected into the prompt.

It is loaded through `lib/saathi/core-knowledge.ts` and memoized for 5 minutes.

This is not user memory. It is product memory.

## 10. Metadata-As-Memory Pattern

One of the most important design choices in the current Saathi system is that prior assistant metadata is turned back into prompt text.

`normalizeRoleContentMessages()` compresses previous metadata into summaries such as:

- cards shown
- tools executed
- mutations produced
- provider used

This lets later turns "remember" that a draft card existed or that a tool already ran, without requiring a separate memory service.

## 11. Mutation Memory And Refresh

### `metadata.mutations`

Every successful tool execution can emit mutation descriptors such as:

- resource
- operation
- entity id
- affected cache scopes

### Browser event bridge

The chat UI dispatches:

- `saathi:mutations`

`AppContext` listens for this event and refetches only the affected resource slices.

This is the bridge between:

- Saathi's persisted response metadata
- the rest of the mounted application state

## 12. Settlement Chat Metadata Memory

Settlement group chat also uses JSON metadata as state memory.

Examples:

- bill analysis success/failure payloads on `SettlementGroupMessage.metadata`
- `recordedBy` tracking when users record a shared expense into personal accounts

This is separate from Saathi metadata, but it follows the same broad pattern of embedding UI-relevant state into JSON on message records.

## 13. What The System Does Not Remember

The current system does not have:

- embeddings
- vector retrieval
- long-horizon semantic memory
- cross-user shared Saathi memory
- a separate planner memory store
- a background knowledge synchronization job

If you want Saathi to know something that is not already in the prompt modules, chat history, or live database context, you currently need to add it through code or the core knowledge document.
