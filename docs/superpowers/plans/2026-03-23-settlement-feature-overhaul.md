# Settlement Feature Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken settlement functionality, clean up dead code/duplications, and redesign the settlement dashboard UI for a polished, cohesive experience.

**Architecture:** The settlements feature uses a chat-based three-pane layout (sidebar | chat | info panel). We fix broken wiring (settle-up from panel, typing indicators, notification links, record-in-accounts state, budget recalculation), remove dead code from the old tab-based UI, deduplicate the expense form, redesign the sidebar/group list for balance visibility, fix responsive layout issues, and polish all chat message cards.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma, Pusher

---

## File Structure

### Files to Create
- `hooks/use-media-query.ts` — SSR-safe responsive hook (replaces `window.innerWidth` in render)

### Files to Modify (Bug Fixes)
- `components/settlements/SettlementsChatLayout.tsx` — Fix settle-up-from-panel wiring, fix responsive info panel (SSR), fix layout height
- `components/settlements/chat/GroupChatArea.tsx` — Wire `emitTyping`, fix duplicate workspace reload, pass settle-up state from parent
- `components/settlements/chat/ChatComposer.tsx` — Call `emitTyping` on text input, use `toast.error` instead of `alert`
- `hooks/use-group-chat.ts` — Fix `userName: ""` in typing emit
- `app/api/settlements/groups/[groupId]/reminders/route.ts` — Fix broken `actionLink` path
- `app/api/settlements/groups/[groupId]/record-personal/route.ts` — Add budget recalculation after recording personal transaction
- `app/api/settlements/group-transactions/route.ts` — Add cache invalidation after mutation
- `components/settlements/chat/cards/ExpenseMessageCard.tsx` — Optimistic update for `recordedBy` metadata after recording
- `components/settlements/chat/RecordInAccountsDialog.tsx` — Use category `id` instead of `name`
- `components/settlements/group/GroupSuggestionsCard.tsx` — Use stable keys instead of array index

### Files to Modify (UI Redesign)
- `components/settlements/SettlementGroupList.tsx` — Redesign: remove Card wrapper, add balance indicators per group, better empty state
- `components/settlements/PendingInvitationsCard.tsx` — Remove Card wrapper, fix `font-mono`, add loading state on accept/decline
- `components/settlements/group/GroupStatsBar.tsx` — Fix layout for narrow panel (use `grid-cols-2` always, clearer "My Net" label)
- `components/settlements/group/GroupBalancesCard.tsx` — Add balance direction labels ("gets back" / "owes"), visual bar indicators
- `components/settlements/chat/ChatMessageList.tsx` — Fix scroll behavior on load-more, add initial loading skeleton, fix empty state flash
- `components/settlements/chat/ChatComposer.tsx` — Reorder layout (textarea first, toolbar below), disable actions during bill analysis
- `components/settlements/chat/cards/BillAnalysisCard.tsx` — Add loading state on confirm button, remove dead `onDismiss` prop
- `components/settlements/chat/cards/SettlementMessageCard.tsx` — Show notes, lighter pill-style design
- `components/settlements/chat/GroupInfoPanel.tsx` — Fix invite async handling, await the invite call properly

### Files to Delete (Dead Code)
- `components/settlements/SettlementsManagement.tsx`
- `components/settlements/SettlementGroupDetail.tsx`
- `components/settlements/group/GroupExpenseDialog.tsx`
- `components/settlements/group/GroupSettleDialog.tsx`
- `components/settlements/group/GroupOverviewTab.tsx`
- `components/settlements/group/GroupExpensesTab.tsx`
- `components/settlements/group/GroupMembersTab.tsx`
- `components/settlements/group/GroupActivityFeed.tsx`
- `app/transactions/settlements/page.tsx` (old route, if it exists)

---

## Task 1: Create `useMediaQuery` Hook

**Files:**
- Create: `hooks/use-media-query.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])

  return matches
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/use-media-query.ts
git commit -m "feat: add useMediaQuery hook for SSR-safe responsive behavior"
```

---

## Task 2: Fix Broken Settle-Up-From-Panel Flow

**Files:**
- Modify: `components/settlements/SettlementsChatLayout.tsx`
- Modify: `components/settlements/chat/GroupChatArea.tsx`

