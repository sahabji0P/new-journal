# API Surface

> Audience: engineers who need the current route inventory and what each route is for
> Last Updated: March 6, 2026

## How To Read This File

- "Mounted caller" means a current UI path uses the route.
- "Saathi tool" means the chat router can call the route through a tool family.
- If a route exists but is not part of the main mounted flows, that is called out explicitly.

## 1. Auth And Session

### `/api/auth/[...nextauth]`

- NextAuth entry for Google OAuth and session handling.
- Mounted caller:
  - sign-in flow from `/`

### Middleware

- `middleware.ts` protects app routes and leaves `/api` to route-level auth checks.

## 2. Platform And Boot

### `/api/sync`

- Methods:
  - `GET`
- Mounted caller:
  - `AppContext`
- Purpose:
  - two-phase workspace boot payload
- Modes:
  - `scope=core`
  - `scope=advanced`
  - `scope=full`

### `/api/settings`

- Methods:
  - `GET`
  - `PUT`
- Mounted caller:
  - settings pages
  - sync payload indirectly
- Purpose:
  - load and update user preferences

### `/api/settings/saathi-logs`

- Methods:
  - `GET`
- Mounted caller:
  - Settings -> Saathi Log tab
- Purpose:
  - fetch persisted Saathi audit history or rebuild it from assistant metadata as fallback

## 3. Saathi

### `/api/chat`

- Methods:
  - `GET`
  - `POST`
  - `DELETE`
- Mounted caller:
  - `SaathiWorkspace`
- Purpose:
  - load chat history
  - run the Saathi orchestration pipeline
  - clear chat history
- Important note:
  - `DELETE` removes chat history only, not Saathi audit logs

## 4. Core Finance Domains

### `/api/accounts`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - settings account management
  - AppContext refetch
- Saathi tool:
  - yes

### `/api/accounts/[id]`

- Methods:
  - `GET`
  - `PATCH`
  - `DELETE`
- Mounted caller:
  - none found in the current UI
- Purpose:
  - record-specific convenience route

### `/api/categories`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - settings category management
  - AppContext refetch
- Saathi tool:
  - yes

### `/api/parties`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - settings party management
  - AppContext refetch
- Saathi tool:
  - yes
- Important note:
  - `POST` uses upsert semantics to gracefully reuse an existing party by name

### `/api/transactions`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - transactions UI
  - AppContext CRUD
  - Saathi tool executor
- Saathi tool:
  - yes
- Important note:
  - this is the canonical transaction mutation route with the full account/budget cascade

### `/api/transactions/[id]`

- Methods:
  - `GET`
  - `PATCH`
  - `DELETE`
- Mounted caller:
  - none found in the current UI
- Purpose:
  - record-specific convenience route
- Important note:
  - thinner than the collection route and not the current main path for mutations

### `/api/templates`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - template management UI
  - AppContext refetch
- Saathi tool:
  - yes

### `/api/budgets`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - budget management UI
  - AppContext budget refetch
- Saathi tool:
  - yes

### `/api/budgets/summary`

- Methods:
  - `GET`
- Mounted caller:
  - budget management UI
- Purpose:
  - recompute period-aware budget summaries for all, personal, or shared scopes

### `/api/budgets/presets`

- Methods:
  - `GET`
- Mounted caller:
  - budget management UI
- Purpose:
  - return supported preset budget splits

## 5. Planning And Monitoring

### `/api/goals`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - goals management inside settings advanced tools
- Saathi tool:
  - no

### `/api/watchlists`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - watchlists management inside settings advanced tools
- Saathi tool:
  - no
- Important note:
  - creation may also update the active monthly budget model

### `/api/recurring`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - recurring transactions management UI
- Saathi tool:
  - no
- Important note:
  - API stores definitions only; execution happens client-side in `AppContext`

### `/api/notifications`

- Methods:
  - `GET`
  - `POST`
  - `PATCH`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - AppContext notification actions
  - supporting system pipelines
- Saathi tool:
  - no

## 6. Insights

### `/api/insights`

- Methods:
  - `GET`
  - `POST`
  - `PATCH`
- Mounted caller:
  - `InsightsPanel` only
- Mounted status:
  - route is implemented
  - panel is not currently mounted

### `/api/insights/generate`

- Methods:
  - `POST`
- Mounted caller:
  - `InsightsPanel` only
- Mounted status:
  - API exists
  - current mounted analytics page does not call it

## 7. Receipts

### `/api/receipts`

- Methods:
  - `GET`
  - `POST`
  - `DELETE`
- Mounted caller:
  - receipt upload/viewer flows
- Saathi tool:
  - no
- Important note:
  - receipts store `fileUrl` as the persisted image payload path or data URL

## 8. Personal Settlements

### `/api/settlements`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
- Mounted caller:
  - personal settlements UI
- Saathi tool:
  - no

## 9. Settlement Groups And Realtime

### `/api/settlements/groups`

- Methods:
  - `GET`
  - `POST`
- Mounted caller:
  - settlements workspace
- Purpose:
  - list groups for the current user
  - create a new group and owner membership

### `/api/settlements/invitations`

- Methods:
  - `GET`
  - `POST`
  - `PUT`
- Mounted caller:
  - settlements workspace
- Purpose:
  - list invitations
  - invite registered users
  - accept or decline invitations

### `/api/settlements/group-transactions`

- Methods:
  - `POST`
- Mounted caller:
  - settlements group expense flow
- Purpose:
  - create split expenses inside a group

### `/api/settlements/groups/[groupId]/messages`

- Methods:
  - `GET`
  - `POST`
- Mounted caller:
  - `useGroupChat`
- Purpose:
  - cursor-based message history
  - plain text group messages

### `/api/settlements/groups/[groupId]/analyze-bill`

- Methods:
  - `POST`
- Mounted caller:
  - bill upload flow inside settlements chat
- Purpose:
  - Gemini-backed receipt extraction for group expenses

### `/api/settlements/groups/[groupId]/balances`

- Methods:
  - `GET`
- Mounted caller:
  - settlements workspace
- Purpose:
  - compute balances and settlement suggestions from ledger state

### `/api/settlements/groups/[groupId]/settlements`

- Methods:
  - `GET`
  - `POST`
- Mounted caller:
  - settlements workspace
- Purpose:
  - list settlement-payment history
  - record settlement payments between members

### `/api/settlements/groups/[groupId]/reminders`

- Methods:
  - `POST`
- Mounted caller:
  - settlements workspace
- Purpose:
  - send debtor reminders as notifications

### `/api/settlements/groups/[groupId]/record-personal`

- Methods:
  - `POST`
- Mounted caller:
  - settlements "Record in accounts" dialog
- Purpose:
  - turn one user's share of a group expense into a personal transaction

### `/api/pusher/auth`

- Methods:
  - `POST`
- Mounted caller:
  - Pusher client auth inside `useGroupChat`
- Purpose:
  - authorize access to private settlement-group channels

## 10. Current External API Usage

### Google OAuth

- used by NextAuth
- required for sign-in

### Google Gemini

- used by `/api/chat` provider adapter
- used by settlement bill analysis

### OpenRouter

- optional alternative provider for `/api/chat`

### Pusher

- used by settlement group chat for:
  - new messages
  - expense-added
  - settlement-recorded
  - member-joined
  - typing

## 11. Saathi Tool Coverage Against API Surface

Saathi currently calls only this subset:

- `/api/accounts`
- `/api/categories`
- `/api/parties`
- `/api/templates`
- `/api/transactions`
- `/api/budgets`

It does not directly tool-call goals, watchlists, recurring rules, receipts, notifications, or settlement APIs.
