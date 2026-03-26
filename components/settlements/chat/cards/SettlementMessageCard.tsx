"use client"

import { CheckCircle } from "lucide-react"

interface SettlementMessageCardProps {
  content: string
  createdAt: string
  formatCurrency: (amount: number) => string
}

export function SettlementMessageCard({
  content,
  createdAt,
  formatCurrency,
}: SettlementMessageCardProps) {
  let parsed: {
    fromUserId?: string
    fromUserName?: string
    fromName?: string // backward compat
    toUserId?: string
    toUserName?: string
    toName?: string // backward compat
    amount: number
    amountCents?: number
    notes?: string
  } | null = null
  try {
    parsed = JSON.parse(content)
  } catch {
    return (
      <div className="text-sm text-muted-foreground text-center py-1">
        Settlement recorded
      </div>
    )
  }

  if (!parsed) return null

  const fromName = parsed.fromUserName || parsed.fromName || "Someone"
  const toName = parsed.toUserName || parsed.toName || "Someone"

  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex justify-center py-1.5">
      <div className="inline-flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-4 py-2">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium">{fromName}</span>
          <span className="text-muted-foreground">paid</span>
          <span className="font-medium">{toName}</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {formatCurrency(parsed.amount)}
          </span>
        </div>
        {parsed.notes && (
          <p className="text-xs text-muted-foreground">{parsed.notes}</p>
        )}
        <span className="text-[10px] text-muted-foreground/70">{time}</span>
      </div>
    </div>
  )
}
