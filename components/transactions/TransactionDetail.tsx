"use client"

import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Card } from "../ui/card"
import { SplitViewer } from "../splits/SplitViewer"

type TransactionDetailProps = {
  transaction: Transaction | null
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose?: () => void
  isMobile?: boolean
}

export function TransactionDetail({
  transaction,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  isMobile = false,
}: TransactionDetailProps) {
  const {
    accounts,
    categories,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addTemplate,
    formatCurrency,
    formatDate,
  } = useApp()

  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: "",
    category: "",
    type: "expense" as "income" | "expense",
    accountId: "",
    party: "",
    notes: "",
    tags: "",
  })

  // Related transactions by party
  const relatedByParty = useMemo(() => {
    if (!transaction?.party) return []
    return transactions
      .filter((t) => t.party === transaction.party && t.id !== transaction.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [transaction, transactions])

  // Related transactions by category
  const relatedByCategory = useMemo(() => {
    if (!transaction?.category) return []
    return transactions
      .filter((t) => t.category === transaction.category && t.id !== transaction.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [transaction, transactions])

  // Stats by party
  const partyStats = useMemo(() => {
    if (!transaction?.party) return null
    const partyTransactions = transactions.filter((t) => t.party === transaction.party)
    const totalIncome = partyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = Math.abs(
      partyTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    )
    return {
      count: partyTransactions.length,
      income: totalIncome,
      expense: totalExpense,
    }
  }, [transaction, transactions])

  // Stats by category
  const categoryStats = useMemo(() => {
    if (!transaction?.category) return null
    const categoryTransactions = transactions.filter((t) => t.category === transaction.category)
    const totalIncome = categoryTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = Math.abs(
      categoryTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    )
    return {
      count: categoryTransactions.length,
      income: totalIncome,
      expense: totalExpense,
    }
  }, [transaction, transactions])

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        date: transaction.date,
        category: transaction.category,
        type: transaction.type,
        accountId: transaction.accountId.toString(),
        party: transaction.party || "",
        notes: transaction.notes || "",
        tags: transaction.tags?.join(", ") || "",
      })
      setEditing(false)
    }
  }, [transaction])

  if (!transaction) {
    return (
      <Card className="p-4">
        <p className="font-mono text-xs text-muted-foreground">
          Select a transaction to view details.
        </p>
      </Card>
    )
  }

  const handleSave = () => {
    const account = accounts.find((a) => a.id === Number.parseInt(formData.accountId))
    if (!account) return

    const finalAmount =
      formData.type === "expense"
        ? -Math.abs(Number.parseFloat(formData.amount))
        : Math.abs(Number.parseFloat(formData.amount))

    const tagArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t)

    updateTransaction(transaction.id, {
      description: formData.description,
      amount: finalAmount,
      date: formData.date,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      party: formData.party.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    setEditing(false)
  }

  const handleDelete = () => {
    deleteTransaction(transaction.id)
    if (isMobile && onClose) {
      onClose()
    }
  }

  const handleMarkSplitPaid = (splitId: number, isPaid: boolean) => {
    if (!transaction?.splits) return

    const updatedSplits = transaction.splits.map(split =>
      split.id === splitId
        ? { ...split, isPaid, paidDate: isPaid ? new Date().toISOString() : undefined }
        : split
    )

    const account = accounts.find((a) => a.id === transaction.accountId)
    if (!account) return

    updateTransaction(transaction.id, {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      accountId: account.id,
      accountName: account.name,
      party: transaction.party,
      notes: transaction.notes,
      tags: transaction.tags,
      splits: updatedSplits,
    })
  }

  const typeColor = transaction.type === "income" ? "text-emerald-600" : "text-red-600"
  const account = accounts.find((a) => a.id === transaction.accountId)

  return (
    <div className="p-4 md:max-h-[80vh] md:overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-mono text-sm">
          {editing ? "Edit Transaction" : "Transaction Details"}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Previous transaction"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Next transaction"
          >
            Next
          </Button>
        </div>
      </div>

      {!editing ? (
        <>
          {/* View Mode */}
          <div className="space-y-3">
            {/* Main Info */}
            <div className="grid grid-cols-2 gap-2">
              <InfoField label="Date" value={formatDate(transaction.date)} />
              <InfoField label="Account" value={account?.name || "—"} />
              <InfoField
                label="Type"
                value={transaction.type.toUpperCase()}
                valueClass={typeColor}
              />
              <InfoField
                label="Amount"
                value={formatCurrency(transaction.amount)}
                valueClass={`font-semibold ${typeColor}`}
              />
              <InfoField label="Category" value={transaction.category} />
              <InfoField label="Party" value={transaction.party || "—"} />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <InfoField label="Description" value={transaction.description} />
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="col-span-2">
                <InfoField label="Notes" value={transaction.notes} />
              </div>
            )}

            {/* Tags */}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="p-2 rounded border">
                <p className="font-mono text-[11px] text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {transaction.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-mono bg-muted rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Split Expense Viewer */}
            {transaction.splits && transaction.splits.length > 0 && (
              <div className="col-span-2">
                <SplitViewer
                  splits={transaction.splits}
                  totalAmount={Math.abs(transaction.amount)}
                  onMarkPaid={handleMarkSplitPaid}
                  readonly={editing}
                />
              </div>
            )}

            {/* Party Stats */}
            {transaction.party && partyStats && (
              <div className="p-2 rounded border">
                <p className="font-mono text-[11px] text-muted-foreground mb-2">
                  {transaction.party} Summary
                </p>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Total Transactions</span>
                  <span>{partyStats.count}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Income</span>
                  <span className="text-emerald-600">{formatCurrency(partyStats.income)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Expense</span>
                  <span className="text-red-600">{formatCurrency(partyStats.expense)}</span>
                </div>
              </div>
            )}

            {/* Category Stats */}
            {transaction.category && categoryStats && (
              <div className="p-2 rounded border">
                <p className="font-mono text-[11px] text-muted-foreground mb-2">
                  {transaction.category} Summary
                </p>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Total Transactions</span>
                  <span>{categoryStats.count}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Income</span>
                  <span className="text-emerald-600">{formatCurrency(categoryStats.income)}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Expense</span>
                  <span className="text-red-600">{formatCurrency(categoryStats.expense)}</span>
                </div>
              </div>
            )}

            {/* Related by Party */}
            {relatedByParty.length > 0 && (
              <div className="p-2 rounded border">
                <p className="font-mono text-[11px] text-muted-foreground mb-2">
                  Recent with {transaction.party}
                </p>
                <div className="space-y-2">
                  {relatedByParty.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{formatDate(t.date)}</span>
                      <span className={t.type === "income" ? "text-emerald-600" : "text-red-600"}>
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related by Category */}
            {relatedByCategory.length > 0 && (
              <div className="p-2 rounded border">
                <p className="font-mono text-[11px] text-muted-foreground mb-2">
                  Recent in {transaction.category}
                </p>
                <div className="space-y-2">
                  {relatedByCategory.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs font-mono">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">{formatDate(t.date)}</span>
                        <span className="text-[10px] text-muted-foreground">{t.description}</span>
                      </div>
                      <span className={t.type === "income" ? "text-emerald-600" : "text-red-600"}>
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="font-mono text-xs"
              onClick={() => setEditing(true)}
              aria-label="Edit transaction"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs"
              onClick={() => {
                const account = accounts.find((a) => a.id === transaction.accountId)
                if (!account) return
                addTransaction({
                  description: `${transaction.description} (copy)`,
                  amount: transaction.amount,
                  date: new Date().toISOString().split("T")[0],
                  category: transaction.category,
                  type: transaction.type,
                  accountId: account.id,
                  accountName: account.name,
                  party: transaction.party,
                  notes: transaction.notes,
                  tags: transaction.tags,
                })
              }}
              aria-label="Duplicate transaction"
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="font-mono text-xs"
              onClick={() => {
                addTemplate({
                  name: transaction.description,
                  description: transaction.description,
                  amount: Math.abs(transaction.amount),
                  category: transaction.category,
                  type: transaction.type,
                  party: transaction.party,
                  tags: transaction.tags,
                  accountId: transaction.accountId,
                  notes: transaction.notes,
                  icon: "Receipt",
                  color: transaction.type === "income" ? "green" : "red",
                })
              }}
              aria-label="Create template from transaction"
            >
              Save as Template
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="font-mono text-xs"
              onClick={handleDelete}
              aria-label="Delete transaction"
            >
              Delete
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Edit Mode */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Account
              </label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Category
              </label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Party (optional)
              </label>
              <Input
                value={formData.party}
                onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                placeholder="e.g., Amazon, Starbucks"
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Notes (optional)
              </label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details"
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground mb-1">
                Tags (comma-separated, optional)
              </label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., vacation, food, health"
                className="font-mono"
              />
            </div>
          </div>

          {/* Edit Actions */}
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="font-mono text-xs" onClick={handleSave}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="font-mono text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {isMobile && <div className="h-2" />}
    </div>
  )
}

function InfoField({
  label,
  value,
  valueClass = "",
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="p-2 rounded border">
      <p className="font-mono text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm ${valueClass}`}>{value}</p>
    </div>
  )
}
