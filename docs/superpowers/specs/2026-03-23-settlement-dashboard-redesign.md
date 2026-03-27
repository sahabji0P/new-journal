# Settlement Dashboard Redesign — Design Spec

## Goal

Replace the current chat-centric three-pane settlement layout with a dashboard-first experience. The landing page shows aggregated balances and a group card grid. Clicking a group opens a full-page group detail view with Dashboard, Chat, and Settings tabs.

## Navigation Structure

### `/settlements` — Main Dashboard
- **Balance summary**: Two expandable cards ("You Owe" / "You Get Back") showing aggregated amounts across all groups. Expanding shows per-person, per-group breakdown with quick actions (Settle Up / Remind).
- **Group grid**: 2-column card grid (1-col on mobile). Each card shows group name, member avatar stack, your net balance, total spending, unsettled count, last activity.
- **Pending invitations**: Dismissible banner above the grid when invitations exist.
- **"New Group" button** in the top area.
- **Empty states**: No groups → illustration + "Create your first group" CTA. All balances zero → both summary cards render with "All settled up" state.

### `/settlements/[groupId]` — Group Detail (full page)
- Back arrow → `/settlements`
- Three tabs managed via URL search param (`?tab=dashboard|chat|settings`), default `dashboard`
- **Dashboard tab**: Read-only group financial overview
- **Chat tab**: Existing full chat experience (messages, expense, settle up, bill scan)
- **Settings tab**: Members, invites, danger zone
- Shares parent `app/settlements/layout.tsx` (`PageLayout fullBleed showTopBar={false}`)

## Component Design

### Main Dashboard Components

**`SettlementsDashboard`** — Page-level component for `/settlements`
- Calls `useSettlementWorkspace` for data
- Aggregates balances across all groups to compute total "I owe" and "Owes me"
- Renders `BalanceSummaryCard` (x2), `PendingInvitesBanner`, group card grid, `CreateGroupDialog`

**`BalanceSummaryCard`** — Expandable card
- Props: `title: string`, `totalAmount: number`, `items: Array<{ personName: string, groupName: string, amount: number, userId: string, groupId: string }>`, `actionType: "settle" | "remind"`, `formatCurrency: (n: number) => string`, `onAction: (item) => void`
- Collapsed: Shows title + total amount with color (red for owe, green for get back)
- Expanded: List of individual debts/credits with action button per row
- `userId` in items is used for: "Settle Up" needs the `toUserId` for the settle-up sheet; "Remind" needs the `toUserId` for `sendSettlementGroupReminder`
- **"Settle Up" action**: Navigates to `/settlements/[groupId]?tab=chat&settleWith=[userId]`. The `GroupDetailPage` reads `settleWith` from search params and passes it as `initialSettleUpUserId` to `GroupChatTab`, which opens the `SettleUpSheet` with that user preselected.
- **"Remind" action**: Calls `sendSettlementGroupReminder` inline with toast feedback

**`GroupCard`** — Card for the grid
- Props: `group: SettlementGroup`, `currentUserId: string`, `formatCurrency: (n: number) => string`
- **Derived values computed client-side from existing `SettlementGroup` fields:**
  - `myBalance` = `group.balances?.find(b => b.userId === currentUserId)?.balance ?? 0` (net balance: positive = owed to you, negative = you owe)
  - `totalSpent` = `group.transactions.filter(t => t.transactionType === "expense").reduce((sum, t) => sum + t.totalAmount, 0)` (sum of expense totalAmounts)
  - `unsettledCount` = `(group.suggestions?.length ?? 0)` (number of pending settlement suggestions)
  - `lastActivity` = `group.transactions[0]?.createdAt ?? group.createdAt` (transactions are sorted newest-first from API)
- Shows: group name, truncated description, member avatar stack (up to 4 + overflow), myBalance (colored green/red/grey), totalSpent, unsettledCount, lastActivity as relative time
- Entire card is clickable → `router.push(\`/settlements/${group.id}\`)`

**`PendingInvitesBanner`** — Inline banner above the grid
- Shows pending invitations with Accept/Decline buttons and loading state
- Renders nothing if no pending invitations
- Reuses invite response logic from workspace hook

