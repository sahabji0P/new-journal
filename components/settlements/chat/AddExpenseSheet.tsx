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
import { CheckCircle } from "lucide-react"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
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
    prePaidUserIds?: string[]
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
  const [prePaidUsers, setPrePaidUsers] = useState<Set<string>>(new Set())
  const [showPrePaid, setShowPrePaid] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

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
    setPrePaidUsers(new Set())
    setShowPrePaid(false)
    setShowNotes(false)
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
          prePaidUserIds: Array.from(prePaidUsers),
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
          prePaidUserIds: Array.from(prePaidUsers),
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
          prePaidUserIds: Array.from(prePaidUsers),
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
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl px-4 pb-8 pt-4">
        <SheetHeader className="px-0">
          <SheetTitle>Add Expense</SheetTitle>
          <SheetDescription className="text-xs">
            Split a shared expense among group members.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Section 1 — Description */}
          <div>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          {/* Section 2 — Amount */}
          <div className="text-center py-3">
            <Label className="text-xs text-muted-foreground">Total Amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="text-3xl font-bold text-center border-0 focus-visible:ring-0 bg-transparent"
            />
          </div>

          {/* Section 3 — Paid By */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Paid by</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setPaidByUserId(m.userId)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition-colors",
                    paidByUserId === m.userId
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-muted hover:bg-muted/50"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                    {m.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4 — Split Mode */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Split</Label>
            <div className="flex rounded-lg border p-0.5 bg-muted/30">
              {(["equal", "custom", "percentage"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={cn(
                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                    splitMode === mode
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "equal" ? "Equal" : mode === "custom" ? "Custom" : "Percent"}
                </button>
              ))}
            </div>
          </div>

          {/* Section 5 — Participants */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Split between</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const isParticipant = participants.includes(m.userId)
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleParticipant(m.userId, !isParticipant)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition-colors",
                      isParticipant
                        ? "border-foreground/20 bg-foreground/5"
                        : "border-dashed border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                        isParticipant ? "bg-primary/20 text-primary" : "bg-muted"
                      )}
                    >
                      {isParticipant ? "✓" : m.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    {m.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 6 — Custom split amounts */}
          {splitMode === "custom" && (
            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
              {splitDrafts.filter((d) => participants.includes(d.userId)).map((d) => (
                <div key={d.userId} className="flex items-center gap-3">
                  <span className="text-sm w-16 sm:w-24 truncate shrink-0">{d.name}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={d.amount}
                    onChange={(e) => updateSplitDraft(d.userId, e.target.value)}
                    placeholder="0.00"
                    className="flex-1 min-w-0"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <span
                  className={cn(
                    "text-xs min-w-0 truncate",
                    Math.abs(splitDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {Math.abs(splitDifference) < 0.01
                    ? "Balanced ✓"
                    : `Difference: ${formatCurrency(splitDifference)}`}
                </span>
                <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={fillSplitEqually}>
                  Split equally
                </Button>
              </div>
            </div>
          )}

          {/* Section 6 — Percentage split */}
          {splitMode === "percentage" && (
            <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
              {percentageDrafts.filter((d) => participants.includes(d.userId)).map((d) => (
                <div key={d.userId} className="flex items-center gap-3">
                  <span className="text-sm w-16 sm:w-24 truncate shrink-0">{d.name}</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={d.amount}
                    onChange={(e) => updatePercentageDraft(d.userId, e.target.value)}
                    placeholder="0"
                    className="flex-1 min-w-0"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <span
                  className={cn(
                    "text-xs min-w-0 truncate",
                    Math.abs(percentageDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {Math.abs(percentageDifference) < 0.01
                    ? "Balanced ✓"
                    : `Remaining: ${percentageDifference.toFixed(2)}%`}
                </span>
                <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={fillPercentagesEqually}>
                  Split equally
                </Button>
              </div>
            </div>
          )}

          {/* Section 7 — Equal split summary */}
          {splitMode === "equal" && participants.length > 0 && parsedTotal > 0 && (
            <div className="rounded-lg border border-dashed bg-muted/10 p-3 text-center">
              <p className="text-sm">
                <span className="font-semibold">{formatCurrency(parsedTotal / participants.length)}</span>
                <span className="text-muted-foreground"> per person</span>
              </p>
            </div>
          )}

          {/* Section 8 — Pre-paid tracking */}
          {participants.length > 1 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowPrePaid(!showPrePaid)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPrePaid ? "Hide" : "Already paid their share?"}
              </button>
              {showPrePaid && (
                <div className="flex flex-wrap gap-2">
                  {members
                    .filter((m) => participants.includes(m.userId) && m.userId !== paidByUserId)
                    .map((m) => {
                      const isPrepaid = prePaidUsers.has(m.userId)
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => {
                            setPrePaidUsers((prev) => {
                              const next = new Set(prev)
                              if (isPrepaid) { next.delete(m.userId) } else { next.add(m.userId) }
                              return next
                            })
                          }}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors",
                            isPrepaid
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : "border-muted"
                          )}
                        >
                          {isPrepaid && <CheckCircle className="h-3 w-3" />}
                          {m.name}
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* Section 9 — Notes (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showNotes ? "Hide notes" : "Add notes"}
            </button>
            {showNotes && (
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                className="mt-2"
              />
            )}
          </div>

          {/* Section 10 — Submit */}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
