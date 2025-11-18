"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useApp } from "@/contexts/AppContext"
import type { Transaction } from "@/lib/types"
import { ArrowDownCircle, ArrowUpCircle, Calendar, Tag, User } from "lucide-react"
import { useMemo } from "react"

interface TransactionsSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterType: "category" | "party" | "account" | "tag" | null
  filterValue: string | number | null
  title?: string
}

export function TransactionsSidebar({
  open,
  onOpenChange,
  filterType,
  filterValue,
  title,
}: TransactionsSidebarProps) {
  const { transactions, formatCurrency, formatDate } = useApp()

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="font-mono">{title || "Transactions"}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {stats.total} transaction{stats.total !== 1 ? "s" : ""} found
          </SheetDescription>
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
          <div className="p-6 pt-4 space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground font-mono text-sm">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="p-4 bg-card border rounded-lg hover:shadow-md clean-transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          transaction.type === "income"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold font-mono text-sm mb-1 truncate">
                          {transaction.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(transaction.date)}
                          </span>
                          {transaction.party && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {transaction.party}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-mono">
                            {transaction.category}
                          </span>
                          {transaction.tags?.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded font-mono flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p
                        className={`font-bold font-mono text-sm ${
                          transaction.type === "income" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : ""}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {transaction.accountName}
                      </p>
                    </div>
                  </div>
                  {transaction.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground font-mono">{transaction.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
