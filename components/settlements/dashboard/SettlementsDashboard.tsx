"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { useApp } from "@/contexts/AppContext"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { CreateGroupDialog } from "@/components/settlements/CreateGroupDialog"
import { BalanceSummaryCard, type BalanceItem } from "./BalanceSummaryCard"
import { PendingInvitesBanner } from "./PendingInvitesBanner"
import { GroupCard } from "./GroupCard"
import { ResolvePaymentSheet } from "./ResolvePaymentSheet"

export function SettlementsDashboard() {
  const ws = useSettlementWorkspace()
  const { recordSettlementGroupPayment, loadSettlementWorkspace, accounts, sendSettlementGroupReminder } = useApp()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [resolveItem, setResolveItem] = useState<BalanceItem | null>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-balance-card]",
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.1, ease: "power3.out" }
      )
      gsap.fromTo("[data-group-card]",
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.24, stagger: 0.04, ease: "power2.out" }
      )
    })
  }, { scope: containerRef })

  const handleSettle = (item: BalanceItem) => {
    router.push(`/settlements/${item.groupId}?tab=chat&settleWith=${item.userId}`)
  }

  const handleRemind = (item: BalanceItem) => {
    void sendSettlementGroupReminder({
      groupId: item.groupId,
      toUserId: item.userId,
      amount: item.amount,
    })
  }

  const handleResolve = useCallback(async (data: {
    groupId: string
    fromUserId: string
    toUserId: string
    amount: number
    notes: string
    accountId?: string
  }) => {
    await recordSettlementGroupPayment({
      groupId: data.groupId,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      notes: data.notes,
      receiverAccountId: data.accountId,
    })
    await loadSettlementWorkspace()
    setResolveItem(null)
  }, [recordSettlementGroupPayment, loadSettlementWorkspace])

  return (
    <div ref={containerRef} className="h-dvh flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <h1 className="text-lg font-semibold">Settlements</h1>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => ws.setGroupDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Group</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-5">
        {/* Balance summary */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div data-balance-card>
            <BalanceSummaryCard
              title="You Owe"
              totalAmount={ws.totalGroupIOwe}
              items={ws.iOweItems}
              variant="owe"
              formatCurrency={ws.formatCurrency}
              onSettle={handleSettle}
            />
          </div>
          <div data-balance-card>
            <BalanceSummaryCard
              title="You Get Back"
              totalAmount={ws.totalGroupOwesMe}
              items={ws.owesMeItems}
              variant="owed"
              formatCurrency={ws.formatCurrency}
              onRemind={handleRemind}
              onResolve={(item) => setResolveItem(item)}
            />
          </div>
        </div>

        {/* Pending invitations */}
        <PendingInvitesBanner
          invitations={ws.myPendingInvites}
          onRespond={ws.respondToSettlementInvite}
        />

        {/* Group grid */}
        <div>
          <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
                <div key={group.id} data-group-card>
                  <GroupCard
                    group={group}
                    currentUserId={ws.currentUserId}
                    formatCurrency={ws.formatCurrency}
                  />
                </div>
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

      {/* Resolve payment sheet */}
      <ResolvePaymentSheet
        open={!!resolveItem}
        onOpenChange={(open) => { if (!open) setResolveItem(null) }}
        item={resolveItem}
        currentUserId={ws.currentUserId}
        accounts={accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))}
        formatCurrency={ws.formatCurrency}
        onSubmit={handleResolve}
      />
    </div>
  )
}
