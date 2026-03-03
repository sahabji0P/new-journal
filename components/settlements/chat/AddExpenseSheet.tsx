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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Equal, SplitSquareVertical, Percent } from "lucide-react"
import { toast } from "@/lib/toast"
import type { SettlementGroupMember, BillAnalysisResult } from "@/lib/types"

type SplitDraft = {
  userId: string
  name: string
  amount: string
}

interface AddExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: SettlementGroupMember[]
  currentUserId: string
  formatCurrency: (amount: number) => string
  onSubmit: (data: {
    description: string
    totalAmount: number
    paidByUserId: string
    splitType: "equal" | "custom" | "percentage"
    splitBetween: string[]
    shares: { userId: string; amount: number }[]
    percentageShares: { userId: string; percentage: number }[]
    notes: string
  }) => Promise<void>
  prefillData?: BillAnalysisResult | null
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  members,
  currentUserId,
  formatCurrency,
  onSubmit,
  prefillData,
}: AddExpenseSheetProps) {
  const [description, setDescription] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [paidByUserId, setPaidByUserId] = useState("")
  const [splitMode, setSplitMode] = useState<"equal" | "custom" | "percentage">("equal")
  const [participants, setParticipants] = useState<string[]>([])
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([])
  const [percentageDrafts, setPercentageDrafts] = useState<SplitDraft[]>([])
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setDescription(prefillData?.merchantName || "")
    setTotalAmount(prefillData?.total ? prefillData.total.toString() : "")
    setPaidByUserId(currentUserId)
    setSplitMode("equal")
    setParticipants(members.map((m) => m.userId))
    setSplitDrafts(members.map((m) => ({ userId: m.userId, name: m.name, amount: "" })))
    setPercentageDrafts(members.map((m) => ({ userId: m.userId, name: m.name, amount: "" })))
    setNotes("")
    setIsSubmitting(false)
  }, [members, currentUserId, prefillData])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const parsedTotal = useMemo(() => {
    const val = Number(totalAmount)
    return Number.isFinite(val) ? val : 0
  }, [totalAmount])

  const splitTotal = useMemo(() => {
    return splitDrafts
      .filter((d) => participants.includes(d.userId))
      .reduce((sum, d) => {
        const v = Number(d.amount)
        return sum + (Number.isFinite(v) ? v : 0)
      }, 0)
  }, [splitDrafts, participants])

  const percentageTotal = useMemo(() => {
    return percentageDrafts
      .filter((d) => participants.includes(d.userId))
      .reduce((sum, d) => {
        const v = Number(d.amount)
        return sum + (Number.isFinite(v) ? v : 0)
      }, 0)
  }, [percentageDrafts, participants])

  const splitDifference = useMemo(() => parsedTotal - splitTotal, [parsedTotal, splitTotal])
  const percentageDifference = useMemo(() => 100 - percentageTotal, [percentageTotal])

  const toggleParticipant = (userId: string, checked: boolean) => {
    setParticipants((prev) => {
      if (checked) {
        if (prev.includes(userId)) return prev
        return [...prev, userId]
      }
      if (prev.length <= 1) {
        toast.warning("At least one participant is required")
        return prev
      }
      return prev.filter((id) => id !== userId)
    })
  }

  const updateSplitDraft = (userId: string, amount: string) => {
    setSplitDrafts((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, amount } : d))
    )
  }

  const updatePercentageDraft = (userId: string, amount: string) => {
    setPercentageDrafts((prev) =>
      prev.map((d) => (d.userId === userId ? { ...d, amount } : d))
    )
  }

  const fillSplitEqually = () => {
    if (participants.length === 0) {
      toast.warning("Select participants first")
      return
    }
    const total = Number(totalAmount)
    if (!Number.isFinite(total) || total <= 0) {
      toast.warning("Enter a valid total amount first")
      return
    }
    const perHead = Number((total / participants.length).toFixed(2))
    let assigned = 0
    setSplitDrafts((prev) =>
      prev.map((d) => {
        if (!participants.includes(d.userId)) return { ...d, amount: "" }
        assigned += 1
        if (assigned === participants.length) {
          const prevTotal = Number((perHead * (participants.length - 1)).toFixed(2))
          return { ...d, amount: Number((total - prevTotal).toFixed(2)).toString() }
        }
        return { ...d, amount: perHead.toString() }
      })
    )
  }

  const fillPercentagesEqually = () => {
    if (participants.length === 0) {
      toast.warning("Select participants first")
      return
    }
    const perHead = Number((100 / participants.length).toFixed(2))
    let assigned = 0
    setPercentageDrafts((prev) =>
      prev.map((d) => {
        if (!participants.includes(d.userId)) return { ...d, amount: "" }
        assigned += 1
        if (assigned === participants.length) {
          const prevTotal = Number((perHead * (participants.length - 1)).toFixed(2))
          return { ...d, amount: Number((100 - prevTotal).toFixed(2)).toString() }
        }
        return { ...d, amount: perHead.toString() }
      })
    )
  }

  const handleSubmit = async () => {
    const total = Number(totalAmount)
    if (!description.trim()) {
      toast.warning("Enter a description")
      return
    }
    if (!Number.isFinite(total) || total <= 0) {
      toast.warning("Enter a valid total amount")
      return
    }
    if (!paidByUserId) {
      toast.warning("Select who paid")
      return
    }
    if (participants.length === 0) {
      toast.warning("Select at least one participant")
      return
    }

    setIsSubmitting(true)

    try {
      if (splitMode === "custom") {
        const shares = splitDrafts
          .filter((d) => participants.includes(d.userId))
          .map((d) => ({ userId: d.userId, amount: Number(d.amount) }))

        if (shares.some((s) => !Number.isFinite(s.amount) || s.amount < 0)) {
          toast.warning("Enter valid amounts for all participants")
          setIsSubmitting(false)
          return
        }
        const sharesTotal = shares.reduce((sum, s) => sum + s.amount, 0)
        if (Math.abs(sharesTotal - total) > 0.01) {
          toast.warning("Custom split must match total amount")
          setIsSubmitting(false)
          return
        }

        await onSubmit({
          description: description.trim(),
          totalAmount: total,
          paidByUserId,
          splitType: "custom",
          splitBetween: participants,
          shares,
          percentageShares: [],
          notes: notes.trim(),
        })
      } else if (splitMode === "percentage") {
        const percentageShares = percentageDrafts
          .filter((d) => participants.includes(d.userId))
          .map((d) => ({ userId: d.userId, percentage: Number(d.amount) }))

        if (percentageShares.some((s) => !Number.isFinite(s.percentage) || s.percentage < 0)) {
          toast.warning("Enter valid percentages for all participants")
          setIsSubmitting(false)
          return
        }
        const pctTotal = percentageShares.reduce((sum, s) => sum + s.percentage, 0)
        if (Math.abs(pctTotal - 100) > 0.01) {
          toast.warning("Percentages must total 100%")
          setIsSubmitting(false)
          return
        }

        await onSubmit({
          description: description.trim(),
          totalAmount: total,
          paidByUserId,
          splitType: "percentage",
          splitBetween: participants,
          shares: [],
          percentageShares,
          notes: notes.trim(),
        })
      } else {
        await onSubmit({
          description: description.trim(),
          totalAmount: total,
          paidByUserId,
          splitType: "equal",
          splitBetween: participants,
          shares: [],
          percentageShares: [],
          notes: notes.trim(),
        })
      }

      onOpenChange(false)
    } catch {
      toast.error("Failed to add expense")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-4">
        <SheetHeader className="px-0">
          <SheetTitle>Add Expense</SheetTitle>
          <SheetDescription className="text-xs">
            Split a shared expense among group members.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="expense-desc" className="text-xs font-medium mb-1.5 block">
              Description
            </Label>
            <Input
              id="expense-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, groceries, tickets..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="expense-amount" className="text-xs font-medium mb-1.5 block">
                Total Amount
              </Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Paid By</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Split Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={splitMode === "equal" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("equal")}
                className="gap-1.5"
              >
                <Equal className="h-3.5 w-3.5" />
                Equal
              </Button>
              <Button
                type="button"
                variant={splitMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("custom")}
                className="gap-1.5"
              >
                <SplitSquareVertical className="h-3.5 w-3.5" />
                Custom
              </Button>
              <Button
                type="button"
                variant={splitMode === "percentage" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("percentage")}
                className="gap-1.5"
              >
                <Percent className="h-3.5 w-3.5" />
                Percentage
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-medium mb-2">Split Between</p>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => (
                <label key={m.userId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={participants.includes(m.userId)}
                    onCheckedChange={(checked) =>
                      toggleParticipant(m.userId, Boolean(checked))
                    }
                  />
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {splitMode === "equal" && participants.length > 0 && parsedTotal > 0 && (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2.5">
              Each participant pays{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(parsedTotal / participants.length)}
              </span>
            </p>
          )}

          {splitMode === "custom" && (
            <div className="space-y-2">
              {splitDrafts
                .filter((d) => participants.includes(d.userId))
                .map((d) => (
                  <div key={d.userId} className="grid grid-cols-2 gap-2">
                    <Input value={d.name} disabled className="text-sm" />
                    <Input
                      type="number"
                      step="0.01"
                      value={d.amount}
                      onChange={(e) => updateSplitDraft(d.userId, e.target.value)}
                      placeholder="Share amount"
                    />
                  </div>
                ))}
              <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Split total:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(splitTotal)}
                    </span>
                  </p>
                  <Button variant="outline" size="sm" onClick={fillSplitEqually}>
                    Split Equally
                  </Button>
                </div>
                <p
                  className={`text-xs ${
                    Math.abs(splitDifference) < 0.01
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {Math.abs(splitDifference) < 0.01
                    ? "Split is balanced"
                    : `Difference: ${formatCurrency(splitDifference)}`}
                </p>
              </div>
            </div>
          )}

          {splitMode === "percentage" && (
            <div className="space-y-2">
              {percentageDrafts
                .filter((d) => participants.includes(d.userId))
                .map((d) => (
                  <div key={d.userId} className="grid grid-cols-2 gap-2">
                    <Input value={d.name} disabled className="text-sm" />
                    <Input
                      type="number"
                      step="0.01"
                      value={d.amount}
                      onChange={(e) => updatePercentageDraft(d.userId, e.target.value)}
                      placeholder="Percentage"
                    />
                  </div>
                ))}
              <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Total:{" "}
                    <span className="font-semibold text-foreground">
                      {percentageTotal.toFixed(2)}%
                    </span>
                  </p>
                  <Button variant="outline" size="sm" onClick={fillPercentagesEqually}>
                    Split Equally
                  </Button>
                </div>
                <p
                  className={`text-xs ${
                    Math.abs(percentageDifference) < 0.01
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {Math.abs(percentageDifference) < 0.01
                    ? "Percentages are valid"
                    : `Remaining: ${percentageDifference.toFixed(2)}%`}
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="expense-notes" className="text-xs font-medium mb-1.5 block">
              Notes (optional)
            </Label>
            <textarea
              id="expense-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