### Group Detail Components

**`GroupDetailPage`** — Page-level component for `/settlements/[groupId]`
- Header with back arrow, group name, member count
- Tab navigation (Dashboard | Chat | Settings) using shadcn `Tabs` component
- Active tab driven by `?tab=` search param, default `"dashboard"`
- Reads `?settleWith=` param and passes to `GroupChatTab` as `initialSettleUpUserId`
- Loads group data: first checks `ws.settlementGroups.find(g => g.id === groupId)`, falls back to calling `loadSettlementWorkspace()` and retrying

**`GroupDashboardTab`** — Read-only group overview
- Props: `group: SettlementGroup`, `currentUserId: string`, `formatCurrency: (n: number) => string`
- Stats row: Reuses `GroupStatsBar` (already 2-col grid)
- Balances section: Reuses `GroupBalancesCard`. Owner sees all member balances. Non-owner sees only their own balance context (filter balances to show all — the balance card already renders all balances, and seeing others' balances is useful context).
- Suggested settlements: Reuses `GroupSuggestionsCard`. "Settle Up" for own debts switches to Chat tab with settle-up sheet. "Remind" for credits sends reminder.
- Recent activity: Last 5-10 transactions rendered as a simple list (description, amount, paidBy, date). "View all in Chat" button switches to Chat tab.

**`GroupChatTab`** — Wraps existing chat components
- Props:
  ```typescript
  group: SettlementGroup
  currentUserId: string
  initialSettleUpUserId?: string  // From ?settleWith= param, opens SettleUpSheet preselected
  onBalancesChanged: () => void
  ```
- Internally manages all state currently in `GroupChatArea`: expense sheet, settle-up sheet, record dialog, bill prefill
- Reuses `ChatMessageList`, `ChatComposer`, `TypingIndicator`, `AddExpenseSheet`, `SettleUpSheet`, `RecordInAccountsDialog`
- No header (handled by `GroupDetailPage`) and no info panel toggle
- On mount, if `initialSettleUpUserId` is set, finds the matching suggestion and opens `SettleUpSheet` with it preselected

**`GroupSettingsTab`** — Group management
- Props: `group: SettlementGroup`, `currentUserId: string`, `isOwner: boolean`
- **Members list**: Name, email, role badge. Owner sees "Remove" button per non-owner member. Non-owners see "Leave Group" button for themselves. Confirmation dialog before action.
- **Invite form**: Email input + Invite button. Shows toast on error (e.g., unregistered email → "User not found on the platform"). Pending invitations list below with status.
- **Danger Zone** (owner only): "Delete Group" button. Confirmation dialog requires typing group name to confirm.

## New API Routes

### `DELETE /api/settlements/groups/[groupId]`
- `requireAuth()`, verify `user.id` is the group owner via `SettlementGroupMember` where `role === "owner"`
- Collect all member userIds before deletion (for cache invalidation)
- Single `prisma.settlementGroup.delete({ where: { id: groupId } })` — cascade rules in schema handle child records automatically
- Invalidate cache for all former members: `invalidateUserCache(memberId, [USER_CACHE_SCOPES.syncAdvanced])`
- Returns `{ success: true }` with status 200
- Error responses:
  - 401: Not authenticated
  - 403: `{ error: "Only the group owner can delete the group" }`
  - 404: `{ error: "Group not found" }`

### `DELETE /api/settlements/groups/[groupId]/members/[userId]`
- `requireAuth()`, verify caller is a group member
- **Remove member** (caller is owner, `userId !== caller.id`):
  - Verify caller has role `"owner"`
  - Delete `SettlementGroupMember` where `groupId + userId`
  - Create system message: "[Name] was removed from the group"
  - Broadcast via Pusher `member-removed` event
  - Returns `{ success: true }` with status 200
- **Leave group** (caller is self, `userId === caller.id`):
  - If caller role is `"owner"`: return 400 `{ error: "Group owner cannot leave. Transfer ownership or delete the group." }`
  - Delete `SettlementGroupMember` where `groupId + userId`
  - Create system message: "[Name] left the group"
  - Broadcast via Pusher `member-left` event
  - Returns `{ success: true }` with status 200
- **Error responses**:
  - 401: Not authenticated
  - 403: `{ error: "Only the group owner can remove members" }` (non-owner trying to remove someone else)
  - 400: `{ error: "Group owner cannot leave. Transfer ownership or delete the group." }` (owner trying to leave)
  - 404: `{ error: "Member not found in this group" }`
- Cache invalidation: `invalidateUserCache` for removed user + all remaining members with `syncAdvanced` scope

## Data Flow

### Aggregated Balance Computation
For the "I Owe" / "Owes Me" cards, aggregate across all groups using `group.suggestions`:
```
for each group in settlementGroups:
  for each suggestion in group.suggestions:
    if suggestion.fromUserId === currentUserId:
      iOwe.push({ personName: suggestion.toUserName, groupName: group.name, amount: suggestion.amount, userId: suggestion.toUserId, groupId: group.id })
    if suggestion.toUserId === currentUserId:
      owesMe.push({ personName: suggestion.fromUserName, groupName: group.name, amount: suggestion.amount, userId: suggestion.fromUserId, groupId: group.id })

totalIOwe = sum(iOwe.map(d => d.amount))
totalOwesMe = sum(owesMe.map(d => d.amount))
```

This uses `group.suggestions` which are already computed server-side via the greedy two-pointer algorithm in `group-ledger.ts`.

### Group Detail Data Loading
`/settlements/[groupId]` page loads data via:
1. Check if group exists in workspace state: `ws.settlementGroups.find(g => g.id === groupId)`
2. If not found (e.g., deep link), call `loadSettlementWorkspace()` which fetches from `GET /api/settlements/groups`
3. For chat: `useGroupChat` hook manages messages + Pusher subscription (unchanged)
4. For balances: use `group.balances` and `group.suggestions` from workspace data

### Cross-Tab Settle-Up Trigger
When "Settle Up" is clicked from `BalanceSummaryCard` or `GroupDashboardTab`:
1. Navigate to `/settlements/[groupId]?tab=chat&settleWith=[userId]`
2. `GroupDetailPage` reads `settleWith` from `useSearchParams()`
3. Passes `initialSettleUpUserId` to `GroupChatTab`
4. `GroupChatTab` on mount finds the matching suggestion where `fromUserId === currentUserId && toUserId === initialSettleUpUserId`
5. Opens `SettleUpSheet` with that suggestion preselected
6. After opening, clears the search param via `router.replace` to prevent re-triggering on tab switch

## File Structure

### New Files
```
app/settlements/[groupId]/page.tsx
components/settlements/dashboard/SettlementsDashboard.tsx
components/settlements/dashboard/BalanceSummaryCard.tsx
components/settlements/dashboard/GroupCard.tsx
components/settlements/dashboard/PendingInvitesBanner.tsx
components/settlements/group-detail/GroupDetailPage.tsx
components/settlements/group-detail/GroupDashboardTab.tsx
components/settlements/group-detail/GroupChatTab.tsx
components/settlements/group-detail/GroupSettingsTab.tsx
app/api/settlements/groups/[groupId]/members/[userId]/route.ts
```

### Modified Files
```
app/settlements/page.tsx — Render SettlementsDashboard instead of SettlementsChatLayout
app/api/settlements/groups/[groupId]/route.ts — Add DELETE method
hooks/use-settlement-workspace.ts — Add cross-group aggregation helpers (iOwe, owesMe, totals)
contexts/AppContext.tsx — Add deleteSettlementGroup, removeSettlementGroupMember methods
```

### Removed Files
```
components/settlements/SettlementsChatLayout.tsx
components/settlements/SettlementGroupList.tsx
```

## Constraints
- No new database models needed — all data exists
- The `useGroupChat` hook and Pusher integration remain unchanged
- All existing chat card components (ExpenseMessageCard, SettlementMessageCard, BillAnalysisCard, SystemMessage) are reused as-is
- Existing group sub-components reused: `GroupStatsBar`, `GroupBalancesCard`, `GroupSuggestionsCard`, `CreateGroupDialog`
- Follows existing patterns: `requireAuth()`, `userId` filtering, cache invalidation, optimistic updates
- Mobile: Single column layout, tabs remain accessible, cards stack vertically
