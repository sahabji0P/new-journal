"use client"

import { useRouter } from "next/navigation"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/lib/toast"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { CreateGroupDialog } from "@/components/settlements/CreateGroupDialog"
import { BalanceSummaryCard, type BalanceItem } from "./BalanceSummaryCard"
import { PendingInvitesBanner } from "./PendingInvitesBanner"
import { GroupCard } from "./GroupCard"

export function SettlementsDashboard() {
  const ws = useSettlementWorkspace()
  const router = useRouter()

  const handleSettle = (item: BalanceItem) => {
    router.push(`/settlements/${item.groupId}?tab=chat&settleWith=${item.userId}`)
  }

  const handleRemind = async (item: BalanceItem) => {
    try {
      await ws.onSendReminder({ fromUserId: item.userId, amount: item.amount })
      toast.success(`Reminder sent to ${item.personName}`)
    } catch {
      toast.error("Failed to send reminder")
    }
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <h1 className="text-lg font-semibold">Settlements</h1>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => ws.setGroupDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Balance summary */}
        <div className="grid grid-cols-2 gap-3">
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
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Groups
          </h2>
          {ws.settlementGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No groups yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Create a group to start splitting expenses with friends
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => ws.setGroupDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create a Group
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ws.settlementGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  currentUserId={ws.currentUserId}
                  formatCurrency={ws.formatCurrency}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create group dialog */}
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