The "Settle Up" button in `GroupSuggestionsCard` → `GroupInfoPanel` → `SettlementsChatLayout.handleSettleUpFromPanel` currently voids the suggestion and does nothing. Fix it to open the `SettleUpSheet` with the suggestion preselected.

- [ ] **Step 1: In `SettlementsChatLayout.tsx`, add state for settle-up-from-panel**

Add state:
```typescript
const [settleUpFromPanel, setSettleUpFromPanel] = useState<SettlementGroupSuggestion | null>(null)
```

Replace `handleSettleUpFromPanel`:
```typescript
const handleSettleUpFromPanel = useCallback(
  (suggestion: SettlementGroupSuggestion) => {
    setSettleUpFromPanel(suggestion)
    setInfoPanelOpen(false)
  },
  []
)

const clearSettleUpFromPanel = useCallback(() => {
  setSettleUpFromPanel(null)
}, [])
```

Pass to `GroupChatArea`:
```tsx
<GroupChatArea
  group={selectedGroup}
  onToggleInfoPanel={() => setInfoPanelOpen(!infoPanelOpen)}
  onBack={handleBackToList}
  onBalancesChanged={loadSettlementWorkspace}
  settleUpSuggestion={settleUpFromPanel}
  onClearSettleUpSuggestion={clearSettleUpFromPanel}
/>
```

- [ ] **Step 2: In `GroupChatArea.tsx`, accept and use the suggestion props**

Add to interface:
```typescript
settleUpSuggestion?: SettlementGroupSuggestion | null
onClearSettleUpSuggestion?: () => void
```

Add effect to open sheet when suggestion arrives:
```typescript
useEffect(() => {
  if (settleUpSuggestion) {
    setPreselectedSuggestion(settleUpSuggestion)
    setSettleUpSheetOpen(true)
    onClearSettleUpSuggestion?.()
  }
}, [settleUpSuggestion, onClearSettleUpSuggestion])
```

- [ ] **Step 3: Verify flow works end-to-end and commit**

```bash
git add components/settlements/SettlementsChatLayout.tsx components/settlements/chat/GroupChatArea.tsx
git commit -m "fix: wire settle-up-from-panel to open SettleUpSheet with preselected suggestion"
```

---

## Task 3: Fix Typing Indicator System

**Files:**
- Modify: `hooks/use-group-chat.ts` — Fix `userName: ""` in emit
- Modify: `components/settlements/chat/GroupChatArea.tsx` — Pass `emitTyping` to composer
- Modify: `components/settlements/chat/ChatComposer.tsx` — Call `emitTyping` on text change

- [ ] **Step 1: Fix `userName` in `use-group-chat.ts`**

In `emitTyping`, find the line with `userName: ""` and change to pass the actual user name. The hook needs the user's name passed in or derived. Simplest: accept `userName` in the hook's options.

Update hook signature:
```typescript
export function useGroupChat(
  groupId: string,
  currentUserId: string,
  options?: { onBalancesChanged?: () => void; userName?: string }
)
```

In `emitTyping`:
```typescript
const emitTyping = useCallback(() => {
  if (!channelRef.current) return
  channelRef.current.trigger("client-typing", {
    userId: currentUserId,
    userName: options?.userName || "Someone",
  })
}, [currentUserId, options?.userName])
```

- [ ] **Step 2: In `GroupChatArea.tsx`, pass `emitTyping` and `userName` through**

Pass `userName` to `useGroupChat`:
```typescript
const userName = session?.user?.name || session?.user?.email || ""

const { ..., emitTyping } = useGroupChat(group.id, currentUserId, {
  onBalancesChanged,
  userName,
})
```

Pass `emitTyping` to `ChatComposer`:
```tsx
<ChatComposer
  ...
  onTyping={emitTyping}
/>
```

- [ ] **Step 3: In `ChatComposer.tsx`, call `emitTyping` on text input**

Add `onTyping` to interface and call with debounce:
```typescript
onTyping?: () => void
```

In `handleTextChange`:
```typescript
const handleTextChange = useCallback(
  (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    adjustHeight()
    onTyping?.()
  },
  [adjustHeight, onTyping]
)
```

