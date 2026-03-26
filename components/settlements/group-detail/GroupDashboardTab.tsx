"use client"

import { useState, useCallback, useRef } from "react"
import { useApp } from "@/contexts/AppContext"
import { GroupStatsBar } from "@/components/settlements/group/GroupStatsBar"
import { GroupBalancesCard } from "@/components/settlements/group/GroupBalancesCard"
import { GroupSuggestionsCard } from "@/components/settlements/group/GroupSuggestionsCard"
import { ResolvePaymentSheet } from "@/components/settlements/dashboard/ResolvePaymentSheet"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const { recordSettlementGroupPayment, loadSettlementWorkspace, accounts } = useApp()
  const [resolveItem, setResolveItem] = useState<SettlementGroupSuggestion | null>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-activity-row]", {
        y: 8, autoAlpha: 0, duration: 0.2, stagger: 0.02, ease: "power2.out",
      })
    })
  }, { scope: containerRef })

  const handleResolve = useCallback(
    async (data: {
      groupId: string
      fromUserId: string
      toUserId: string
      amount: number
      notes: string
    }) => {
      await recordSettlementGroupPayment(data)
      await loadSettlementWorkspace()
      setResolveItem(null)
    },
    [recordSettlementGroupPayment, loadSettlementWorkspace]
  )
  const expenseTransactions = (group.transactions ?? []).filter(
    (t) => t.transactionType !== "settlement"
  )
  const totalSpent = expenseTransactions.reduce(
    (sum, t) => sum + (t.totalAmount ?? 0),
    0
  )

  const myBalance =
    group.balances?.find((b) => b.userId === currentUserId)?.balance ?? 0

  const recentTransactions = [...(group.transactions ?? [])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5)

  return (
    <div ref={containerRef} className="space-y-5 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Stats bar */}
      <GroupStatsBar
        memberCount={group.members.length}
        entryCount={expenseTransactions.length}
        totalSpent={totalSpent}
        myNetBalance={myBalance}
        formatCurrency={formatCurrency}
      />

      {/* Balances + Suggestions */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-2.5 sm:p-3">
          <GroupBalancesCard
            balances={group.balances ?? []}
            formatCurrency={formatCurrency}
          />
        </div>

        <GroupSuggestionsCard
          suggestions={group.suggestions ?? []}
          currentUserId={currentUserId}
          formatCurrency={formatCurrency}
          onSettleUp={onSettleUp}
          onRemind={onRemind}
          onResolve={(s) => setResolveItem(s)}
        />
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Recent Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={onSwitchToChat}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            View all in Chat
          </Button>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {recentTransactions.map((txn) => (
              <div
                key={txn.id}
                data-activity-row
                className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {txn.description}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {txn.transactionType === "settlement"
                      ? "Settlement"
                      : txn.paidByName}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(txn.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Resolve Payment Sheet */}
      <ResolvePaymentSheet
        open={!!resolveItem}
        onOpenChange={(open) => { if (!open) setResolveItem(null) }}
        item={
          resolveItem
            ? {
                personName: resolveItem.fromUserName,
                groupName: group.name,
                amount: resolveItem.amount,
                userId: resolveItem.fromUserId,
                groupId: group.id,
              }
            : null
        }
        currentUserId={currentUserId}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))}
        formatCurrency={formatCurrency}
        onSubmit={handleResolve}
      />
    </div>
  )
}
