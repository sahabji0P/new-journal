# Runtime Pipelines

> Audience: engineers who need the exact runtime flows and activation conditions
> Last Updated: March 6, 2026

## Pipeline Index

1. Workspace boot and sync
2. Saathi generation and orchestration
3. Saathi confirmation and apply
4. Attachment ingestion and bill analysis
5. Transaction mutation cascade
6. Budget planning and watchlist linking
7. Recurring transaction processing
8. Insight generation
9. Settlement group collaboration

## 1. Workspace Boot And Sync

### When it is active

- whenever `AppProvider` mounts for an authenticated user

### Entry point

- `contexts/AppContext.tsx`
- backend: `GET /api/sync`

### What it does

The client starts two fetches in parallel:

- `/api/sync?scope=core`
- `/api/sync?scope=advanced&includeTransactions=true`

### Why it is split

The app becomes interactive earlier by loading core workspace state first and heavier or secondary state second.

### Core sync payload

- accounts
- recent transactions, capped to 300
- budgets
- categories
- unread notifications
- settings

### Advanced sync payload

- full transactions, when requested
- parties
- goals
- watchlists
- recurring transactions
- templates
- personal settlements
- settlement groups
- settlement invitations
- receipts

### UI stages

`AppContext` exposes:

- `preparing`
- `syncing`
- `organizing`
- `ready`

### Important side effects

- selected account filters default to all loaded accounts
- once initialized, recurring processing starts on an hourly interval

## 2. Saathi Generation And Orchestration

### When it is active

- whenever the user sends a chat message from `SaathiWorkspace`

### Entry point

- `POST /api/chat`

### Steps

1. authenticate the user
2. validate payload and sanitize attachments
3. persist the user `ChatMessage`
4. build recent conversation from local plus database history
5. choose the LLM provider
6. select only the context resources needed for the message
7. load core knowledge plus live runtime context
8. build the final prompt
9. call Gemini or OpenRouter
10. normalize the structured response
11. preflight generated tool calls
12. auto-execute generated read tools
13. convert generated write tools into draft or confirm cards
14. persist the assistant `ChatMessage`
15. persist audit logs
16. invalidate affected cache scopes

### Outputs

- assistant text
- cards
- executed tool summaries
- mutations

### Related detail

See [Chat Router](./chat-router.md).

## 3. Saathi Confirmation And Apply

### When it is active

- when the user approves a confirm card
- when the user submits an editable draft card
- when the user bulk-applies multiple pending cards
- when the user sends a confirmation reply like "yes" and the router infers pending actions from the last assistant message

### Entry point

- `POST /api/chat` with `toolRequests`

### What it does

The workspace does not call domain APIs directly from card buttons. It sends explicit tool requests back to the chat router.

The router then:

1. skips model generation
2. loads only the context required for those tools
3. executes the selected tools
4. persists a new assistant message with results
5. emits mutation metadata

### Why this matters

The same safety, logging, and metadata model is reused for both:

- normal conversation turns
- explicit apply actions

## 4. Attachment Ingestion And Bill Analysis

## 4A. Saathi attachment pipeline

### When it is active

- when the user sends images or audio in `SaathiWorkspace`

### Entry point

- `components/chat/SaathiWorkspace.tsx`
- `POST /api/chat`

### What it does

1. converts local files to data URLs
2. drops files above 6 MB in the composer
3. sends surviving attachments to `/api/chat`
4. server revalidates data URLs and length
5. provider receives multimodal payload when supported

### Current provider behavior

- Gemini receives inline images and audio
- OpenRouter receives images, but audio is only summarized in text

## 4B. Settlement bill-analysis pipeline

### When it is active

- when a user uploads a bill image in a settlement group chat

### Entry point

- `POST /api/settlements/groups/[groupId]/analyze-bill`
- helper: `lib/settlements/bill-analyzer.ts`

### What it does