Add a simple throttle using a ref (emit at most once per 2 seconds):
```typescript
const lastTypingRef = useRef(0)
// In handleTextChange, before calling onTyping:
const now = Date.now()
if (now - lastTypingRef.current > 2000) {
  lastTypingRef.current = now
  onTyping?.()
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/use-group-chat.ts components/settlements/chat/GroupChatArea.tsx components/settlements/chat/ChatComposer.tsx
git commit -m "fix: wire typing indicator - emit typing events from composer, fix empty userName"
```

---

## Task 4: Fix API Bugs

**Files:**
- Modify: `app/api/settlements/groups/[groupId]/reminders/route.ts:112` — Fix `actionLink`
- Modify: `app/api/settlements/group-transactions/route.ts` — Add cache invalidation
- Modify: `app/api/settlements/groups/[groupId]/record-personal/route.ts` — Add budget recalculation
- Modify: `components/settlements/chat/RecordInAccountsDialog.tsx:125` — Use category `id`

- [ ] **Step 1: Fix reminder actionLink**

In `reminders/route.ts` line 112, change:
```typescript
actionLink: `/transactions/settlements?group=${groupId}`,
```
to:
```typescript
actionLink: `/settlements?group=${groupId}`,
```

- [ ] **Step 2: Add cache invalidation to group-transactions route**

In `group-transactions/route.ts`, after the successful response creation (before the return), add cache invalidation for all group members:

```typescript
// Invalidate cache for all group members
const memberIds = group.members.map((m: { userId: string }) => m.userId)
for (const memberId of memberIds) {
  invalidateUserCache(memberId, [USER_CACHE_SCOPES.syncAdvanced])
}
```

Ensure the group query includes members in the select.

- [ ] **Step 3: Fix category value in RecordInAccountsDialog**

In `RecordInAccountsDialog.tsx` line 125, change:
```tsx
<SelectItem key={cat.id} value={cat.name}>
```
to:
```tsx
<SelectItem key={cat.id} value={cat.id}>
```

And update the API route `record-personal/route.ts` to accept category as an ID and look up the name, or keep using name — check what the `transaction.create` expects. Since the schema stores `category` as a string (the name), and the dialog now sends the ID, we need to either:
- Pass the category name from the dialog (keep using `cat.name` as value), OR
- Look up the category name server-side

Simplest fix: keep passing `cat.name` but fix the `value` prop to match. Actually the current code passes `cat.name` as value which IS the category name string. The real issue is that the `key` and `value` props should be distinct. Check if the current behavior is actually correct — `value={cat.name}` sends the category name string, which is what Prisma expects. So the "bug" is actually fine for the current schema. **Skip this substep — the current code is correct for how the schema stores categories as string names.**

- [ ] **Step 4: Add budget recalculation to record-personal route**

In `record-personal/route.ts`, after the transaction is created (inside the `$transaction` block or after it), add budget recalculation logic. Import the budget recalculation helper used by the main transactions route, or add inline logic:

After the `prisma.$transaction` block, find applicable budgets and update spending:
```typescript
// Recalculate affected budgets
const txnDate = groupTransaction.createdAt
const affectedBudgets = await prisma.budget.findMany({
  where: {
    userId: user.id,
    OR: [
      { startDate: { lte: txnDate }, endDate: { gte: txnDate } },
      { startDate: { lte: txnDate }, endDate: null },
    ],
  },
  include: { subBudgets: true },
})

for (const budget of affectedBudgets) {
  const expenseCategory = category || "Other"
  const sub = budget.subBudgets.find((sb) => sb.category === expenseCategory)

  if (sub) {
    await prisma.subBudget.update({
      where: { id: sub.id },
      data: { spent: { increment: Math.abs(shareAmount) } },
    })
  }

  await prisma.budget.update({
    where: { id: budget.id },
    data: { totalSpent: { increment: Math.abs(shareAmount) } },
  })
}
```

Add `USER_CACHE_SCOPES.budgets` to the invalidation call:
```typescript
invalidateUserCache(user.id, [
  USER_CACHE_SCOPES.transactions,
  USER_CACHE_SCOPES.accounts,
  USER_CACHE_SCOPES.budgets,
  USER_CACHE_SCOPES.syncCore,
])
```

- [ ] **Step 5: Commit**

