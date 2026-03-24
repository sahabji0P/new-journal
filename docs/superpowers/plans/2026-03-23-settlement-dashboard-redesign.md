# Settlement Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat-centric three-pane settlement layout with a dashboard-first experience: landing page with aggregated balances + group grid, and per-group detail pages with Dashboard/Chat/Settings tabs.

**Architecture:** New `/settlements` page renders a dashboard with balance summary cards and group card grid. New `/settlements/[groupId]` page renders a tabbed group detail view. Existing chat components are reused inside the Chat tab. Two new API routes handle group deletion and member removal.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma ORM, Pusher

**Spec:** `docs/superpowers/specs/2026-03-23-settlement-dashboard-redesign.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `app/settlements/[groupId]/page.tsx` | Group detail page entry point |
| `components/settlements/dashboard/SettlementsDashboard.tsx` | Main landing dashboard |
| `components/settlements/dashboard/BalanceSummaryCard.tsx` | Expandable "I Owe" / "Owes Me" card |
| `components/settlements/dashboard/GroupCard.tsx` | Individual group card for grid |
| `components/settlements/dashboard/PendingInvitesBanner.tsx` | Invitation banner |
| `components/settlements/group-detail/GroupDetailPage.tsx` | Tab container for group view |
| `components/settlements/group-detail/GroupDashboardTab.tsx` | Read-only group overview |
| `components/settlements/group-detail/GroupChatTab.tsx` | Chat experience wrapper |
| `components/settlements/group-detail/GroupSettingsTab.tsx` | Members, invites, danger zone |
| `app/api/settlements/groups/[groupId]/route.ts` | New file — group DELETE endpoint |
| `app/api/settlements/groups/[groupId]/members/[userId]/route.ts` | Member remove/leave endpoint |

### Modified Files
| File | Change |
|------|--------|
| `app/settlements/page.tsx` | Render `SettlementsDashboard` |
| `hooks/use-settlement-workspace.ts` | Add cross-group aggregation (`iOweItems`, `owesMeItems`) |
| `contexts/AppContext.tsx` | Add `deleteSettlementGroup`, `removeSettlementGroupMember` |

### Removed Files
| File | Reason |
|------|--------|
| `components/settlements/SettlementsChatLayout.tsx` | Replaced by dashboard + group detail |
| `components/settlements/SettlementGroupList.tsx` | Replaced by GroupCard grid |

---

## Task 1: New API Routes (Delete Group + Remove/Leave Member)

**Files:**
- Create: `app/api/settlements/groups/[groupId]/route.ts`
- Create: `app/api/settlements/groups/[groupId]/members/[userId]/route.ts`

- [ ] **Step 1: Create group DELETE endpoint**

Create `app/api/settlements/groups/[groupId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params

    // Verify ownership
    const membership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: user.id },
      select: { role: true },
    })

    if (!membership) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the group owner can delete the group" },
        { status: 403 }
      )
    }

    // Collect member IDs for cache invalidation
    const members = await prisma.settlementGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })

    // Cascade delete handles all child records
    await prisma.settlementGroup.delete({ where: { id: groupId } })

    // Invalidate cache for all former members
    for (const member of members) {
      invalidateUserCache(member.userId, [USER_CACHE_SCOPES.syncAdvanced])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting settlement group:", error)
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create member remove/leave endpoint**

Create `app/api/settlements/groups/[groupId]/members/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { broadcastToGroup } from "@/lib/pusher"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  try {
    const caller = await requireAuth()
    const { groupId, userId: targetUserId } = await params

    // Verify caller is a group member
    const callerMembership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: caller.id },
      select: { role: true },
    })

    if (!callerMembership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 })
    }

    // Find target member
    const targetMembership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: targetUserId },
      include: { user: { select: { name: true, email: true } } },
    })

    if (!targetMembership) {
      return NextResponse.json({ error: "Member not found in this group" }, { status: 404 })
    }

    const isSelf = caller.id === targetUserId
    const targetName = targetMembership.user.name || targetMembership.user.email || "A member"

    if (isSelf) {
      // Leave group
      if (callerMembership.role === "owner") {
        return NextResponse.json(
          { error: "Group owner cannot leave. Transfer ownership or delete the group." },
          { status: 400 }
        )
      }
    } else {
      // Remove member — only owner can do this
      if (callerMembership.role !== "owner") {
        return NextResponse.json(
          { error: "Only the group owner can remove members" },
          { status: 403 }
        )
      }
    }

    // Delete membership
    await prisma.settlementGroupMember.delete({
      where: { id: targetMembership.id },
    })

    // Create system message
    const systemContent = isSelf
      ? `${targetName} left the group`
      : `${targetName} was removed from the group`

    await prisma.settlementGroupMessage.create({
      data: {
        groupId,
        senderId: caller.id,
        senderName: targetName,
        type: "system",
        content: systemContent,
      },
    })

    // Broadcast
    try {
      await broadcastToGroup(groupId, isSelf ? "member-left" : "member-removed", {
        userId: targetUserId,
        name: targetName,
      })
    } catch {
      // Non-critical
    }

    // Invalidate caches
    const remainingMembers = await prisma.settlementGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })

    invalidateUserCache(targetUserId, [USER_CACHE_SCOPES.syncAdvanced])
    for (const m of remainingMembers) {
      invalidateUserCache(m.userId, [USER_CACHE_SCOPES.syncAdvanced])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing settlement group member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Verify both files compile**

Run: `npx tsc --noEmit 2>&1 | grep -E "(groups/\[groupId\]/route|members/\[userId\]/route)"`

---

## Task 2: Add AppContext Methods

**Files:**
- Modify: `contexts/AppContext.tsx`

- [ ] **Step 1: Add `deleteSettlementGroup` method**

Find the settlement methods section in AppContext (around the `sendSettlementGroupReminder` method). Add after it:

```typescript
const deleteSettlementGroup = useCallback(
  async (groupId: string) => {
    const res = await fetch(`/api/settlements/groups/${groupId}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Failed to delete group")
    }
    setSettlementGroups((prev) => prev.filter((g) => g.id !== groupId))
    return res.json()
  },
  []
)
```

- [ ] **Step 2: Add `removeSettlementGroupMember` method**

```typescript
const removeSettlementGroupMember = useCallback(
  async (groupId: string, userId: string) => {
    const res = await fetch(
      `/api/settlements/groups/${groupId}/members/${userId}`,
      { method: "DELETE" }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Failed to remove member")
    }
    // Update local state — remove member from group
    setSettlementGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          members: g.members.filter((m) => m.userId !== userId),
        }
      })
    )
    return res.json()
  },
  []
)
```

- [ ] **Step 3: Expose both in the context value object**

Add `deleteSettlementGroup` and `removeSettlementGroupMember` to the context provider value and the `AppContextType` interface.

---

## Task 3: Add Workspace Aggregation Helpers

**Files:**
- Modify: `hooks/use-settlement-workspace.ts`

- [ ] **Step 1: Add cross-group "I owe" / "Owes me" aggregation**

After the existing `myPendingInvites` memo (around line 337), add:

```typescript
const iOweItems = useMemo(() => {
  const items: Array<{
    personName: string
    groupName: string
    amount: number
    userId: string
    groupId: string
  }> = []
  for (const group of settlementGroups) {
    for (const suggestion of group.suggestions || []) {
      if (suggestion.fromUserId === currentUserId) {
        items.push({
          personName: suggestion.toUserName,
          groupName: group.name,
          amount: suggestion.amount,
          userId: suggestion.toUserId,
          groupId: group.id,
        })
      }
    }
  }
  return items
}, [settlementGroups, currentUserId])

const owesMeItems = useMemo(() => {
  const items: Array<{
    personName: string
    groupName: string
    amount: number
    userId: string
    groupId: string
  }> = []
  for (const group of settlementGroups) {
    for (const suggestion of group.suggestions || []) {
      if (suggestion.toUserId === currentUserId) {
        items.push({
          personName: suggestion.fromUserName,
          groupName: group.name,
          amount: suggestion.amount,
          userId: suggestion.fromUserId,
          groupId: group.id,
        })
      }
    }
  }
  return items
}, [settlementGroups, currentUserId])

const totalGroupIOwe = useMemo(
  () => iOweItems.reduce((sum, item) => sum + item.amount, 0),
  [iOweItems]
)

const totalGroupOwesMe = useMemo(
  () => owesMeItems.reduce((sum, item) => sum + item.amount, 0),
  [owesMeItems]
)
```

- [ ] **Step 2: Expose new values in the return object**

Add `iOweItems`, `owesMeItems`, `totalGroupIOwe`, `totalGroupOwesMe` to the return statement of `useSettlementWorkspace`.

---

## Task 4: Build Dashboard Components

**Files:**
- Create: `components/settlements/dashboard/GroupCard.tsx`
- Create: `components/settlements/dashboard/BalanceSummaryCard.tsx`
- Create: `components/settlements/dashboard/PendingInvitesBanner.tsx`
- Create: `components/settlements/dashboard/SettlementsDashboard.tsx`

- [ ] **Step 1: Create `GroupCard.tsx`**

```typescript
"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { SettlementGroup } from "@/lib/types"

interface GroupCardProps {
  group: SettlementGroup
  currentUserId: string
  formatCurrency: (n: number) => string
}

export function GroupCard({ group, currentUserId, formatCurrency }: GroupCardProps) {
  const router = useRouter()

  const myBalance = group.balances?.find((b) => b.userId === currentUserId)?.balance ?? 0
  const totalSpent = group.transactions
    .filter((t) => (t.transactionType || "expense") === "expense")
    .reduce((sum, t) => sum + t.totalAmount, 0)
  const unsettledCount = group.suggestions?.length ?? 0
  const lastActivity = group.transactions[0]?.createdAt ?? group.createdAt

  const timeAgo = getRelativeTime(lastActivity)

  return (
    <button
      onClick={() => router.push(`/settlements/${group.id}`)}
      className="w-full text-left rounded-xl border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
          {group.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {group.description}
            </p>
          )}
        </div>
        {myBalance !== 0 && (
          <span
            className={cn(
              "text-sm font-semibold shrink-0",
              myBalance > 0 ? "text-emerald-600" : "text-red-500"
            )}
          >
            {myBalance > 0 ? "+" : ""}
            {formatCurrency(myBalance)}
          </span>
        )}
        {myBalance === 0 && totalSpent > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">settled</span>
        )}
      </div>

      {/* Member avatars */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {group.members.slice(0, 4).map((m) => (
            <div
              key={m.userId}
              className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium"
              title={m.name}
            >
              {m.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          ))}
          {group.members.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium">
              +{group.members.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {group.members.length} members
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Spent: {formatCurrency(totalSpent)}</span>
        {unsettledCount > 0 && (
          <span className="text-amber-600">{unsettledCount} unsettled</span>
        )}
        <span className="ml-auto">{timeAgo}</span>
      </div>
    </button>
  )
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })
}
```

- [ ] **Step 2: Create `BalanceSummaryCard.tsx`**

```typescript
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BalanceItem {
  personName: string
  groupName: string
  amount: number
  userId: string
  groupId: string
}

interface BalanceSummaryCardProps {
  title: string
  totalAmount: number
  items: BalanceItem[]
  variant: "owe" | "owed"
  formatCurrency: (n: number) => string
  onSettle?: (item: BalanceItem) => void
  onRemind?: (item: BalanceItem) => void
}

export function BalanceSummaryCard({
  title,
  totalAmount,
  items,
  variant,
  formatCurrency,
  onSettle,
  onRemind,
}: BalanceSummaryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const colorClass = variant === "owe" ? "text-red-500" : "text-emerald-600"
  const bgClass = variant === "owe"
    ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
    : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"

  return (
    <div className={cn("rounded-xl border p-4 transition-all", bgClass)}>
      <button
        onClick={() => items.length > 0 && setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
        disabled={items.length === 0}
      >
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p className={cn("text-2xl font-bold mt-1", totalAmount > 0 ? colorClass : "")}>
            {formatCurrency(totalAmount)}
          </p>
        </div>
        {items.length > 0 && (
          <div className="text-muted-foreground">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        )}
      </button>

      {totalAmount === 0 && (
        <p className="text-xs text-muted-foreground mt-2">All settled up</p>
      )}

      {expanded && items.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          {items.map((item, i) => (
            <div
              key={`${item.groupId}-${item.userId}-${i}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{item.personName}</span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  ({item.groupName})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("font-semibold", colorClass)}>
                  {formatCurrency(item.amount)}
                </span>
                {variant === "owe" && onSettle && (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => onSettle(item)}>
                    Settle
                  </Button>
                )}
                {variant === "owed" && onRemind && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onRemind(item)}>
                    Remind
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `PendingInvitesBanner.tsx`**

A thin wrapper that reuses the updated `PendingInvitationsCard` logic. Can just re-export or wrap:

```typescript
"use client"

import { PendingInvitationsCard } from "@/components/settlements/PendingInvitationsCard"

interface PendingInvitesBannerProps {
  invitations: Array<{ id: string; groupName: string; invitedByName: string }>
  onRespond: (id: string, action: "accept" | "decline") => Promise<void> | void
}

export function PendingInvitesBanner({ invitations, onRespond }: PendingInvitesBannerProps) {
  if (invitations.length === 0) return null

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <PendingInvitationsCard invitations={invitations} onRespond={onRespond} />
    </div>
  )
}
```

- [ ] **Step 4: Create `SettlementsDashboard.tsx`**

```typescript
"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { BalanceSummaryCard } from "./BalanceSummaryCard"
import { GroupCard } from "./GroupCard"
import { PendingInvitesBanner } from "./PendingInvitesBanner"
import { CreateGroupDialog } from "@/components/settlements/CreateGroupDialog"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import { toast } from "@/lib/toast"

export function SettlementsDashboard() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const router = useRouter()
  const ws = useSettlementWorkspace()
  const { sendSettlementGroupReminder } = useApp()

  const handleSettle = useCallback(
    (item: { groupId: string; userId: string }) => {
      router.push(`/settlements/${item.groupId}?tab=chat&settleWith=${item.userId}`)
    },
    [router]
  )

  const handleRemind = useCallback(
    async (item: { groupId: string; userId: string; amount: number }) => {
      try {
        await sendSettlementGroupReminder({
          groupId: item.groupId,
          toUserId: item.userId,
          amount: item.amount,
        })
        toast.success("Reminder sent")
      } catch {
        toast.error("Failed to send reminder")
      }
    },
    [sendSettlementGroupReminder]
  )

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b shrink-0">
        <h1 className="text-lg font-semibold">Settlements</h1>
        <Button size="sm" onClick={() => ws.setGroupDialogOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6">
        {/* Balance summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BalanceSummaryCard
            title="You Owe"
            totalAmount={ws.totalGroupIOwe}
            items={ws.iOweItems}
            variant="owe"
            formatCurrency={ws.formatCurrency}
            onSettle={handleSettle}
          />
          <BalanceSummaryCard
            title="You Get Back"
            totalAmount={ws.totalGroupOwesMe}
            items={ws.owesMeItems}
            variant="owed"
            formatCurrency={ws.formatCurrency}
            onRemind={handleRemind}
          />
        </div>

        {/* Pending invitations */}
        <PendingInvitesBanner
          invitations={ws.myPendingInvites}
          onRespond={ws.respondToSettlementInvite}
        />

        {/* Group grid */}
        {ws.settlementGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create a group to start splitting expenses with friends
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => ws.setGroupDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ws.settlementGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={currentUserId}
                  formatCurrency={ws.formatCurrency}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={ws.groupDialogOpen}
        onOpenChange={ws.setGroupDialogOpen}
        groupName={ws.groupName}
        onGroupNameChange={ws.setGroupName}
        groupDescription={ws.groupDescription}
        onGroupDescriptionChange={ws.setGroupDescription}
        onSubmit={ws.onCreateGroup}
      />
    </div>
  )
}
```

---

## Task 5: Build Group Detail Components

**Files:**
- Create: `components/settlements/group-detail/GroupDashboardTab.tsx`
- Create: `components/settlements/group-detail/GroupChatTab.tsx`
- Create: `components/settlements/group-detail/GroupSettingsTab.tsx`
- Create: `components/settlements/group-detail/GroupDetailPage.tsx`

- [ ] **Step 1: Create `GroupDashboardTab.tsx`**

Reuses `GroupStatsBar`, `GroupBalancesCard`, `GroupSuggestionsCard`. Shows recent activity.

```typescript
"use client"

import { useMemo } from "react"
import { GroupStatsBar } from "@/components/settlements/group/GroupStatsBar"
import { GroupBalancesCard } from "@/components/settlements/group/GroupBalancesCard"
import { GroupSuggestionsCard } from "@/components/settlements/group/GroupSuggestionsCard"
import { Button } from "@/components/ui/button"
import type { SettlementGroup, SettlementGroupSuggestion } from "@/lib/types"

interface GroupDashboardTabProps {
  group: SettlementGroup
  currentUserId: string
  formatCurrency: (n: number) => string
  onSwitchToChat: () => void
  onSettleUp: (suggestion: SettlementGroupSuggestion) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
}

export function GroupDashboardTab({
  group,
  currentUserId,
  formatCurrency,
  onSwitchToChat,
  onSettleUp,
  onRemind,
}: GroupDashboardTabProps) {
  const totalSpent = useMemo(
    () =>
      group.transactions
        .filter((t) => (t.transactionType || "expense") === "expense")
        .reduce((sum, t) => sum + t.totalAmount, 0),
    [group.transactions]
  )

  const myNetBalance = useMemo(() => {
    const row = group.balances?.find((b) => b.userId === currentUserId)
    return row?.balance ?? 0
  }, [group.balances, currentUserId])

  const recentActivity = useMemo(
    () =>
      [...group.transactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [group.transactions]
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <GroupStatsBar
        memberCount={group.members.length}
        entryCount={group.transactions.length}
        totalSpent={totalSpent}
        myNetBalance={myNetBalance}
        formatCurrency={formatCurrency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupBalancesCard
          balances={group.balances || []}
          formatCurrency={formatCurrency}
        />

        <GroupSuggestionsCard
          suggestions={group.suggestions || []}
          currentUserId={currentUserId}
          formatCurrency={formatCurrency}
          onSettleUp={onSettleUp}
          onRemind={onRemind}
        />
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={onSwitchToChat}>
              View all in Chat
            </Button>
          </div>
          <div className="space-y-2">
            {recentActivity.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{txn.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {txn.transactionType === "settlement" ? "Settlement" : `Paid by ${txn.paidByName || "someone"}`}
                  </p>
                </div>
                <span className="font-semibold shrink-0 ml-2">
                  {formatCurrency(txn.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `GroupChatTab.tsx`**

Extracts the chat logic from existing `GroupChatArea.tsx`, minus the header and info panel:

```typescript
"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useGroupChat } from "@/hooks/use-group-chat"
import { ChatMessageList } from "@/components/settlements/chat/ChatMessageList"
import { ChatComposer } from "@/components/settlements/chat/ChatComposer"
import { TypingIndicator } from "@/components/settlements/chat/TypingIndicator"
import { AddExpenseSheet } from "@/components/settlements/chat/AddExpenseSheet"
import { SettleUpSheet } from "@/components/settlements/chat/SettleUpSheet"
import { RecordInAccountsDialog } from "@/components/settlements/chat/RecordInAccountsDialog"
import type {
  SettlementGroup,
  SettlementGroupSuggestion,
  BillAnalysisResult,
  GroupSplitShare,
} from "@/lib/types"
import { toast } from "@/lib/toast"

interface GroupChatTabProps {
  group: SettlementGroup
  initialSettleUpUserId?: string
  onBalancesChanged: () => void
}

export function GroupChatTab({
  group,
  initialSettleUpUserId,
  onBalancesChanged,
}: GroupChatTabProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const userName = session?.user?.name || session?.user?.email || ""
  const {
    formatCurrency,
    accounts,
    categories,
    addSettlementGroupTransaction,
    recordSettlementGroupPayment,
    loadSettlementWorkspace,
  } = useApp()

  const {
    messages,
    isLoadingMessages,
    hasMore,
    isSending,
    isAnalyzingBill,
    typingUsers,
    sendTextMessage,
    loadMore,
    analyzeBill,
    emitTyping,
  } = useGroupChat(group.id, currentUserId, { onBalancesChanged, userName })

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [settleUpSheetOpen, setSettleUpSheetOpen] = useState(false)
  const [billPrefill, setBillPrefill] = useState<BillAnalysisResult | null>(null)
  const [preselectedSuggestion, setPreselectedSuggestion] =
    useState<SettlementGroupSuggestion | null>(null)
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [recordingTransaction, setRecordingTransaction] = useState<{
    transactionId: string
    description: string
    shareAmount: number
  } | null>(null)
  const [locallyRecordedTxns, setLocallyRecordedTxns] = useState<Set<string>>(new Set())

  // Handle initial settle-up from URL param
  useEffect(() => {
    if (initialSettleUpUserId && group.suggestions) {
      const match = group.suggestions.find(
        (s) => s.fromUserId === currentUserId && s.toUserId === initialSettleUpUserId
      )
      if (match) {
        setPreselectedSuggestion(match)
        setSettleUpSheetOpen(true)
      }
    }
  }, [initialSettleUpUserId, group.suggestions, currentUserId])

  // ... All handlers identical to GroupChatArea (handleSendMessage, handleUploadBill,
  //     handleAddExpense, handleSettleUp, handleRecordInAccounts, handleConfirmRecord,
  //     handleConfirmBillAsExpense)
  // Copy them verbatim from GroupChatArea.tsx

  const handleSendMessage = useCallback(async (content: string) => {
    try { await sendTextMessage(content) } catch { toast.error("Failed to send message") }
  }, [sendTextMessage])

  const handleUploadBill = useCallback(async (imageDataUrl: string, mimeType: string) => {
    const result = await analyzeBill(imageDataUrl, mimeType)
    if (result.success && result.analysisResult) {
      setBillPrefill(result.analysisResult)
      setExpenseSheetOpen(true)
    }
  }, [analyzeBill])

  const handleAddExpense = useCallback(async (data: {
    description: string; totalAmount: number; paidByUserId: string;
    splitType: "equal" | "custom" | "percentage"; splitBetween: string[];
    shares: { userId: string; amount: number }[];
    percentageShares: { userId: string; percentage: number }[]; notes: string;
  }) => {
    await addSettlementGroupTransaction({ groupId: group.id, ...data })
    setExpenseSheetOpen(false)
    setBillPrefill(null)
  }, [group.id, addSettlementGroupTransaction])

  const handleSettleUp = useCallback(async (data: {
    fromUserId: string; toUserId: string; amount: number; notes: string;
  }) => {
    await recordSettlementGroupPayment({ groupId: group.id, ...data })
    setSettleUpSheetOpen(false)
    setPreselectedSuggestion(null)
    await loadSettlementWorkspace()
  }, [group.id, recordSettlementGroupPayment, loadSettlementWorkspace])

  const handleRecordInAccounts = useCallback((transactionId: string) => {
    const txn = group.transactions.find((t) => t.id === transactionId)
    if (!txn) return
    const userShare = txn.shares?.find((s: GroupSplitShare) => s.userId === currentUserId)
    if (!userShare) return
    setRecordingTransaction({ transactionId, description: txn.description, shareAmount: userShare.amount })
    setRecordDialogOpen(true)
  }, [group.transactions, currentUserId])

  const handleConfirmRecord = useCallback(async (data: { accountId: string; category: string }) => {
    if (!recordingTransaction) return
    try {
      const res = await fetch(`/api/settlements/groups/${group.id}/record-personal`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: recordingTransaction.transactionId, accountId: data.accountId, category: data.category }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Failed to record") }
      const result = await res.json()
      toast.success(`Expense recorded in ${result.accountName || "your account"}`)
      setLocallyRecordedTxns((prev) => new Set(prev).add(recordingTransaction.transactionId))
      setRecordDialogOpen(false)
      setRecordingTransaction(null)
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to record") }
  }, [recordingTransaction, group.id])

  return (
    <div className="flex flex-col h-full">
      <ChatMessageList
        messages={messages} currentUserId={currentUserId} isLoading={isLoadingMessages}
        hasMore={hasMore} onLoadMore={loadMore} formatCurrency={formatCurrency}
        onRecordInAccounts={handleRecordInAccounts}
        onConfirmBillAsExpense={(result) => { setBillPrefill(result); setExpenseSheetOpen(true) }}
        locallyRecordedTransactionIds={locallyRecordedTxns}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <ChatComposer
        onSendMessage={handleSendMessage} onUploadBill={handleUploadBill}
        onAddExpense={() => { setBillPrefill(null); setExpenseSheetOpen(true) }}
        onSettleUp={() => { setPreselectedSuggestion(null); setSettleUpSheetOpen(true) }}
        isSending={isSending} isAnalyzingBill={isAnalyzingBill} onTyping={emitTyping}
      />
      <AddExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={(open) => { setExpenseSheetOpen(open); if (!open) setBillPrefill(null) }}
        members={group.members} currentUserId={currentUserId}
        formatCurrency={formatCurrency} onSubmit={handleAddExpense} prefillData={billPrefill}
      />
      <SettleUpSheet
        open={settleUpSheetOpen}
        onOpenChange={(open) => { setSettleUpSheetOpen(open); if (!open) setPreselectedSuggestion(null) }}
        suggestions={group.suggestions || []} currentUserId={currentUserId}
        formatCurrency={formatCurrency} onSubmit={handleSettleUp}
        preselectedSuggestion={preselectedSuggestion}
      />
      {recordingTransaction && (
        <RecordInAccountsDialog
          open={recordDialogOpen}
          onOpenChange={(open) => { setRecordDialogOpen(open); if (!open) setRecordingTransaction(null) }}
          expenseDescription={recordingTransaction.description}
          shareAmount={recordingTransaction.shareAmount}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
          formatCurrency={formatCurrency} onSubmit={handleConfirmRecord}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `GroupSettingsTab.tsx`**

```typescript
"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/contexts/AppContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Crown, Trash2, LogOut, Mail, UserPlus, AlertTriangle } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/lib/toast"
import type { SettlementGroup } from "@/lib/types"

interface GroupSettingsTabProps {
  group: SettlementGroup
  currentUserId: string
  isOwner: boolean
}

export function GroupSettingsTab({ group, currentUserId, isOwner }: GroupSettingsTabProps) {
  const router = useRouter()
  const { deleteSettlementGroup, removeSettlementGroupMember, inviteToSettlementGroup, loadSettlementWorkspace } = useApp()

  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  // Remove/Leave confirmation
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "remove" | "leave"
    userId: string
    name: string
  } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Delete group confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleInvite = useCallback(async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) { toast.warning("Enter an email address"); return }
    setIsInviting(true)
    try {
      await inviteToSettlementGroup(group.id, email)
      setInviteEmail("")
      toast.success("Invitation sent")
      await loadSettlementWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation")
    } finally {
      setIsInviting(false)
    }
  }, [inviteEmail, group.id, inviteToSettlementGroup, loadSettlementWorkspace])

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmDialog) return
    setIsRemoving(true)
    try {
      await removeSettlementGroupMember(group.id, confirmDialog.userId)
      toast.success(confirmDialog.type === "leave" ? "You left the group" : `${confirmDialog.name} removed`)
      setConfirmDialog(null)
      if (confirmDialog.type === "leave") {
        router.push("/settlements")
      } else {
        await loadSettlementWorkspace()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed")
    } finally {
      setIsRemoving(false)
    }
  }, [confirmDialog, group.id, removeSettlementGroupMember, router, loadSettlementWorkspace])

  const handleDeleteGroup = useCallback(async () => {
    setIsDeleting(true)
    try {
      await deleteSettlementGroup(group.id)
      toast.success("Group deleted")
      router.push("/settlements")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group")
    } finally {
      setIsDeleting(false)
    }
  }, [group.id, deleteSettlementGroup, router])

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-2xl">
      {/* Members */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Members</h3>
        <div className="space-y-2">
          {group.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{member.name}</span>
                {member.userId === group.createdById && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <Crown className="h-3 w-3" /> Owner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{member.email}</span>
                {member.userId === currentUserId && !isOwner && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600"
                    onClick={() => setConfirmDialog({ type: "leave", userId: member.userId, name: member.name })}>
                    <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
                  </Button>
                )}
                {isOwner && member.userId !== currentUserId && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600"
                    onClick={() => setConfirmDialog({ type: "remove", userId: member.userId, name: member.name })}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invite */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Invite a member
          </div>
          <div className="flex gap-2">
            <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com" className="text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }} />
            <Button size="sm" onClick={handleInvite} disabled={isInviting} className="gap-1.5 shrink-0">
              <Mail className="h-3.5 w-3.5" /> Invite
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="space-y-3 rounded-lg border border-red-200 dark:border-red-900 p-4">
          <h3 className="text-sm font-medium text-red-600 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </h3>
          <p className="text-xs text-muted-foreground">
            Deleting this group will permanently remove all transactions, messages, and memberships.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            Delete Group
          </Button>
        </div>
      )}

      {/* Remove/Leave Confirmation */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === "leave" ? "Leave Group" : `Remove ${confirmDialog?.name}`}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === "leave"
                ? "Are you sure you want to leave this group? You will lose access to all group data."
                : `Are you sure you want to remove ${confirmDialog?.name} from this group?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemoving}>
              {isRemoving ? "..." : confirmDialog?.type === "leave" ? "Leave" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {group.name}?</DialogTitle>
            <DialogDescription>
              This action is irreversible. Type the group name to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={group.name} className="mt-2" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText("") }}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteConfirmText !== group.name || isDeleting}
              onClick={handleDeleteGroup}>
              {isDeleting ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Create `GroupDetailPage.tsx`**

```typescript
"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { GroupDashboardTab } from "./GroupDashboardTab"
import { GroupChatTab } from "./GroupChatTab"
import { GroupSettingsTab } from "./GroupSettingsTab"
import { ArrowLeft, LayoutDashboard, MessageSquare, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SettlementGroupSuggestion } from "@/lib/types"

interface GroupDetailPageProps {
  groupId: string
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type TabId = (typeof TABS)[number]["id"]

export function GroupDetailPage({ groupId }: GroupDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const ws = useSettlementWorkspace()
  const { loadSettlementWorkspace } = useApp()

  const tabParam = searchParams.get("tab") as TabId | null
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "dashboard")
  const settleWithParam = searchParams.get("settleWith") || undefined

  // Sync tab from URL
  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const switchTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      params.delete("settleWith")
      router.replace(`/settlements/${groupId}?${params.toString()}`, { scroll: false })
    },
    [groupId, router, searchParams]
  )

  // Find the group
  const group = useMemo(
    () => ws.settlementGroups.find((g) => g.id === groupId),
    [ws.settlementGroups, groupId]
  )

  // Load data if group not found
  useEffect(() => {
    if (!group) {
      loadSettlementWorkspace()
    }
  }, [group, loadSettlementWorkspace])

  const isOwner = useMemo(
    () => group?.members.some((m) => m.userId === currentUserId && m.role === "owner") ?? false,
    [group, currentUserId]
  )

  const handleSettleUpFromDashboard = useCallback(
    (suggestion: SettlementGroupSuggestion) => {
      switchTab("chat")
      // The chat tab will pick up the suggestion via settleWithParam or we can handle it
    },
    [switchTab]
  )

  const handleRemindFromDashboard = useCallback(
    (suggestion: { fromUserId: string; amount: number }) => {
      ws.onSendReminder(suggestion)
    },
    [ws]
  )

  if (!group) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Loading group...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push("/settlements")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{group.name}</h1>
          <p className="text-xs text-muted-foreground">{group.members.length} members</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b px-4 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "dashboard" && (
          <div className="h-full overflow-y-auto">
            <GroupDashboardTab
              group={group}
              currentUserId={currentUserId}
              formatCurrency={ws.formatCurrency}
              onSwitchToChat={() => switchTab("chat")}
              onSettleUp={handleSettleUpFromDashboard}
              onRemind={handleRemindFromDashboard}
            />
          </div>
        )}
        {activeTab === "chat" && (
          <GroupChatTab
            group={group}
            initialSettleUpUserId={settleWithParam}
            onBalancesChanged={loadSettlementWorkspace}
          />
        )}
        {activeTab === "settings" && (
          <div className="h-full overflow-y-auto">
            <GroupSettingsTab
              group={group}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Task 6: Wire Up Pages

**Files:**
- Modify: `app/settlements/page.tsx`
- Create: `app/settlements/[groupId]/page.tsx`

- [ ] **Step 1: Update settlements page**

```typescript
"use client"

import { SettlementsDashboard } from "@/components/settlements/dashboard/SettlementsDashboard"

export default function SettlementsPage() {
  return <SettlementsDashboard />
}
```

- [ ] **Step 2: Create group detail page**

```typescript
"use client"

import { use } from "react"
import { Suspense } from "react"
import { GroupDetailPage } from "@/components/settlements/group-detail/GroupDetailPage"

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)

  return (
    <Suspense fallback={<div className="h-dvh flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <GroupDetailPage groupId={groupId} />
    </Suspense>
  )
}
```

---

## Task 7: Remove Old Files

**Files:**
- Delete: `components/settlements/SettlementsChatLayout.tsx`
- Delete: `components/settlements/SettlementGroupList.tsx`

- [ ] **Step 1: Delete old layout and list**

```bash
rm components/settlements/SettlementsChatLayout.tsx
rm components/settlements/SettlementGroupList.tsx
```

- [ ] **Step 2: Verify no dangling imports**

```bash
grep -r "SettlementsChatLayout\|SettlementGroupList" --include="*.tsx" --include="*.ts" components/ app/ hooks/
```

Fix any remaining references.

---

## Task 8: Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "(settlements|group-detail|dashboard)" | head -20
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Fix any errors**

Address TypeScript, import, or lint issues.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```
