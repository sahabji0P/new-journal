"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CheckCircle } from "lucide-react"
import { toast } from "@/lib/toast"

interface ResolvePaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    personName: string
    groupName: string
    amount: number
    userId: string
    groupId: string
  } | null
  currentUserId: string
  accounts: Array<{ id: string; name: string; type: string }>
  formatCurrency: (n: number) => string
  onSubmit: (data: {
    groupId: string
    fromUserId: string
    toUserId: string
    amount: number
    notes: string
    accountId?: string
  }) => Promise<void>
}

export function ResolvePaymentSheet({
  open,
  onOpenChange,
  item,
  currentUserId,
  accounts,
  formatCurrency,
  onSubmit,
}: ResolvePaymentSheetProps) {
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setAmount(String(item.amount))
      setAccountId("")
      setNotes("")
    }
  }, [item])

  useEffect(() => {
    if (open && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [open, accounts, accountId])

  const handleSubmit = useCallback(async () => {
    if (!item) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0")
      return
    }
    if (parsedAmount > item.amount) {
      toast.error(`Amount cannot exceed ${formatCurrency(item.amount)}`)
      return
    }
    if (!accountId) {
      toast.warning("Select a receiving account")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        groupId: item.groupId,
        fromUserId: item.userId,
        toUserId: currentUserId,
        amount: parsedAmount,
        notes,
        accountId,
      })
      toast.success("Payment recorded successfully")
      onOpenChange(false)
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }, [item, amount, notes, accountId, currentUserId, onSubmit, onOpenChange, formatCurrency])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl px-4 pb-8 pt-6 space-y-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Record Payment
          </SheetTitle>
          {item && (
            <SheetDescription asChild>
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{item.personName}</span>
                {" "}is paying you back —{" "}
                <span className="font-medium text-foreground">{item.groupName}</span>
              </div>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="resolve-amount">Amount</Label>
              {item && (
                <span className="text-xs text-muted-foreground">
                  Max: {formatCurrency(item.amount)}
                </span>
              )}
            </div>
            <Input
              id="resolve-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="resolve-account">Receiving Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="resolve-account">
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="resolve-notes">Notes (optional)</Label>
            <Input
              id="resolve-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash, UPI, bank transfer..."
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
