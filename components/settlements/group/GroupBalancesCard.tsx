"use client"

interface GroupBalancesCardProps {
  balances: Array<{ userId: string; name: string; balance: number }>
  formatCurrency: (n: number) => string
}

export function GroupBalancesCard({
  balances,
  formatCurrency,
}: GroupBalancesCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm font-medium mb-3">Group Balances</div>

      {balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No balances available yet.
        </p>
      ) : (
        <div className="space-y-2">
          {balances.map((b) => (
            <div
              key={b.userId}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{b.name}</span>
              <span
                className={`font-semibold ${
                  b.balance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(b.balance)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