1. verify the requester is a group member
2. send the image to Gemini with a dedicated receipt-extraction prompt
3. parse the JSON response into merchant/items/subtotal/tax/total
4. create a `SettlementGroupMessage` of type `bill_analysis`
5. broadcast the message over Pusher
6. return the analysis result to the caller

### Success path

- the UI opens the add-expense sheet prefilled with the extracted bill data

### Failure path

- a `bill_analysis` message is still created, but with a failure note and metadata showing extraction failed

## 5. Transaction Mutation Cascade

### When it is active

- `POST /api/transactions`
- `PUT /api/transactions`
- `DELETE /api/transactions`
- the same paths when triggered through Saathi tools

### What it does

This is one of the most important pipelines in the app.

### On create

1. validate required fields
2. normalize the amount as signed:
   - expense -> negative
   - income -> positive
3. normalize tags, shared splits, and total amount
4. compute budget-impact amount for shared expenses
5. create the transaction
6. update the account balance
7. upsert the party if present
8. update matching budgets and sub-budgets for expense impact
9. create budget threshold notifications when crossings happen
10. invalidate caches

### On update

1. load the existing transaction
2. compute the next normalized amount/type/date/account/shared payload
3. reverse the old account balance impact
4. apply the new account balance impact
5. update the transaction
6. upsert a new party if the update introduces one
7. reverse prior budget impact if the old row was an expense
8. apply new budget impact if the new row is an expense
9. invalidate caches

### On delete

1. load the existing transaction
2. reverse its account balance impact
3. delete the transaction
4. reverse budget impact if it was an expense
5. invalidate caches

### Shared-expense budget rule

Budget impact for a shared expense uses the user's own share, not always the gross total.

### Important current-state note

The collection route `/api/transactions` contains the full budget-cascade logic.

The thin convenience route `/api/transactions/[id]` exists, but it is not used by the main app flows and it does not mirror the full collection-route cascade behavior.

## 6. Budget Planning And Watchlist Linking

## 6A. Budget lifecycle pipeline

### When it is active

- `POST /api/budgets`
- `PUT /api/budgets`
- `DELETE /api/budgets`
- `/api/budgets/summary`

### What it does

Budget create/update performs:

1. method and period normalization
2. warning/critical threshold normalization
3. optional preset expansion into sub-budgets
4. optional goal linking
5. enforcement-mode persistence
6. monthly-budget exclusivity:
   - if a monthly budget is created or activated, other active monthly budgets are deactivated

### Summary pipeline

`GET /api/budgets/summary` recalculates a read model for:

- month
- last 30 days
- custom range

and for scopes:

- `all`
- `personal`
- `shared`

It recomputes spending from transactions instead of trusting only the stored `budget.totalSpent`.

## 6B. Watchlist-to-budget link pipeline

### When it is active

- when a category watchlist with a `budgetLimit` is created

### Entry point

- `POST /api/watchlists`

### What it does

1. create the watchlist
2. if the watchlist is category-based and has a budget limit:
   - find the active monthly budget
   - create or expand the matching sub-budget allocation
   - create a monthly budget if none exists

### Why it matters

Watchlists are not only alerts. They can reshape the monthly budget model during creation.

## 7. Recurring Transaction Processing

### When it is active

- only after `AppContext` finishes initialization
- then every hour in the browser

### Entry point

- `contexts/AppContext.tsx`
- helper method: `processRecurringTransactions()`

### What it does

For each active recurring rule:

1. compare `nextDueDate` with today
2. if due and `autoCreate` is true:
   - create a transaction through the normal transaction pipeline
   - advance `nextDueDate`
3. if due and `autoCreate` is false:
   - create a reminder notification

### Important current-state note

This is client-driven, not server-scheduled.

There is no cron job, worker, queue, or background processor in this repository for recurring transactions.

## 8. Insight Generation

### When it is active

- only when `POST /api/insights/generate` is called

