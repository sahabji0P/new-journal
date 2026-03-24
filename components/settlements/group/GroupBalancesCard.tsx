"use client"

import { cn } from "@/lib/utils"

interface GroupBalancesCardProps {
  balances: Array<{ userId: string; name: string; balance: number }>
  formatCurrency: (n: number) => string
}

export function GroupBalancesCard({
  balances,
  formatCurrency,
}: GroupBalancesCardProps) {
  const maxAbs = Math.max(...balances.map((b) => Math.abs(b.balance)), 1)

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Balances</div>

      {balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">No balances yet.</p>
      ) : (
        <div className="space-y-2.5">
          {balances.map((b) => (
            <div key={b.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{b.name}</span>
                <span
                  className={cn(
                    "font-medium text-xs shrink-0 ml-2",
                    b.balance > 0
                      ? "text-emerald-600"
                      : b.balance < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                >
                  {b.balance > 0
                    ? "gets back "
                    : b.balance < 0
                      ? "owes "
                      : ""}
                  {formatCurrency(Math.abs(b.balance))}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    b.balance > 0
                      ? "bg-emerald-500"
                      : b.balance < 0
                        ? "bg-red-400"
                        : "bg-muted-foreground/30"
                  )}
                  style={{
                    width: `${Math.min((Math.abs(b.balance) / maxAbs) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
