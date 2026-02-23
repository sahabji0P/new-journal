"use client"

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Members
        </div>
        <div className="text-xl font-semibold mt-1">{memberCount}</div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Entries
        </div>
        <div className="text-xl font-semibold mt-1">{entryCount}</div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Total Expense
        </div>
        <div className="text-xl font-semibold mt-1">
          {formatCurrency(totalSpent)}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          My Net
        </div>
        <div
          className={`text-xl font-semibold mt-1 ${
            myNetBalance >= 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {formatCurrency(myNetBalance)}
        </div>
      </div>
    </div>
  )
}
