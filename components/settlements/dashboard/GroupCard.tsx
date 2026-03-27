"use client"

import { useRouter } from "next/navigation"
import type { SettlementGroup } from "@/lib/types"

interface GroupCardProps {
  group: SettlementGroup
  currentUserId: string
  formatCurrency: (n: number) => string
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`

  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function GroupCard({ group, currentUserId, formatCurrency }: GroupCardProps) {
  const router = useRouter()

  const myBalance = group.balances?.find(b => b.userId === currentUserId)?.balance ?? 0

  const totalSpent = group.transactions
    .filter(t => t.transactionType !== "settlement")
    .reduce((sum, t) => sum + t.totalAmount, 0)

  const unsettledCount = group.suggestions?.length ?? 0

  const lastActivityDate =
    group.transactions.length > 0
      ? group.transactions[0].createdAt
      : group.createdAt

  const visibleMembers = group.members.slice(0, 4)
  const overflowCount = group.members.length - visibleMembers.length

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <button
      onClick={() => router.push(`/settlements/${group.id}`)}
      className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{group.name}</p>
          {group.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {group.description}
            </p>
          )}
        </div>

        {/* Balance badge */}
        {myBalance > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5">
            +{formatCurrency(myBalance)}
          </span>
        ) : myBalance < 0 ? (
          <span className="shrink-0 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium px-2 py-0.5">
            {formatCurrency(myBalance)}
          </span>
        ) : group.transactions.length > 0 ? (
          <span className="shrink-0 rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5">
            settled
          </span>
        ) : null}
      </div>

      {/* Member avatar stack */}
      <div className="flex items-center gap-1">
        <div className="flex -space-x-1.5">
          {visibleMembers.map(member => (
            <div
              key={member.userId}
              className="w-6 h-6 rounded-full bg-primary/15 border border-background flex items-center justify-center text-[10px] font-semibold text-primary"
              title={member.name}
            >
              {getInitials(member.name)}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
              +{overflowCount}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>Spent: {formatCurrency(totalSpent)}</span>
          {unsettledCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {unsettledCount} unsettled
            </span>
          )}
        </div>
        <span>{getRelativeTime(lastActivityDate)}</span>
      </div>
    </button>
  )
}
