"use client"

import { GroupStatsBar } from "./GroupStatsBar"
import { GroupBalancesCard } from "./GroupBalancesCard"
import { GroupSuggestionsCard } from "./GroupSuggestionsCard"


interface GroupOverviewTabProps {
  memberCount: number
  entryCount: number
  totalSpent: number
  myNetBalance: number
  balances: Array<{ userId: string; name: string; balance: number }>
  suggestions: Array<{
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: number
  }>
  currentUserId: string
  formatCurrency: (n: number) => string
  onSettleUp: (suggestion: {
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: number
  }) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
}

export function GroupOverviewTab(props: GroupOverviewTabProps) {
  return (
    <div className="space-y-4">
      <GroupStatsBar
        memberCount={props.memberCount}
        entryCount={props.entryCount}
        totalSpent={props.totalSpent}
        myNetBalance={props.myNetBalance}
        formatCurrency={props.formatCurrency}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <GroupBalancesCard
          balances={props.balances}
          formatCurrency={props.formatCurrency}
        />
        <GroupSuggestionsCard
          suggestions={props.suggestions}
          currentUserId={props.currentUserId}
          formatCurrency={props.formatCurrency}
          onSettleUp={props.onSettleUp}
          onRemind={props.onRemind}
        />
      </div>
    </div>
  )
}
