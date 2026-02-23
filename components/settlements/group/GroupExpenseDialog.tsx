"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { toast } from "@/lib/toast"

type SplitDraft = {
  id: string
  name: string
  amount: string
}

interface GroupExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: Array<{ userId: string; name: string }>
  onSubmit: (data: {
    description: string
    totalAmount: number
    paidByUserId: string
    splitType: "equal" | "custom" | "percentage"
    splitBetween?: string[]
    shares?: Array<{ userId: string; amount: number }>
    percentageShares?: Array<{ userId: string; percentage: number }>
    notes?: string
  }) => Promise<void>
  formatCurrency: (n: number) => string
}

export function GroupExpenseDialog({
  open,
  onOpenChange,
  members,
  onSubmit,
  formatCurrency,
}: GroupExpenseDialogProps) {
  const [description, setDescription] = useState("")
  const [totalAmount, setTotalAmount] = useState("")
  const [payer, setPayer] = useState("")
  const [splitMode, setSplitMode] = useState<"equal" | "custom" | "percentage">("equal")
  const [participants, setParticipants] = useState<string[]>([])
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([])
  const [percentageDrafts, setPercentageDrafts] = useState<SplitDraft[]>([])
  const [notes, setNotes] = useState("")

  const resetForm = useCallback(() => {
    setDescription("")
    setTotalAmount("")
    setPayer(members[0]?.userId || "")
    setSplitMode("equal")
    setParticipants(members.map(m => m.userId))
    setSplitDrafts(members.map(m => ({ id: m.userId, name: m.name, amount: "" })))
    setPercentageDrafts(members.map(m => ({ id: m.userId, name: m.name, amount: "" })))
    setNotes("")
  }, [members])

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const parsedTotal = useMemo(() => {
    const total = Number(totalAmount)
    return Number.isFinite(total) ? total : 0
  }, [totalAmount])

  const splitTotal = useMemo(() => {
    return splitDrafts
      .filter(draft => participants.includes(draft.id))
      .reduce((sum, draft) => {
        const amount = Number(draft.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
  }, [participants, splitDrafts])

  const percentageTotal = useMemo(() => {
    return percentageDrafts
      .filter(draft => participants.includes(draft.id))
      .reduce((sum, draft) => {
        const amount = Number(draft.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
  }, [participants, percentageDrafts])

  const splitDifference = useMemo(() => parsedTotal - splitTotal, [parsedTotal, splitTotal])
  const percentageDifference = useMemo(() => 100 - percentageTotal, [percentageTotal])

  const toggleParticipant = (userId: string, checked: boolean) => {
    setParticipants(previous => {
      if (checked) {
        if (previous.includes(userId)) return previous
        return [...previous, userId]
      }

      if (previous.length <= 1) {
        toast.warning("At least one participant is required")
        return previous
      }

      return previous.filter(id => id !== userId)
    })
  }

  const updateSplitDraft = (id: string, amount: string) => {
    setSplitDrafts(previous =>
      previous.map(draft =>
        draft.id === id ? { ...draft, amount } : draft
      )
    )
  }

  const updatePercentageDraft = (id: string, amount: string) => {
    setPercentageDrafts(previous =>
      previous.map(draft =>
        draft.id === id ? { ...draft, amount } : draft
      )
    )
  }

  const fillGroupSharesEqually = () => {
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

    setSplitDrafts(previous =>
      previous.map(draft => {
        if (!participants.includes(draft.id)) {
          return { ...draft, amount: "" }
        }

        assigned += 1
        if (assigned === participants.length) {
          const previousTotal = Number((perHead * (participants.length - 1)).toFixed(2))
          return {
            ...draft,
            amount: Number((total - previousTotal).toFixed(2)).toString(),
          }
        }

        return { ...draft, amount: perHead.toString() }
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

    setPercentageDrafts(previous =>
      previous.map(draft => {
        if (!participants.includes(draft.id)) {
          return { ...draft, amount: "" }
        }

        assigned += 1
        if (assigned === participants.length) {
          const previousTotal = Number((perHead * (participants.length - 1)).toFixed(2))
          return {
            ...draft,
            amount: Number((100 - previousTotal).toFixed(2)).toString(),
          }
        }

        return { ...draft, amount: perHead.toString() }
      })
    )
  }

  const handleSubmit = async () => {
    const total = Number(totalAmount)
    if (!description.trim() || !Number.isFinite(total) || total <= 0) {
      toast.warning("Enter description and valid total amount")
      return
    }

    if (!payer) {
      toast.warning("Select who paid for this transaction")
      return
    }

    if (participants.length === 0) {
      toast.warning("Select at least one split participant")
      return
    }

    if (splitMode === "custom") {
      const shares = splitDrafts
        .filter(draft => participants.includes(draft.id))
        .map(draft => ({
          userId: draft.id,
          amount: Number(draft.amount),
        }))

      if (shares.some(share => !Number.isFinite(share.amount) || share.amount < 0)) {
        toast.warning("Enter valid split amounts for all selected participants")
        return
      }

      const totalShares = shares.reduce((sum, share) => sum + share.amount, 0)
      if (Math.abs(totalShares - total) > 0.01) {
        toast.warning("Custom split total must match transaction total")
        return
      }

      await onSubmit({
        description: description.trim(),
        totalAmount: total,
        paidByUserId: payer,
        splitType: "custom",
        notes: notes.trim() || undefined,
        shares,
      })
    } else if (splitMode === "percentage") {
      const percentageShares = percentageDrafts
        .filter(draft => participants.includes(draft.id))
        .map(draft => ({
          userId: draft.id,
          percentage: Number(draft.amount),
        }))

      if (percentageShares.some(share => !Number.isFinite(share.percentage) || share.percentage < 0)) {
        toast.warning("Enter valid percentages for selected participants")
        return
      }

      const totalPercentage = percentageShares.reduce((sum, share) => sum + share.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.warning("Percentage total must equal 100%")
        return
      }

      await onSubmit({
        description: description.trim(),
        totalAmount: total,
        paidByUserId: payer,
        splitType: "percentage",
        percentageShares,
        notes: notes.trim() || undefined,
      })
    } else {
      await onSubmit({
        description: description.trim(),
        totalAmount: total,
        paidByUserId: payer,
        splitType: "equal",
        splitBetween: participants,
        notes: notes.trim() || undefined,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-mono">Add Group Expense</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Record a shared expense and split it among group members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Dinner at downtown"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="Total amount"
            />
            <Select value={payer} onValueChange={setPayer}>
              <SelectTrigger>
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={splitMode} onValueChange={value => setSplitMode(value as "equal" | "custom" | "percentage")}>
              <SelectTrigger>
                <SelectValue placeholder="Split mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal split</SelectItem>
                <SelectItem value="custom">Custom split</SelectItem>
                <SelectItem value="percentage">Percentage split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-muted/20 p-2.5">
            <p className="text-xs font-medium mb-2">Split Participants</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {members.map(member => (
                <label key={member.userId} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={participants.includes(member.userId)}
                    onCheckedChange={checked => toggleParticipant(member.userId, Boolean(checked))}
                  />
                  <span>{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {splitMode === "custom" && (
            <div className="space-y-2">
              {splitDrafts
                .filter(draft => participants.includes(draft.id))
                .map(draft => (
                  <div key={draft.id} className="grid grid-cols-2 gap-2">
                    <Input value={draft.name} disabled />
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.amount}
                      onChange={e => updateSplitDraft(draft.id, e.target.value)}
                      placeholder="Share amount"
                    />
                  </div>
                ))}
              <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Split total: <span className="font-semibold text-foreground">{formatCurrency(splitTotal)}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={fillGroupSharesEqually}>
                    Fill equally
                  </Button>
                </div>
                <p className={`text-xs ${Math.abs(splitDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                  {Math.abs(splitDifference) < 0.01
                    ? "Custom split is balanced \u2713"
                    : `Difference: ${formatCurrency(splitDifference)}`}
                </p>
              </div>
            </div>
          )}

          {splitMode === "percentage" && (
            <div className="space-y-2">
              {percentageDrafts
                .filter(draft => participants.includes(draft.id))
                .map(draft => (
                  <div key={draft.id} className="grid grid-cols-2 gap-2">
                    <Input value={draft.name} disabled />
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.amount}
                      onChange={e => updatePercentageDraft(draft.id, e.target.value)}
                      placeholder="Percentage"
                    />
                  </div>
                ))}
              <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Total percentage: <span className="font-semibold text-foreground">{percentageTotal.toFixed(2)}%</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={fillPercentagesEqually}>
                    Fill equally
                  </Button>
                </div>
                <p className={`text-xs ${Math.abs(percentageDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                  {Math.abs(percentageDifference) < 0.01
                    ? "Percentage split is valid \u2713"
                    : `Remaining: ${percentageDifference.toFixed(2)}%`}
                </p>
              </div>
            </div>
          )}

          {splitMode === "equal" && (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
              Equal split will divide the total amount among selected participants automatically.
            </p>
          )}

          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
          />

          <Button onClick={handleSubmit} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
