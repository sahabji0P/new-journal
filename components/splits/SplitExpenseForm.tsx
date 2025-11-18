"use client"

import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card } from "../ui/card"
import { Switch } from "../ui/switch"
import { Plus, X, Users, DollarSign } from "lucide-react"
import type { ExpenseSplit } from "@/lib/types"

interface SplitExpenseFormProps {
  totalAmount: number
  onSplitsChange: (splits: ExpenseSplit[] | undefined) => void
  initialSplits?: ExpenseSplit[]
}

export function SplitExpenseForm({ totalAmount, onSplitsChange, initialSplits }: SplitExpenseFormProps) {
  const [isEnabled, setIsEnabled] = useState(!!initialSplits && initialSplits.length > 0)
  const [splits, setSplits] = useState<ExpenseSplit[]>(initialSplits || [])
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")

  useEffect(() => {
    if (isEnabled && splits.length === 0) {
      // Initialize with 2 people for equal split
      const defaultSplits: ExpenseSplit[] = [
        { id: 1, personName: "", amount: totalAmount / 2, isPaid: false },
        { id: 2, personName: "", amount: totalAmount / 2, isPaid: false },
      ]
      setSplits(defaultSplits)
      onSplitsChange(defaultSplits)
    } else if (!isEnabled) {
      setSplits([])
      onSplitsChange(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, splits.length, totalAmount])

  useEffect(() => {
    if (isEnabled && splitMode === "equal" && splits.length > 0) {
      const amountPerPerson = totalAmount / splits.length
      const updatedSplits = splits.map(split => ({
        ...split,
        amount: amountPerPerson,
      }))
      setSplits(updatedSplits)
      onSplitsChange(updatedSplits)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, splits.length, splitMode, isEnabled])

  const addPerson = () => {
    const newId = Math.max(...splits.map(s => s.id), 0) + 1
    const newSplits = [
      ...splits,
      {
        id: newId,
        personName: "",
        amount: splitMode === "equal" ? totalAmount / (splits.length + 1) : 0,
        isPaid: false,
      },
    ]

    if (splitMode === "equal") {
      const amountPerPerson = totalAmount / newSplits.length
      newSplits.forEach(split => {
        split.amount = amountPerPerson
      })
    }

    setSplits(newSplits)
    onSplitsChange(newSplits)
  }

  const removePerson = (id: number) => {
    const newSplits = splits.filter(s => s.id !== id)

    if (splitMode === "equal" && newSplits.length > 0) {
      const amountPerPerson = totalAmount / newSplits.length
      newSplits.forEach(split => {
        split.amount = amountPerPerson
      })
    }

    setSplits(newSplits)
    onSplitsChange(newSplits.length > 0 ? newSplits : undefined)
  }

  const updatePerson = (id: number, field: "personName" | "amount" | "isPaid", value: string | number | boolean) => {
    const newSplits = splits.map(split =>
      split.id === id ? { ...split, [field]: value } : split
    )
    setSplits(newSplits)
    onSplitsChange(newSplits)
  }

  const totalSplit = splits.reduce((sum, split) => sum + (parseFloat(split.amount.toString()) || 0), 0)
  const difference = totalAmount - totalSplit
  const isBalanced = Math.abs(difference) < 0.01

  if (!isEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label className="font-semibold">Split This Expense</Label>
              <p className="text-xs text-muted-foreground">Share costs with multiple people</p>
            </div>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <Label className="font-semibold">Split This Expense</Label>
            <p className="text-xs text-muted-foreground">Sharing ${totalAmount.toFixed(2)} among {splits.length} people</p>
          </div>
        </div>
        <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={splitMode === "equal" ? "default" : "outline"}
          size="sm"
          onClick={() => setSplitMode("equal")}
          className="flex-1"
        >
          Split Equally
        </Button>
        <Button
          type="button"
          variant={splitMode === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => setSplitMode("custom")}
          className="flex-1"
        >
          Custom Amounts
        </Button>
      </div>

      <div className="space-y-2">
        {splits.map((split, index) => (
          <Card key={split.id} className="p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`person-${split.id}`} className="text-xs">
                    Person {index + 1}
                  </Label>
                  <Input
                    id={`person-${split.id}`}
                    placeholder="Name"
                    value={split.personName}
                    onChange={e => updatePerson(split.id, "personName", e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor={`amount-${split.id}`} className="text-xs">
                    Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id={`amount-${split.id}`}
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={e => updatePerson(split.id, "amount", parseFloat(e.target.value) || 0)}
                      disabled={splitMode === "equal"}
                      className="h-9 pl-7"
                    />
                  </div>
                </div>
              </div>
              {splits.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePerson(split.id)}
                  className="mt-5 h-9 w-9 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addPerson}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Person
      </Button>

      {!isBalanced && splitMode === "custom" && (
        <div className={`p-3 rounded-lg ${difference > 0 ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" : "bg-red-500/10 text-red-700 dark:text-red-400"}`}>
          <p className="text-sm font-mono">
            {difference > 0
              ? `⚠️ Unallocated: $${Math.abs(difference).toFixed(2)}`
              : `⚠️ Over-allocated: $${Math.abs(difference).toFixed(2)}`
            }
          </p>
          <p className="text-xs font-mono mt-1">
            Total splits: ${totalSplit.toFixed(2)} / ${totalAmount.toFixed(2)}
          </p>
        </div>
      )}

      {isBalanced && splits.length > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <p className="text-sm font-mono">
            ✓ Split balanced - ${totalAmount.toFixed(2)} split among {splits.length} people
          </p>
        </div>
      )}
    </div>
  )
}
