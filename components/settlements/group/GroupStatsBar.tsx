"use client"

import { cn } from "@/lib/utils"

interface GroupStatsBarProps {
  memberCount: number
  entryCount: number
  totalSpent: number
  myNetBalance: number
  formatCurrency: (n: number) => string
}

export function GroupStatsBar({
  memberCount,
  entryCount,
  totalSpent,
  myNetBalance,
  formatCurrency,
}: GroupStatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Members
        </div>
        <div className="text-lg font-semibold mt-0.5">{memberCount}</div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Expenses
        </div>
        <div className="text-lg font-semibold mt-0.5">{entryCount}</div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Total Spent
        </div>
        <div className="text-lg font-semibold mt-0.5">
          {formatCurrency(totalSpent)}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {myNetBalance >= 0 ? "You Get Back" : "You Owe"}
        </div>
        <div
          className={cn(
            "text-lg font-semibold mt-0.5",
            myNetBalance > 0
              ? "text-emerald-600"
              : myNetBalance < 0
                ? "text-red-500"
                : ""
          )}
        >
          {formatCurrency(Math.abs(myNetBalance))}
        </div>
      </div>
    </div>
  )
}