```bash
git add app/api/settlements/groups/[groupId]/reminders/route.ts app/api/settlements/group-transactions/route.ts app/api/settlements/groups/[groupId]/record-personal/route.ts
git commit -m "fix: fix reminder link, add cache invalidation, add budget recalc on record-personal"
```

---

## Task 5: Fix Record-In-Accounts Optimistic UI Update

**Files:**
- Modify: `components/settlements/chat/GroupChatArea.tsx`
- Modify: `components/settlements/chat/cards/ExpenseMessageCard.tsx`

After recording in accounts, the "Record in my accounts" button should immediately show "Recorded" without needing a reload.

- [ ] **Step 1: In `GroupChatArea.tsx`, track locally recorded transaction IDs**

Add state:
```typescript
const [locallyRecordedTxns, setLocallyRecordedTxns] = useState<Set<string>>(new Set())
```

In `handleConfirmRecord`, after successful API response:
```typescript
if (recordingTransaction.transactionId) {
  setLocallyRecordedTxns(prev => new Set(prev).add(recordingTransaction.transactionId))
}
```

Pass to `ChatMessageList`:
```tsx
<ChatMessageList
  ...
  locallyRecordedTransactionIds={locallyRecordedTxns}
/>
```

- [ ] **Step 2: In `ChatMessageList`, pass through to `ExpenseMessageCard`**

Add `locallyRecordedTransactionIds?: Set<string>` to props. For each `ExpenseMessageCard`:
```tsx
<ExpenseMessageCard
  ...
  isLocallyRecorded={locallyRecordedTransactionIds?.has(msg.transactionId || "")}
/>
```

- [ ] **Step 3: In `ExpenseMessageCard`, use `isLocallyRecorded` prop**

Add `isLocallyRecorded?: boolean` to props. Change the `alreadyRecorded` derivation:
```typescript
const alreadyRecorded = isLocallyRecorded || recordedBy.includes(currentUserId)
```

- [ ] **Step 4: Commit**

```bash
git add components/settlements/chat/GroupChatArea.tsx components/settlements/chat/ChatMessageList.tsx components/settlements/chat/cards/ExpenseMessageCard.tsx
git commit -m "fix: optimistic UI update for record-in-accounts button"
```

---

## Task 6: Fix Layout Height & Responsive Info Panel

**Files:**
- Modify: `components/settlements/SettlementsChatLayout.tsx`

- [ ] **Step 1: Fix height calculation**

Replace:
```tsx
<div className="flex h-[calc(100vh-0px)] md:h-[calc(100vh-0px)] bg-background">
```
with:
```tsx
<div className="flex h-dvh bg-background">
```

This uses dynamic viewport height which is correct for fullBleed layouts (matches dashboard).

- [ ] **Step 2: Fix responsive info panel using useMediaQuery**

Import and use the hook:
```typescript
import { useMediaQuery } from "@/hooks/use-media-query"

const isDesktop = useMediaQuery("(min-width: 1280px)")
```

Replace the two-instance info panel rendering with a single conditional:

For desktop (xl+), render inline `<div>`:
```tsx
{selectedGroup && infoPanelOpen && isDesktop && (
  <div className="w-80 border-l overflow-y-auto">
    <GroupInfoPanel ... />
  </div>
)}
```

For mobile/tablet (<xl), render as Sheet:
```tsx
{selectedGroup && (
  <Sheet open={infoPanelOpen && !isDesktop} onOpenChange={setInfoPanelOpen}>
    <SheetContent side="right" className="w-[85vw] max-w-[24rem] p-0">
      ...
      <GroupInfoPanel ... />
    </SheetContent>
  </Sheet>
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/settlements/SettlementsChatLayout.tsx
git commit -m "fix: use h-dvh for layout height, SSR-safe responsive info panel via useMediaQuery"
```

---

## Task 7: Redesign Sidebar Group List

**Files:**
- Modify: `components/settlements/SettlementGroupList.tsx`

The current list wraps everything in a Card with header/title/description, which looks redundant inside the sidebar that already has a "Settlements" heading. It also shows no balance info per group.

- [ ] **Step 1: Rewrite `SettlementGroupList`**

Remove the `Card` wrapper entirely. Accept typed group data with balance info:

```typescript
interface SettlementGroupListProps {
  groups: Array<{
    id: string
    name: string
    description?: string
    members: Array<{ userId: string; name: string }>
    transactions: Array<{ id: string }>
    myBalance?: number
  }>
  selectedGroupId: string
  onSelectGroup: (id: string) => void
  onCreateGroup: () => void
  formatCurrency?: (amount: number) => string
}
```

Render a flat list with:
- Group name (bold)
- Member count + balance indicator (green "you get back X" / red "you owe X" / grey "settled up")
- Selected state with primary border
- Create group button at the top (compact, outline style)
- Empty state with illustration text

```tsx
export function SettlementGroupList({
  groups, selectedGroupId, onSelectGroup, onCreateGroup, formatCurrency,
}: SettlementGroupListProps) {
  return (
    <div className="p-2 space-y-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onCreateGroup}
        className="w-full gap-2 mb-2"
      >
        <Plus className="w-4 h-4" />
        New Group
      </Button>

      {groups.length === 0 ? (
        <div className="text-center py-8 px-4">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No groups yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Create a group to start splitting expenses
          </p>
        </div>
      ) : (
        groups.map((group) => {
          const balance = group.myBalance ?? 0
          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={cn(
                "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
                selectedGroupId === group.id
                  ? "bg-primary/8 border border-primary/30"
                  : "hover:bg-muted/50 border border-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">{group.name}</p>
                {formatCurrency && balance !== 0 && (
                  <span className={cn(
                    "text-xs font-medium shrink-0 ml-2",
                    balance > 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {balance > 0 ? "+" : ""}{formatCurrency(balance)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {group.members.length} members
              </p>
            </button>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `SettlementsChatLayout.tsx` to pass `formatCurrency` and `myBalance` to list**

The workspace hook already computes per-group balances. Pass them through:
```tsx
<SettlementGroupList
  groups={ws.settlementGroups.map(g => ({
    ...g,
    myBalance: ws.getGroupBalance(g.id),
  }))}
  selectedGroupId={ws.selectedGroupId}
  onSelectGroup={handleSelectGroup}
  onCreateGroup={() => ws.setGroupDialogOpen(true)}
  formatCurrency={ws.formatCurrency}
