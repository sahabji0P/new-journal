"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import { ArrowUpDown, Eye } from "lucide-react"
import { Pencil, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { TransactionFormModern } from "@/components/transactions/TransactionFormModern"

interface TransactionsSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterType: "category" | "party" | "account" | "tag" | null
  filterValue: string | number | null
  title?: string
  actionLabel?: string
  onAction?: () => void
}

type SortKey = "date" | "description" | "category" | "party" | "account" | "amount"
type SortDirection = "asc" | "desc"
type ColumnKey = "date" | "description" | "category" | "party" | "account" | "amount" | "tags"

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Date",
  description: "Description",
  category: "Category",
  party: "Party",
  account: "Account",
  amount: "Amount",
  tags: "Tags",
}

export function TransactionsSidebar({
  open,
  onOpenChange,
  filterType,
  filterValue,
  title,
  actionLabel,
  onAction,
}: TransactionsSidebarProps) {
  const { transactions, deleteTransaction, formatCurrency, formatDate } = useApp()
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transactionFormSeed, setTransactionFormSeed] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    date: true,
    description: true,
    category: true,
    party: false,
    account: false,
    amount: true,
    tags: false,
  })

  const filteredTransactions = useMemo(() => {
    if (!filterType || !filterValue) return []

    let filtered: Transaction[] = []

    switch (filterType) {
      case "category":
        filtered = transactions.filter(t => t.category === filterValue)
        break
      case "party":
        filtered = transactions.filter(t => t.party === filterValue)
        break
      case "account":
        filtered = transactions.filter(t => t.accountId === filterValue)
        break
      case "tag":
        filtered = transactions.filter(t => t.tags?.includes(filterValue as string))
        break
      default:
        filtered = []
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterType, filterValue])

  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalExpense = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return {
      total: filteredTransactions.length,
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
    }
  }, [filteredTransactions])

  const sortedTransactions = useMemo(() => {
    const rows = [...filteredTransactions]
    rows.sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "amount":
          comparison = a.amount - b.amount
          break
        case "description":
          comparison = a.description.localeCompare(b.description)
          break
        case "category":
          comparison = a.category.localeCompare(b.category)
          break
        case "party":
          comparison = (a.party || "").localeCompare(b.party || "")
          break
        case "account":
          comparison = (a.accountName || "").localeCompare(b.accountName || "")
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
    return rows
  }, [filteredTransactions, sortDirection, sortKey])

  const setColumnVisibility = (column: ColumnKey, checked: boolean) => {
    setVisibleColumns(previous => ({ ...previous, [column]: checked }))
  }

  const openEditDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setTransactionFormSeed(previous => previous + 1)
    setIsEditDialogOpen(true)
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedTransaction(null)
  }

  const openDeleteDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return
    deleteTransaction(selectedTransaction.id)
    setIsDeleteDialogOpen(false)
    setSelectedTransaction(null)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="font-mono">{title || "Transactions"}</SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {stats.total} transaction{stats.total !== 1 ? "s" : ""} found
              </SheetDescription>
            </div>
            {onAction && actionLabel && (
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                onClick={onAction}
              >
                {actionLabel}
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 px-6 py-4 bg-muted/30">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Income</p>
            <p className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(stats.income)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Expense</p>
            <p className="text-sm font-bold text-red-600 font-mono">{formatCurrency(stats.expense)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Net</p>
            <p className={`text-sm font-bold font-mono ${stats.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(stats.net)}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pt-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-mono text-sm">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
                  <div className="w-full sm:w-auto">
                    <Select value={sortKey} onValueChange={(value: SortKey) => setSortKey(value)}>
                      <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Sort by date</SelectItem>
                        <SelectItem value="amount">Sort by amount</SelectItem>
                        <SelectItem value="description">Sort by description</SelectItem>
                        <SelectItem value="category">Sort by category</SelectItem>
                        <SelectItem value="party">Sort by party</SelectItem>
                        <SelectItem value="account">Sort by account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setSortDirection(previous => (previous === "asc" ? "desc" : "asc"))}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                  </Button>
                  <details className="relative ml-auto">
                    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
                      <Eye className="h-3.5 w-3.5" />
                      Columns
                    </summary>
                    <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border bg-popover p-2 shadow-lg">
                      <div className="space-y-2">
                        {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map(column => (
                          <label key={column} className="flex items-center gap-2 text-xs">
                            <Checkbox
                              checked={visibleColumns[column]}
                              onCheckedChange={checked => setColumnVisibility(column, Boolean(checked))}
                            />
                            <span>{COLUMN_LABELS[column]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
                <div className="rounded-lg border">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {visibleColumns.date && <th className="px-3 py-2 text-left font-medium">Date</th>}
                      {visibleColumns.description && <th className="px-3 py-2 text-left font-medium">Description</th>}
                      {visibleColumns.category && <th className="px-3 py-2 text-left font-medium">Category</th>}
                      {visibleColumns.party && <th className="px-3 py-2 text-left font-medium">Party</th>}
                      {visibleColumns.account && <th className="px-3 py-2 text-left font-medium">Account</th>}
                      {visibleColumns.amount && <th className="px-3 py-2 text-left font-medium">Amount</th>}
                      {visibleColumns.tags && <th className="px-3 py-2 text-left font-medium">Tags</th>}
                      <th className="px-3 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.map(transaction => (
                      <tr key={transaction.id} className="border-t">
                        {visibleColumns.date && <td className="px-3 py-2 text-muted-foreground">{formatDate(transaction.date)}</td>}
                        {visibleColumns.description && (
                          <td className="px-3 py-2">
                            <p className="truncate font-medium">{transaction.description}</p>
                            {transaction.notes && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">{transaction.notes}</p>
                            )}
                            {!visibleColumns.category && (
                              <p className="text-xs text-muted-foreground">{transaction.category}</p>
                            )}
                            {!visibleColumns.account && (
                              <p className="text-xs text-muted-foreground">{transaction.accountName || "-"}</p>
                            )}
                          </td>
                        )}
                        {visibleColumns.category && (
                          <td className="px-3 py-2">
                            <span className="rounded-full border px-2 py-0.5 text-xs">{transaction.category}</span>
                          </td>
                        )}
                        {visibleColumns.party && <td className="px-3 py-2 text-muted-foreground">{transaction.party || "-"}</td>}
                        {visibleColumns.account && <td className="px-3 py-2 text-muted-foreground">{transaction.accountName || "-"}</td>}
                        {visibleColumns.amount && (
                          <td
                            className={`px-3 py-2 font-semibold ${
                              transaction.type === "income" ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(transaction.amount)}
                          </td>
                        )}
                        {visibleColumns.tags && (
                          <td className="px-3 py-2">
                            {transaction.tags?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {transaction.tags.map(tag => (
                                  <span
                                    key={`${transaction.id}-${tag}`}
                                    className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(transaction)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => openDeleteDialog(transaction)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            )}
          </div>
        </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update this transaction and save changes.</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <TransactionFormModern
              key={`sidebar-transaction-edit-${selectedTransaction.id}-${transactionFormSeed}`}
              mode="edit"
              initial={selectedTransaction}
              onSubmit={closeEditDialog}
              onCancel={closeEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{selectedTransaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedTransaction.date)} • {selectedTransaction.category}
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    selectedTransaction.type === "income" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(selectedTransaction.amount)}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false)
                    setSelectedTransaction(null)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteTransaction}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
