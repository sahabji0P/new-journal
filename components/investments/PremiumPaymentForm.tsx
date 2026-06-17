"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { toast } from "@/lib/toast"
import { Loader2 } from "lucide-react"
import { todayLocalStr } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PremiumPaymentFormProps {
  policyId: string
  policyName: string
  premiumAmount: number
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "skipped", label: "Skipped" },
]

const PAYMENT_MODES = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "auto_debit", label: "Auto-debit" },
  { value: "other", label: "Other" },
]

// ---------------------------------------------------------------------------
// Helper: Field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PremiumPaymentForm({
  policyId,
  policyName,
  premiumAmount,
  open,
  onClose,
}: PremiumPaymentFormProps) {
  const { addPremiumPayment } = useInvestments()

  // Form state
  const [amount, setAmount] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [paidDate, setPaidDate] = useState("")
  const [status, setStatus] = useState("paid")
  const [paymentMode, setPaymentMode] = useState("")
  const [referenceNo, setReferenceNo] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset/populate on open
  useEffect(() => {
    if (open) {
      setAmount(premiumAmount?.toString() ?? "")
      setDueDate("")
      setPaidDate(todayLocalStr())
      setStatus("paid")
      setPaymentMode("")
      setReferenceNo("")
      setNotes("")
    }
  }, [open, premiumAmount])

  const handleSubmit = async () => {
    if (!amount || !dueDate) return

    setIsSubmitting(true)

    const payload = {
      policyId,
      amount: parseFloat(amount),
      dueDate,
      paidDate: paidDate || undefined,
      status: status as "upcoming" | "paid" | "overdue" | "skipped",
      paymentMode: paymentMode
        ? (paymentMode as "bank_transfer" | "upi" | "cheque" | "cash" | "auto_debit" | "other")
        : undefined,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    try {
      await addPremiumPayment(policyId, payload)
      toast.success("Payment recorded", {
        description: policyName,
      })
      onClose()
    } catch {
      // Context handles error toasts
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{policyName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Amount *">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date *">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="Paid Date">
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payment Mode">
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Reference No.">
            <Input
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Transaction reference"
            />
          </Field>

          <Field label="Notes">
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </Field>
        </div>

        <DialogFooter>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !amount || !dueDate}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
