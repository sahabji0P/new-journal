"use client"

import { useState } from "react"
import { CheckCircle, Circle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GroupSplitShare } from "@/lib/types"

interface ExpenseMessageCardProps {
  content: string
  senderId: string
  currentUserId: string
  transactionId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  formatCurrency: (amount: number) => string
  onRecordInAccounts?: (transactionId: string) => void
  isLocallyRecorded?: boolean
}

interface ExpenseContent {
  description: string
  totalAmount: number
  paidByUserId?: string
  paidByName: string
  splitType: string
  shares: GroupSplitShare[]
}

export function ExpenseMessageCard({
  content,
  senderId,
  currentUserId,
  transactionId,
  metadata,
  createdAt,
  formatCurrency,
  onRecordInAccounts,
  isLocallyRecorded,
}: ExpenseMessageCardProps) {
  const [showSplits, setShowSplits] = useState(false)

  let parsed: ExpenseContent | null = null
  try {
    parsed = JSON.parse(content) as ExpenseContent
  } catch {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to display expense details.
      </div>
    )
  }

  const { description, totalAmount, paidByUserId: contentPaidByUserId, paidByName, splitType, shares } = parsed
  const paidByUserId = contentPaidByUserId ?? senderId

  const paidCount = shares.filter(s => s.isPaid || s.userId === paidByUserId).length

  const isCurrentUserParticipant = shares.some(
    (s) => s.userId === currentUserId
  )
  const recordedBy = (metadata?.recordedBy as string[] | undefined) ?? []
  const alreadyRecorded = isLocallyRecorded || recordedBy.includes(currentUserId)

  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const isOwnMessage = senderId === currentUserId

  return (
    <div
      className={cn("flex w-full", isOwnMessage ? "justify-end" : "justify-start")}
    >
      <Card className="max-w-[85%] border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight">
                {description}
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paid by {paidByName}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold text-blue-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={() => setShowSplits(!showSplits)}
            className="mb-2 text-xs font-medium text-blue-600 hover:underline"
          >
            {showSplits ? "Hide split breakdown" : `Show split breakdown (${shares.length})`}
          </button>

          {showSplits && (
            <div className="mb-2 space-y-1 rounded-md bg-muted/50 p-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Split: {splitType}
              </p>
              {shares.map((share) => (
                <div
                  key={share.userId}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {share.isPaid || share.userId === paidByUserId ? (
                      <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={cn(share.userId === currentUserId && "font-semibold")}>
                      {share.userId === currentUserId ? "You" : share.name}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(share.amount)}
                  </span>
                </div>
              ))}

              <div className="pt-1 border-t mt-1">
                <p className="text-[10px] text-muted-foreground">
                  {paidCount}/{shares.length} settled
                </p>
              </div>
            </div>
          )}

          {isCurrentUserParticipant && transactionId && onRecordInAccounts && (
            <Button
              variant={alreadyRecorded ? "ghost" : "outline"}
              size="sm"
              className="h-7 text-xs"
              disabled={alreadyRecorded}
              onClick={() => onRecordInAccounts(transactionId)}
            >
              {alreadyRecorded ? "Recorded \u2713" : "Record in my accounts"}
            </Button>
          )}

          <p className="mt-1.5 text-right text-[10px] text-muted-foreground/70">
            {time}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
