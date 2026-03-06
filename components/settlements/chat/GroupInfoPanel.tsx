"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Crown, Mail, UserPlus } from "lucide-react"
import { toast } from "@/lib/toast"
import type { SettlementGroupMember, SettlementGroupBalance, SettlementGroupSuggestion } from "@/lib/types"
import { GroupStatsBar } from "@/components/settlements/group/GroupStatsBar"
import { GroupBalancesCard } from "@/components/settlements/group/GroupBalancesCard"
import { GroupSuggestionsCard } from "@/components/settlements/group/GroupSuggestionsCard"

interface GroupInfoPanelProps {
  group: {
    id: string
    name: string
    description?: string
    members: SettlementGroupMember[]
    transactions: Array<{ id: string }>
    balances?: SettlementGroupBalance[]
    suggestions?: SettlementGroupSuggestion[]
    createdById: string
  }
  currentUserId: string
  formatCurrency: (amount: number) => string
  totalSpent: number
  myNetBalance: number
  onSettleUp: (suggestion: SettlementGroupSuggestion) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
  onInviteMember: (email: string) => void
}

export function GroupInfoPanel({
  group,
  currentUserId,
  formatCurrency,
  totalSpent,
  myNetBalance,
  onSettleUp,
  onRemind,
  onInviteMember,
}: GroupInfoPanelProps) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      toast.warning("Enter an email address")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning("Enter a valid email address")
      return
    }
    if (group.members.some((m) => m.email.toLowerCase() === email)) {
      toast.warning("This person is already a member")
      return
    }

    setIsInviting(true)
    try {
      onInviteMember(email)
      setInviteEmail("")
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-1">
        <h2 className="text-lg font-semibold">{group.name}</h2>
        {group.description && (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        )}
      </div>

      <Separator />

      <div className="p-4">
        <GroupStatsBar
          memberCount={group.members.length}
          entryCount={group.transactions.length}
          totalSpent={totalSpent}
          myNetBalance={myNetBalance}
          formatCurrency={formatCurrency}
        />
      </div>

      <Separator />

      <div className="p-4">
        <GroupBalancesCard
          balances={group.balances || []}
          formatCurrency={formatCurrency}
        />
      </div>

      <Separator />

      <div className="p-4">
        <GroupSuggestionsCard
          suggestions={group.suggestions || []}
          currentUserId={currentUserId}
          formatCurrency={formatCurrency}
          onSettleUp={onSettleUp}
          onRemind={onRemind}
        />
      </div>

      <Separator />

      <div className="p-4 space-y-3">
        <div className="text-sm font-medium">Members</div>
        <div className="space-y-2">
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.name}</span>
                {member.userId === group.createdById && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    <Crown className="h-3 w-3" />
                    Owner
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            Invite a member
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInvite()
              }}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={isInviting}
              className="gap-1.5 shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
              Invite
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
