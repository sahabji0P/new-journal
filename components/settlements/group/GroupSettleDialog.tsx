"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { ArrowRight, CheckCircle } from "lucide-react"

interface GroupSettleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: {
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: string
    maxAmount: number
    notes: string
  } | null
  onDraftChange: (draft: GroupSettleDialogProps["draft"]) => void
  onSubmit: () => Promise<void>
  formatCurrency: (n: number) => string
}

export function GroupSettleDialog({
  open,
  onOpenChange,
  draft,
  onDraftChange,
  onSubmit,
  formatCurrency,
}: GroupSettleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono">Settle Up</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Record a full or partial settlement payment.
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium flex items-center gap-1.5">
                <span>{draft.fromUserName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{draft.toUserName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum suggested amount: {formatCurrency(draft.maxAmount)}
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="settle-amount">Amount*</FieldLabel>
              <Input
                id="settle-amount"
                type="number"
                step="0.01"
                value={draft.amount}
                onChange={event =>
                  onDraftChange({ ...draft, amount: event.target.value })
                }
              />
            </div>

            <div>
              <FieldLabel htmlFor="settle-note">Note (optional)</FieldLabel>
              <Input
                id="settle-note"
                value={draft.notes}
                onChange={event =>
                  onDraftChange({ ...draft, notes: event.target.value })
                }
                placeholder="Paid via UPI / cash / bank transfer"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onDraftChange(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={onSubmit} className="gap-1">
                <CheckCircle className="w-4 h-4" />
                Record Payment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
