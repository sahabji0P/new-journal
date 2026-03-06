# Chat Router, Orchestration, Prompts, And Tools

> Audience: engineers working on Saathi behavior
> Last Updated: March 6, 2026

## 1. The Real Entry Point

The current in-product conversation entry is:

- UI route: `/dashboard`
- API entry: `POST /api/chat`

`/dashboard` mounts `SaathiWorkspace`, and every user message or card-confirmation action eventually funnels into `app/api/chat/route.ts`.

This is the "chat router" in practice.

## 2. What Counts As The Orchestrator Today

There is no multi-agent swarm in this repository. The current system is a single orchestrated request pipeline with a few clearly separated roles.

### Orchestration roles

#### 1. UI initiator

Files:

- `components/chat/SaathiWorkspace.tsx`
- `components/chat/SaathiChat.tsx` (implemented but not mounted)

Responsibilities:

- collect the message
- attach local recent conversation
- attach optional image/audio payloads
- send explicit `toolRequests` when the user confirms card actions

#### 2. Chat router / orchestrator

File:

- `app/api/chat/route.ts`

Responsibilities:

- authenticate
- validate payload
- load recent conversation
- select provider
- fetch runtime context
- compose the final prompt
- generate structured response
- stage or execute tools
- persist assistant message and metadata
- persist Saathi audit logs
- invalidate caches

#### 3. Provider adapter

File:

- `lib/saathi/providers.ts`

Responsibilities:

- send prompt and attachments to Gemini or OpenRouter
- normalize model output into the structured JSON contract
- normalize tool aliases and malformed payload shapes

#### 4. Tool executor

Still inside:

- `app/api/chat/route.ts`

Responsibilities:

- resolve tool targets from prompt context
- call the same domain route handlers used elsewhere in the app
- return cards, execution summaries, and mutation metadata

#### 5. Mutation reconciler

File:

- `contexts/AppContext.tsx`

Responsibilities:

- listen for `saathi:mutations`
- refetch only the resource slices affected by the assistant action

## 3. Request Lifecycle

## Step 1: Validate and persist the user message

`POST /api/chat` accepts:

- `message`
- `recentConversation`
- `toolRequests`
- `attachments.images`
- `attachments.audio`

Guardrails:

- max 6 recent conversation messages
- max 8 tool requests
- max 3 images
- max 3 audio files
- oversized or invalid data URLs are dropped

The route always persists a `ChatMessage` row for the user request before generation begins.

## Step 2: Build the effective conversation window

The router combines:

- recent messages from the request body
- recent messages from `prisma.chatMessage` if the local window is short

Then it normalizes them through `normalizeRoleContentMessages()`.

Important behavior:

- previous assistant metadata is summarized back into the history text
- cards, executed tools, mutations, and provider labels are compressed into a short text summary

This is not vector memory. It is a compact rolling conversation window with metadata summarization.

## Step 3: Decide whether generation is needed

The router can skip model generation when:

- the request already contains explicit `toolRequests`
- the message is an obvious "clear everything" request that can be converted into `clear_core_data`

If neither applies, the router:

- fetches runtime context
- loads the core knowledge document
- builds the final prompt
- calls the selected LLM provider

## Step 4: Select runtime context

The router does not always fetch the full workspace.

`getGenerationContextResources()` uses keyword heuristics to fetch only the context slices needed for the message:

- accounts
- transactions
- budgets
- goals
- recent insights
- categories
- parties
- templates

Broad analysis words like "insight", "summary", "trend", or "health check" cause a full context load.

Quick-entry style messages force at least:

- accounts
- categories
- parties

## Step 5: Compose the final prompt

The final prompt is assembled from four reusable prompt modules plus live context.

### Prompt modules

- `lib/saathi/personality.ts`
- `lib/saathi/cards.ts`
- `lib/saathi/tools.ts`
- `docs/saathi/CORE_KNOWLEDGE.md`, loaded through `lib/saathi/core-knowledge.ts`

### What each module does

#### Personality prompt

Defines Saathi's tone and core behavior:

- practical and concise
- INR formatting
- stage create/update work for confirmation
- always confirm deletes
- do not invent records or ids

#### Card catalog prompt

Defines allowed card types:

- `text`
- `stats`
- `list`
- `entity`
- `budget`
- `action`
- `confirm`

This controls how the model expresses structured replies for the UI layer.

#### Tool catalog prompt

Defines the only tool calls the model may emit:

- accounts: view/create/update/delete
- categories: view/create/update/delete
- parties: view/create/update/delete
- templates: view/create/update/delete
- transactions: view/create/update/delete
- transaction creation from template
- budgets: view/create/update/delete
- budget snapshot
- workspace cleanup via `clear_core_data`

Important limitation:

Saathi does not currently have tool coverage for:

- goals
- watchlists
- recurring transactions
- notifications
- receipts
- personal settlements
- settlement groups

Those domains may appear in prompt context for analysis, but not for chat-driven mutation.

#### Core knowledge document

This is a Markdown file in `docs/saathi/CORE_KNOWLEDGE.md`.

It is read at runtime and memoized for 5 minutes. This is the easiest non-code place to update product understanding for Saathi.

### Runtime prompt additions

`buildPrompt()` also injects:

- current date
- last few turns of conversation
- financial summary for the current month
- account list
- category list
- party list
- template list
- budget list
- goal list
- recent insights
- recent transactions
- attachment summary
- the raw user message

## Step 6: Enforce the structured response contract

The model is asked to return only this JSON shape:

```json
{
  "assistantText": "string",
  "cards": [],
  "toolCalls": []
}
```

The server validates this shape with Zod in `lib/saathi/schema.ts`.

If the provider returns loose JSON or aliased tool names, `lib/saathi/providers.ts` normalizes:

- response field names
- tool aliases
- malformed action arrays

## Step 7: Determine the tool-call source

The router chooses one of five tool sources:

- `tool_requests`:
  - explicit tool requests from UI cards
- `inferred_clear`:
  - server-generated cleanup request for obvious wipe-all intents
- `generated`:
  - tool calls emitted by the LLM
- `confirmed`:
  - follow-up confirmation inferred from previous draft or confirm cards
- `none`

### Confirmation recovery

If the user replies with a confirmation-style message such as "yes", "go ahead", or similar, the router can recover pending actions from the last assistant message by reading draft and confirm cards from metadata.

That logic lives in `buildDraftToolCallsFromConversation()`.

## Step 8: Preflight generated tool calls

Generated tool calls go through additional checks before they are trusted.

Current preflight rules:

- generated `create_transaction` calls are blocked if description, category, or amount are missing
- generated `update_transaction` calls are blocked if selector or update payload is missing

Blocked generated calls are not executed. They are reported back in assistant text as held actions.

## Step 9: Stage writes, auto-run reads

This is one of the most important current behaviors.

### Auto-executed automatically

- generated read-only tools:
  - `view_accounts`
  - `view_categories`
  - `view_parties`
  - `view_templates`
  - `view_transactions`
  - `view_budgets`
  - `view_budget_snapshot`

### Never auto-executed when only model-generated

- create/update/delete tools
- `clear_core_data`

Instead, generated write tools are converted into draft or confirm cards. The user must explicitly approve them.

### Explicit user-approved tool requests

When tool requests come from:

- a confirm card button
- a draft card submission
- a bulk apply action

they execute immediately because the UI is acting as the confirmation step.

## 4. Tool Execution Architecture

Most tool execution reuses the same route handlers that the rest of the app already uses.

Imported handlers:

- `accountsGET/POST/PUT/DELETE`
- `categoriesGET/POST/PUT/DELETE`
- `partiesGET/POST/PUT/DELETE`
- `templatesGET/POST/PUT/DELETE`
- `budgetsGET/POST/PUT/DELETE`
- `transactionsGET/POST/PUT/DELETE`

This keeps Saathi aligned with the normal app-side business rules.

### Exceptions

Two important exceptions are handled directly in the chat route:

- `create_transaction_from_template`
  - looks up the template directly, then creates the transaction through `transactionsPOST`
- `clear_core_data`
  - deletes selected core entities directly through Prisma in a transaction

## 5. Tool Families And Backing APIs

### Accounts

- view/create/update/delete
- backed by `/api/accounts`

### Categories

- view/create/update/delete
- backed by `/api/categories`

### Parties

- view/create/update/delete
- backed by `/api/parties`

### Templates

