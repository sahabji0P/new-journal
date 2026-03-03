"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookOpen } from "lucide-react"
import { toast } from "@/lib/toast"

interface RecordInAccountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenseDescription: string
  shareAmount: number
  accounts: Array<{ id: string; name: string; type: string }>
  categories: Array<{ id: string; name: string; type: string }>
  formatCurrency: (amount: number) => string
  onSubmit: (data: { accountId: string; category: string }) => Promise<void>
}

export function RecordInAccountsDialog({
  open,
  onOpenChange,
  expenseDescription,
  shareAmount,
  accounts,
  categories,
  formatCurrency,
  onSubmit,
}: RecordInAccountsDialogProps) {
  const [accountId, setAccountId] = useState("")
  const [category, setCategory] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAccountId("")
      setCategory("")
      setIsSubmitting(false)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!accountId) {
      toast.warning("Select an account")
      return
    }
    if (!category) {
      toast.warning("Select a category")
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({ accountId, category })
      handleOpenChange(false)
    } catch {
      toast.error("Failed to record in accounts")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record in Personal Accounts</DialogTitle>
          <DialogDescription className="text-xs">
            Record your share of this group expense as a personal transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expense</span>
              <span className="font-medium">{expenseDescription}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your share</span>
              <span className="font-semibold">{formatCurrency(shareAmount)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {isSubmitting ? "Recording..." : "Record Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