/>
```

If `ws.getGroupBalance` doesn't exist, we compute it from the group's `balances` array:
```typescript
// In SettlementsChatLayout, derive per-group balances:
const groupsWithBalance = useMemo(() =>
  ws.settlementGroups.map(g => {
    const myBal = g.balances?.find(b => b.userId === currentUserId)
    return { ...g, myBalance: myBal?.balance ?? 0 }
  }),
  [ws.settlementGroups, currentUserId]
)
```

- [ ] **Step 3: Commit**

```bash
git add components/settlements/SettlementGroupList.tsx components/settlements/SettlementsChatLayout.tsx
git commit -m "feat: redesign sidebar group list with balance indicators and compact layout"
```

---

## Task 8: Redesign Pending Invitations Card

**Files:**
- Modify: `components/settlements/PendingInvitationsCard.tsx`

- [ ] **Step 1: Remove Card wrapper, fix font-mono, add loading state**

Rewrite to be a lightweight inline component without Card wrapper:

```tsx
export function PendingInvitationsCard({
  invitations, onRespond,
}: PendingInvitationsCardProps) {
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    setRespondingId(id)
    try {
      await onRespond(id, action)
    } finally {
      setRespondingId(null)
    }
  }

  if (invitations.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-1">
        Pending Invitations
      </p>
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{inv.groupName}</p>
            <p className="text-xs text-muted-foreground">
              from {inv.invitedByName}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={respondingId === inv.id}
              onClick={() => handleRespond(inv.id, "decline")}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={respondingId === inv.id}
              onClick={() => handleRespond(inv.id, "accept")}
            >
              {respondingId === inv.id ? "..." : "Accept"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

Also update the `onRespond` prop type to return a Promise so we can await it:
```typescript
onRespond: (invitationId: string, action: "accept" | "decline") => Promise<void> | void
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/PendingInvitationsCard.tsx
git commit -m "feat: redesign pending invitations as lightweight inline cards with loading state"
```

---

## Task 9: Fix GroupStatsBar for Narrow Panel

**Files:**
- Modify: `components/settlements/group/GroupStatsBar.tsx`

- [ ] **Step 1: Use 2-column grid always, improve labels**

```tsx
export function GroupStatsBar({
  memberCount, entryCount, totalSpent, myNetBalance, formatCurrency,
}: GroupStatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</div>
        <div className="text-lg font-semibold mt-0.5">{memberCount}</div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</div>
        <div className="text-lg font-semibold mt-0.5">{entryCount}</div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Spent</div>
        <div className="text-lg font-semibold mt-0.5">{formatCurrency(totalSpent)}</div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {myNetBalance >= 0 ? "You Get Back" : "You Owe"}
        </div>
        <div className={cn(
          "text-lg font-semibold mt-0.5",
          myNetBalance > 0 ? "text-emerald-600" : myNetBalance < 0 ? "text-red-500" : ""
        )}>
          {formatCurrency(Math.abs(myNetBalance))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/group/GroupStatsBar.tsx
git commit -m "fix: use 2-col grid for stats bar, clarify balance direction labels"
```

---

## Task 10: Fix GroupBalancesCard with Direction Labels

**Files:**
- Modify: `components/settlements/group/GroupBalancesCard.tsx`

- [ ] **Step 1: Add direction labels and visual bars**

```tsx
export function GroupBalancesCard({ balances, formatCurrency }: GroupBalancesCardProps) {
  const maxAbs = Math.max(...balances.map(b => Math.abs(b.balance)), 1)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Balances</div>
      {balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No balances yet.</p>
      ) : (
        <div className="space-y-2">
          {balances.map((b) => (
            <div key={b.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{b.name}</span>
                <span className={cn(
                  "font-medium text-xs shrink-0 ml-2",
                  b.balance > 0 ? "text-emerald-600" : b.balance < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {b.balance > 0 ? "gets back " : b.balance < 0 ? "owes " : ""}
                  {formatCurrency(Math.abs(b.balance))}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    b.balance > 0 ? "bg-emerald-500" : b.balance < 0 ? "bg-red-400" : "bg-muted-foreground/30"
                  )}
                  style={{ width: `${Math.min((Math.abs(b.balance) / maxAbs) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/group/GroupBalancesCard.tsx
git commit -m "feat: add direction labels and visual bars to balance card"
```

---

## Task 11: Fix GroupSuggestionsCard Stable Keys

**Files:**
- Modify: `components/settlements/group/GroupSuggestionsCard.tsx`

- [ ] **Step 1: Replace `key={i}` with stable key**

Change line 43-44:
```tsx
{suggestions.map((s, i) => (
  <div key={i}
```
to:
```tsx
{suggestions.map((s) => (
  <div key={`${s.fromUserId}-${s.toUserId}`}
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/group/GroupSuggestionsCard.tsx
git commit -m "fix: use stable keys for suggestion list items"
```

---

## Task 12: Fix ChatMessageList Scroll & Loading

**Files:**
- Modify: `components/settlements/chat/ChatMessageList.tsx`

- [ ] **Step 1: Fix scroll behavior on load-more**

The current `useEffect` scrolls to bottom whenever `messages.length` increases, which breaks "Load More" (user expects to stay where they were). Fix by only auto-scrolling for new messages at the end, not when loading older messages at the top.

```typescript
const isLoadingMoreRef = useRef(false)
const prevLengthRef = useRef(messages.length)

// Wrap the onLoadMore callback to track when we're loading older messages
const handleLoadMore = useCallback(() => {
  isLoadingMoreRef.current = true
  onLoadMore()
}, [onLoadMore])

useEffect(() => {
  if (messages.length > prevLengthRef.current) {
    if (!isLoadingMoreRef.current) {
      // New message added at the end — scroll to bottom
      const el = scrollRef.current
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    }
    isLoadingMoreRef.current = false
  }
  prevLengthRef.current = messages.length
}, [messages.length])
```

- [ ] **Step 2: Fix initial loading state**

The `isLoading && !hasMore` condition never shows because `hasMore` starts true. Fix:

Add a `isInitialLoad` check:
```typescript
// Show skeleton on very first load (messages empty AND loading)
{isLoading && messages.length === 0 && (
  <div className="flex-1 flex items-center justify-center py-4">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
)}
```

Remove the old `isLoading && !hasMore` block. Move the empty state check to after loading completes:
```typescript
if (messages.length === 0) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      <div className="text-center">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No messages yet</p>
        <p className="text-xs mt-1">Start by adding an expense or sending a message</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/settlements/chat/ChatMessageList.tsx
git commit -m "fix: preserve scroll position on load-more, fix initial loading state"
```

---

## Task 13: Fix ChatComposer Layout & Alerts

**Files:**
- Modify: `components/settlements/chat/ChatComposer.tsx`

- [ ] **Step 1: Replace `alert()` with `toast.error()`**

```typescript
import { toast } from "@/lib/toast"
```

Change line 76:
```typescript
alert("File size must be under 6MB")
```
to:
```typescript
toast.error("File size must be under 6MB")
```

- [ ] **Step 2: Disable expense/settle buttons during bill analysis**

Add `disabled={disabled || isAnalyzingBill}` to the Expense and Settle buttons (currently only the image button is disabled during analysis).

- [ ] **Step 3: Reorder layout — textarea + send first, toolbar below**

Swap the order so the message input is prominent and action buttons are secondary:

```tsx
return (
  <div className="border-t bg-background px-3 py-2 space-y-1.5">
    {isAnalyzingBill && (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing bill...
      </div>
    )}

    <div className="flex items-end gap-2">
      <textarea ... />
      <Button ... (send) />
    </div>

    <div className="flex items-center gap-1">
      <Button ... (image upload) disabled={disabled || isAnalyzingBill} />
      <Button ... (expense) disabled={disabled || isAnalyzingBill} />
      <Button ... (settle) disabled={disabled || isAnalyzingBill} />
    </div>
  </div>
)
```

- [ ] **Step 4: Commit**

```bash
git add components/settlements/chat/ChatComposer.tsx
git commit -m "fix: use toast for file errors, disable buttons during analysis, reorder composer layout"
```

---

## Task 14: Fix BillAnalysisCard Loading State

**Files:**
- Modify: `components/settlements/chat/cards/BillAnalysisCard.tsx`

- [ ] **Step 1: Add loading state to confirm button, remove dead onDismiss**

Remove `onDismiss` from the interface and all references. Add loading state:

```tsx
const [isConfirming, setIsConfirming] = useState(false)

const handleConfirm = () => {
  if (!result || isConfirming) return
  setIsConfirming(true)
  onConfirmAsExpense?.(result)
  // Note: the sheet opening will handle the reset
}
```

```tsx
{onConfirmAsExpense && (
  <Button
    size="sm"
    className="h-7 text-xs"
    disabled={isConfirming}
    onClick={handleConfirm}
  >
    {isConfirming ? "Opening..." : "Confirm as Expense"}
  </Button>
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/chat/cards/BillAnalysisCard.tsx
git commit -m "fix: add loading state to bill confirm button, remove dead onDismiss prop"
```

---

## Task 15: Fix SettlementMessageCard Design

**Files:**
- Modify: `components/settlements/chat/cards/SettlementMessageCard.tsx`

- [ ] **Step 1: Read current file**

Read `components/settlements/chat/cards/SettlementMessageCard.tsx` to understand current structure.

- [ ] **Step 2: Redesign as lighter pill-style, show notes**

Replace the heavy Card with a centered pill similar to SystemMessage but with more detail:

```tsx
export function SettlementMessageCard({
  content, createdAt, formatCurrency,
}: SettlementMessageCardProps) {
  let parsed: { fromName: string; toName: string; amount: number; notes?: string } | null = null
  try {
    parsed = JSON.parse(content)
  } catch {
    return <div className="text-sm text-muted-foreground text-center">Settlement recorded</div>
  }

  const time = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="flex justify-center py-1.5">
      <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-4 py-2">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium">{parsed.fromName}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{parsed.toName}</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(parsed.amount)}
          </span>
        </div>
        {parsed.notes && (
          <p className="text-xs text-muted-foreground">{parsed.notes}</p>
        )}
        <span className="text-[10px] text-muted-foreground/70">{time}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/settlements/chat/cards/SettlementMessageCard.tsx
git commit -m "feat: redesign settlement message as lightweight pill with notes display"
```

---

## Task 16: Fix GroupInfoPanel Invite Async Handling

**Files:**
- Modify: `components/settlements/chat/GroupInfoPanel.tsx`

- [ ] **Step 1: Properly await the invite call**

Change `handleInvite`:
```typescript
const handleInvite = async () => {
  // ... validation ...
  setIsInviting(true)
  try {
    await onInviteMember(email)
    setInviteEmail("")
    toast.success("Invitation sent")
  } catch {
    toast.error("Failed to send invitation")
  } finally {
    setIsInviting(false)
  }
}
```

Update the prop type to explicitly return Promise:
```typescript
onInviteMember: (email: string) => Promise<void>
```

- [ ] **Step 2: Commit**

```bash
git add components/settlements/chat/GroupInfoPanel.tsx
git commit -m "fix: properly await invite call with error handling and success toast"
```

---

## Task 17: Remove Dead Code

**Files:**
- Delete: `components/settlements/SettlementsManagement.tsx`
- Delete: `components/settlements/SettlementGroupDetail.tsx`
- Delete: `components/settlements/group/GroupExpenseDialog.tsx`
- Delete: `components/settlements/group/GroupSettleDialog.tsx`
- Delete: `components/settlements/group/GroupOverviewTab.tsx`
- Delete: `components/settlements/group/GroupExpensesTab.tsx`
- Delete: `components/settlements/group/GroupMembersTab.tsx`
- Delete: `components/settlements/group/GroupActivityFeed.tsx`

- [ ] **Step 1: Check if there's an old page route using them**

Search for `app/transactions/settlements/page.tsx` — if it exists and imports `SettlementsManagement`, delete it too.

- [ ] **Step 2: Delete all dead files**

```bash
rm components/settlements/SettlementsManagement.tsx
rm components/settlements/SettlementGroupDetail.tsx
rm components/settlements/group/GroupExpenseDialog.tsx
rm components/settlements/group/GroupSettleDialog.tsx
rm components/settlements/group/GroupOverviewTab.tsx
rm components/settlements/group/GroupExpensesTab.tsx
rm components/settlements/group/GroupMembersTab.tsx
rm components/settlements/group/GroupActivityFeed.tsx
```

- [ ] **Step 3: Verify no remaining imports reference deleted files**

```bash
grep -r "SettlementsManagement\|SettlementGroupDetail\|GroupExpenseDialog\|GroupSettleDialog\|GroupOverviewTab\|GroupExpensesTab\|GroupMembersTab\|GroupActivityFeed" --include="*.tsx" --include="*.ts" components/ app/ hooks/ lib/
```

Fix any dangling imports.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead settlement management components (~800 lines)"
```

---

## Task 18: Remove Duplicate `loadSettlementWorkspace` Call

**Files:**
- Modify: `components/settlements/chat/GroupChatArea.tsx`

- [ ] **Step 1: Remove the redundant reload after expense add**

In `handleAddExpense`, the call to `loadSettlementWorkspace()` at line 121 is redundant because the Pusher `expense-added` event already triggers `onBalancesChanged` which calls the same function. Remove it:

```typescript
const handleAddExpense = useCallback(
  async (data: { ... }) => {
    await addSettlementGroupTransaction({ ... })
    setExpenseSheetOpen(false)
    setBillPrefill(null)
    // Removed: await loadSettlementWorkspace() — Pusher event handles this
  },
  [group.id, addSettlementGroupTransaction]
)
```

Similarly, in `handleSettleUp`, the Pusher `settlement-recorded` event handles the refresh, but keep the explicit call here since the user expects immediate feedback and Pusher may have a delay.

- [ ] **Step 2: Commit**

```bash
git add components/settlements/chat/GroupChatArea.tsx
git commit -m "fix: remove redundant loadSettlementWorkspace call after expense add"
```

---

## Task 19: Build Verification

- [ ] **Step 1: Run the build to catch any TypeScript or import errors**

```bash
npm run build
```

- [ ] **Step 2: Fix any build errors**

Address any TypeScript errors, missing imports, or type mismatches.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Fix lint issues and commit**

```bash
git add -A
git commit -m "fix: resolve build and lint errors from settlement overhaul"
```
