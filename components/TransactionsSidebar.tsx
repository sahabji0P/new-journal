"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { TransactionFormModern } from "@/components/transactions/TransactionFormModern"
import { iconForTransaction, transactionTimeLabel } from "@/components/transactions/transaction-utils"
import { format, isSameDay, isToday, subDays } from "date-fns"

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

interface DayGroup {
  key: string
  heading: string
  subtitle: string
  transactions: Transaction[]
}

function getDayGroupHeading(date: Date): string {
  if (isToday(date)) return "Today"
  if (isSameDay(date, subDays(new Date(), 1))) return "Yesterday"
  return format(date, "EEEE")
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

  // Group sorted transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: DayGroup[] = []
    let currentKey = ""

    for (const transaction of sortedTransactions) {
      const date = new Date(transaction.date)
      const key = format(date, "yyyy-MM-dd")

      if (key !== currentKey) {
        currentKey = key
        groups.push({
          key,
          heading: getDayGroupHeading(date),
          subtitle: format(date, "MMM d, yyyy"),
          transactions: [transaction],
        })
      } else {
        groups[groups.length - 1].transactions.push(transaction)
      }
    }

    return groups
  }, [sortedTransactions])

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
          <div className="px-4 pt-3 pb-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-mono text-sm">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Sort controls */}
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
                </div>

                {/* Transaction rows grouped by date */}
                <div>
                  {sortKey === "date" ? (
                    // Date-grouped view
                    groupedTransactions.map(group => (
                      <div key={group.key}>
                        <div className="flex items-baseline justify-between px-2 pt-4 pb-1">
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {group.heading}
                            </h3>
                            <span className="text-[11px] text-muted-foreground/70">
                              {group.subtitle}
                            </span>
                          </div>
                        </div>
                        {group.transactions.map(transaction => (
                          <SidebarTransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            formatCurrency={formatCurrency}
                            onEdit={openEditDialog}
                            onDelete={openDeleteDialog}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    // Flat sorted view (non-date sort)
                    sortedTransactions.map(transaction => (
                      <SidebarTransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        showDate
                        onEdit={openEditDialog}
                        onDelete={openDeleteDialog}
                      />
                    ))
                  )}
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

// --- Sidebar-specific transaction row with inline edit/delete actions ---

interface SidebarTransactionRowProps {
  transaction: Transaction
  formatCurrency: (amount: number) => string
  formatDate?: (date: string) => string
  showDate?: boolean
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

function SidebarTransactionRow({
  transaction,
  formatCurrency,
  formatDate,
  showDate = false,
  onEdit,
  onDelete,
}: SidebarTransactionRowProps) {
  const Icon = iconForTransaction(transaction)
  const isIncome = transaction.type === "income"

  const secondaryParts = [transaction.category]
  if (transaction.party) secondaryParts.push(transaction.party)
  if (showDate && formatDate) {
    secondaryParts.push(formatDate(transaction.date))
  } else {
    secondaryParts.push(transactionTimeLabel(transaction.date))
  }
  const secondaryText = secondaryParts.join(" \u00B7 ")

  return (
    <div className="group flex items-center gap-3 rounded-lg py-2.5 px-2 hover:bg-muted/40 transition-colors">
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isIncome
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {transaction.description}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {secondaryText}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className={cn(
          "text-[13px] font-semibold whitespace-nowrap",
          isIncome ? "text-emerald-500" : "text-foreground"
        )}>
          {formatCurrency(transaction.amount)}
        </p>
        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
          {transaction.accountName || "Unknown"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(transaction)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
