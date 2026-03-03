"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SettlementMessageCardProps {
  content: string
  createdAt: string
  formatCurrency: (amount: number) => string
}

interface SettlementContent {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
}

export function SettlementMessageCard({
  content,
  createdAt,
  formatCurrency,
}: SettlementMessageCardProps) {
  let parsed: SettlementContent | null = null
  try {
    parsed = JSON.parse(content) as SettlementContent
  } catch {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to display settlement details.
      </div>
    )
  }

  const { fromUserName, toUserName, amount } = parsed

  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex justify-center py-1">
      <Card className="w-full max-w-[75%] border-l-4 border-l-emerald-500 shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            {fromUserName} paid {toUserName}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-lg font-bold text-emerald-600">
            {formatCurrency(amount)}
          </p>
          <p className="mt-1 text-right text-[10px] text-muted-foreground/70">
            {time}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
