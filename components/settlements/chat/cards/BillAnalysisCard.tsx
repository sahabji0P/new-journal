"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { BillAnalysisResult } from "@/lib/types"

interface BillAnalysisCardProps {
  content: string
  metadata?: Record<string, unknown>
  formatCurrency: (amount: number) => string
  onConfirmAsExpense?: (result: BillAnalysisResult) => void
}

export function BillAnalysisCard({
  content,
  metadata,
  formatCurrency,
  onConfirmAsExpense,
}: BillAnalysisCardProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  if (metadata?.success === false) {
    return (
      <div className="flex justify-center py-1">
        <Card className="w-full max-w-[85%] border-l-4 border-l-amber-400 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold text-amber-700">
              Bill Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{content}</p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              You can add the expense manually instead.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  let result: BillAnalysisResult | null = null
  try {
    result = JSON.parse(content) as BillAnalysisResult
  } catch {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to display bill analysis.
      </div>
    )
  }

  const { merchantName, items, subtotal, tax, total } = result

  return (
    <div className="flex justify-center py-1">
      <Card className="w-full max-w-[85%] border-l-4 border-l-amber-500 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Bill Analysis
            {merchantName && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                &mdash; {merchantName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length > 0 && (
            <div className="mb-3 overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1.5 text-left font-medium">Item</th>
                    <th className="px-2 py-1.5 text-center font-medium">Qty</th>
                    <th className="px-2 py-1.5 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="px-2 py-1.5">{item.name}</td>
                      <td className="px-2 py-1.5 text-center">
                        {item.quantity ?? 1}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {formatCurrency(item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-1 text-xs">
            {subtotal != null && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            {tax != null && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {onConfirmAsExpense && (
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={isConfirming}
                onClick={() => {
                  if (!result || isConfirming) return
                  setIsConfirming(true)
                  onConfirmAsExpense(result)
                }}
              >
                {isConfirming ? "Opening..." : "Confirm as Expense"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