- view/create/update/delete
- backed by `/api/templates`

### Transactions

- view/create/update/delete
- backed by `/api/transactions`
- special behavior:
  - account resolution from `accountId` or account name
  - category auto-creation if missing
  - settlement-category normalization for reimbursement-like language
  - selector-based resolution for updates and deletes

### Budgets

- view/create/update/delete
- budget snapshot
- backed by `/api/budgets`

### Workspace cleanup

- `clear_core_data`
- direct Prisma deletion flow
- currently scoped to:
  - accounts
  - transactions
  - categories
  - parties
  - templates
  - budgets

Dependency rule:

- clearing accounts or categories automatically includes transactions

## 6. Safety Model

### Delete safety

- delete tools require `confirm: true`
- if confirmation is missing, the router returns a confirm card instead of deleting

### Draft safety

- generated create/update actions become draft cards
- the user can edit the draft before applying it

### Transaction target safety

`update_transaction` and `delete_transaction` can resolve by:

- `transactionId`
- exact or partial description
- amount
- date
- party

If multiple matches remain, execution stops and asks for a narrower selector.

### Batch safety

- at most 8 tool calls per request
- bulk card apply respects this limit and truncates overflow

## 7. Card Model In The UI

Assistant metadata is stored as:

- `uiVersion`
- `provider`
- `cards`
- `executedTools`
- `mutations`

`SaathiMessageCards.tsx` splits cards into:

- informational cards
- actionable cards

Actionable cards are:

- `confirm`
- `entity` cards with `status: "draft"`

Informational cards are displayed directly.

Actionable cards are rendered in a focused flow with:

- direct confirm/apply actions
- dismiss controls
- optional bulk apply when multiple actionable cards are present

## 8. Persistence And Audit

### Chat history

Every request stores:

- one user `ChatMessage`
- one assistant `ChatMessage`

Assistant metadata is stored in the `metadata` JSON field.

### Audit logs

Each executed tool also creates a `SaathiAuditLog` row with:

- tool
- operation
- resource
- status
- summary
- details
- user request

The settings page reads these logs through `/api/settings/saathi-logs`.

Fallback behavior:

- if the audit table is unavailable, the route reconstructs log entries from assistant message metadata

## 9. Provider Behavior

### Provider selection

`resolveSaathiProvider()` chooses in this order:

- explicit `SAATHI_LLM_PROVIDER` if configured and its key exists
- Gemini if `GEMINI_API_KEY` exists
- OpenRouter if `OPENROUTER_API_KEY` exists

If neither provider key exists, chat requests fail.

### Gemini path

- provider library: `@google/generative-ai`
- default model: `gemini-2.5-flash`
- images and audio are sent as inline multimodal parts
- response MIME is forced to JSON

### OpenRouter path

- provider library: `openai`
- default model: `google/gemini-2.5-flash`
- images are sent as `image_url`
- audio is not sent as true audio input here; the router only adds a text note that audio attachments exist

Current implication:

- Gemini is the stronger path for multimodal chat in the current implementation
- OpenRouter currently has weaker audio handling

## 10. Attachment Handling

### In the workspace UI

- max 3 images
- max 3 audio files
- max 6 MB per file in the composer

### On the server

- data URL length capped at 8,000,000 characters
- invalid data URLs are dropped

### What the router does with them

- includes names and counts in the prompt
- sends image/audio blobs to the selected provider when supported
- allows attachment-only messages by using a fallback message:
  - "Please extract and organize transaction details from my attachments."

## 11. Output Of The Router

The route returns:

- persisted assistant message
- persisted user message

The assistant message metadata is the real control plane for the UI:

- cards drive rendering and confirmations
- executedTools show what actually ran
- mutations tell `AppContext` what to refetch

## 12. Important Current-State Limitations

- Chat is synchronous request/response. It is not streaming today.
- There is no vector database, embedding store, or semantic retrieval layer.
- There is no multi-agent planner/executor split.
- Goals and recent insights are visible to the model for analysis but not writable through tools.
- Chat cleanup only clears `ChatMessage` history. It does not remove `SaathiAuditLog` rows.
- `clear_core_data` only targets the core finance workspace; it does not remove goals, watchlists, recurring rules, settlements, receipts, notifications, or settings.
