"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import type { SettlementGroupSuggestion } from "@/lib/types"

interface SettleUpSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestions: SettlementGroupSuggestion[]
  currentUserId: string
  formatCurrency: (amount: number) => string
  onSubmit: (data: {
    fromUserId: string
    toUserId: string
    amount: number
    notes: string
  }) => Promise<void>
  preselectedSuggestion?: SettlementGroupSuggestion | null
}

export function SettleUpSheet({
  open,
  onOpenChange,
  suggestions,
  currentUserId,
  formatCurrency,
  onSubmit,
  preselectedSuggestion,
}: SettleUpSheetProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const relevantSuggestions = useMemo(() => {
    return suggestions.filter((s) => s.fromUserId === currentUserId)
  }, [suggestions, currentUserId])

  const resetForm = useCallback(() => {
    setNotes("")
    setIsSubmitting(false)

    if (preselectedSuggestion) {
      const idx = relevantSuggestions.findIndex(
        (s) =>
          s.fromUserId === preselectedSuggestion.fromUserId &&
          s.toUserId === preselectedSuggestion.toUserId
      )
      if (idx >= 0) {
        setSelectedIndex(idx)
        setAmount(preselectedSuggestion.amount.toString())
      } else {
        setSelectedIndex(null)
        setAmount(preselectedSuggestion.amount.toString())
      }
    } else {
      setSelectedIndex(null)
      setAmount("")
    }
  }, [preselectedSuggestion, relevantSuggestions])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const selected = selectedIndex !== null ? relevantSuggestions[selectedIndex] : null
  const maxAmount = selected?.amount ?? 0

  const selectSuggestion = (index: number) => {
    setSelectedIndex(index)
    setAmount(relevantSuggestions[index].amount.toString())
  }

  const handleSubmit = async () => {
    if (!selected) {
      toast.warning("Select a settlement to pay")
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Enter a valid amount")
      return
    }
    if (parsedAmount > maxAmount + 0.01) {
      toast.warning(`Amount cannot exceed ${formatCurrency(maxAmount)}`)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        fromUserId: selected.fromUserId,
        toUserId: selected.toUserId,
        amount: parsedAmount,
        notes: notes.trim(),
      })
      onOpenChange(false)
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-4">
        <SheetHeader className="px-0">
          <SheetTitle>Settle Up</SheetTitle>
          <SheetDescription className="text-xs">
            Record a payment to settle your balance.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-2">
          {relevantSuggestions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                You have no outstanding balances to settle.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-medium">You owe</Label>
              {relevantSuggestions.map((s, i) => (
                <button
                  key={`${s.fromUserId}-${s.toUserId}`}
                  type="button"
                  onClick={() => selectSuggestion(i)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors text-left",
                    selectedIndex === i
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{s.fromUserName}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{s.toUserName}</span>
                  </div>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(s.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <div>
                <Label htmlFor="settle-amount" className="text-xs font-medium mb-1.5 block">
                  Amount
                </Label>
                <Input
                  id="settle-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {formatCurrency(maxAmount)}
                </p>
              </div>

              <div>
                <Label htmlFor="settle-notes" className="text-xs font-medium mb-1.5 block">
                  Notes (optional)
                </Label>
                <Input
                  id="settle-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paid via UPI / cash / bank transfer"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
