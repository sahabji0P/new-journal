"use client"

import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { CheckCircle, Circle, Users } from "lucide-react"
import type { ExpenseSplit } from "@/lib/types"

interface SplitViewerProps {
  splits: ExpenseSplit[]
  totalAmount: number
  onMarkPaid?: (splitId: number, isPaid: boolean) => void
  readonly?: boolean
}

export function SplitViewer({ splits, totalAmount, onMarkPaid, readonly = false }: SplitViewerProps) {
  const paidCount = splits.filter(s => s.isPaid).length
  const paidAmount = splits.filter(s => s.isPaid).reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <div>
            <p className="font-semibold text-sm">Split Expense</p>
            <p className="text-xs text-muted-foreground">
              {paidCount}/{splits.length} people paid • ${paidAmount.toFixed(2)}/${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {splits.map(split => (
          <Card key={split.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {!readonly && onMarkPaid ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkPaid(split.id, !split.isPaid)}
                    className="h-8 w-8 p-0"
                  >
                    {split.isPaid ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                ) : (
                  <div className="w-8 flex items-center justify-center">
                    {split.isPaid ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <p className={`font-medium text-sm ${split.isPaid ? "line-through text-muted-foreground" : ""}`}>
                    {split.personName || `Person ${split.id}`}
                  </p>
                  {split.isPaid && split.paidDate && (
                    <p className="text-xs text-muted-foreground">
                      Paid on {new Date(split.paidDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${split.isPaid ? "text-emerald-600" : "text-orange-600"}`}>
                  ${split.amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {split.isPaid ? "Paid" : "Pending"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {paidCount === splits.length && (
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-center">
          <p className="text-sm font-mono">✓ All splits have been paid!</p>
        </div>
      )}
    </div>
  )
}