### Entry point

- `app/api/insights/generate/route.ts`

### What it does

1. load recent transactions, budgets, goals, and watchlists
2. resolve category names
3. compute this-month and last-month expense totals
4. compute category concentration
5. compute budget risk
6. compute watchlist matches
7. build heuristic insight objects
8. persist them to the `Insight` table
9. invalidate insight-related caches

### Important current-state note

- this pipeline is on-demand only
- the mounted analytics page does not currently call it
- the API-backed `InsightsPanel` is implemented but not mounted

## 9. Settlement Group Collaboration

## 9A. Group setup pipeline

### When it is active

- group creation
- invitation send
- invitation accept/decline

### Entry points

- `POST /api/settlements/groups`
- `POST /api/settlements/invitations`
- `PUT /api/settlements/invitations`

### What it does

Group creation:

1. create the group
2. create the creator as owner member
3. create a system message announcing group creation

Invitation send:

1. verify inviter is a member
2. verify the invitee exists as a registered user
3. upsert invitation
4. create a notification for the invitee

Invitation accept:

1. update invitation status
2. upsert group membership
3. create a system message saying the member joined
4. broadcast `member-joined` over Pusher

## 9B. Group chat pipeline

### When it is active

- whenever a settlement group chat is opened

### Entry points

- `hooks/use-group-chat.ts`
- `GET /api/settlements/groups/[groupId]/messages`
- `POST /api/settlements/groups/[groupId]/messages`
- `/api/pusher/auth`

### What it does

1. load the latest 50 messages
2. subscribe to `private-group-{groupId}`
3. bind message, expense, settlement, join, and typing events
4. support cursor-based pagination for older messages

This is a true active realtime pipeline in the current app.

## 9C. Group expense pipeline

### When it is active

- when a member adds a shared expense

### Entry point

- `POST /api/settlements/group-transactions`

### What it does

1. verify group access
2. load group members
3. normalize split mode:
   - equal
   - custom
   - percentage
4. validate that shares sum to the total
5. create `SettlementGroupTransaction`
6. create a linked `SettlementGroupMessage` of type `expense`
7. broadcast `expense-added` over Pusher

### Downstream effect

- balances and suggestions are recalculated by the UI or by the balances endpoint

## 9D. Group balance computation pipeline

### When it is active

- when group balances are requested
- when the workspace derives fallback balances locally

### Entry points

- `GET /api/settlements/groups/[groupId]/balances`
- `lib/settlements/group-ledger.ts`

### What it does

1. normalize each stored group transaction
2. separate expense rows from settlement rows
3. compute net balances per member
4. generate settlement suggestions

This same ledger logic is reused across sync payload mapping, group balances API, and local fallback derivation.

## 9E. Settlement payment pipeline

### When it is active

- when a debtor records a settlement payment

### Entry point

- `POST /api/settlements/groups/[groupId]/settlements`

### What it does

1. verify both users are group members
2. recompute balances from ledger state
3. cap the payment using `maximumAllowedSettlementCents`
4. create a settlement-type group transaction
5. create a recipient notification
6. create a linked settlement chat message
7. broadcast `settlement-recorded`

## 9F. Record-personal pipeline

### When it is active

- when a user chooses to record a group expense share into a personal account

### Entry point

- `POST /api/settlements/groups/[groupId]/record-personal`

### What it does

1. verify group membership
2. verify account ownership
3. load the group transaction
4. parse the user's share from the split data
5. create a personal expense transaction in the user's account
6. decrement the account balance
7. update the linked group chat message metadata with `recordedBy`
8. invalidate transaction and account caches

## 9G. Reminder pipeline

### When it is active

- when a group member sends a reminder to another member

### Entry point

- `POST /api/settlements/groups/[groupId]/reminders`

### What it does

1. verify membership
2. verify the recipient is in the group
3. create a notification for the recipient
4. invalidate recipient notification caches
