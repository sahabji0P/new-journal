"use client"

import { Sparkles, ArrowRight, CheckCircle, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Suggestion {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
}

interface GroupSuggestionsCardProps {
  suggestions: Suggestion[]
  currentUserId: string
  formatCurrency: (n: number) => string
  onSettleUp: (suggestion: Suggestion) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
}

export function GroupSuggestionsCard({
  suggestions,
  currentUserId,
  formatCurrency,
  onSettleUp,
  onRemind,
}: GroupSuggestionsCardProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        <Sparkles className="h-4 w-4" />
        Suggested Settlements
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Everyone is settled up.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {suggestions.map((s) => (
            <div
              key={`${s.fromUserId}-${s.toUserId}`}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-1 text-sm font-medium">
                <span>{s.fromUserName}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{s.toUserName}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatCurrency(s.amount)}
                </span>

                {currentUserId === s.fromUserId && (
                  <Button size="sm" onClick={() => onSettleUp(s)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Settle Up
                  </Button>
                )}

                {currentUserId === s.toUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onRemind({ fromUserId: s.fromUserId, amount: s.amount })
                    }
                  >
                    <BellRing className="h-3.5 w-3.5 mr-1" />
                    Remind
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
