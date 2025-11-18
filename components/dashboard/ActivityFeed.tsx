"use client"

import { useApp } from "@/contexts/AppContext"
import { ArrowDownCircle, ArrowUpCircle, Calendar, Tag, User } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

interface ActivityFeedProps {
  selectedDate: string | null  // ISO date string (YYYY-MM-DD) or null for last 24 hours
}

export function ActivityFeed({ selectedDate }: ActivityFeedProps) {
  const { transactions, formatCurrency, formatDate } = useApp()

  const filteredTransactions = useMemo(() => {
    if (selectedDate) {
      // Show transactions for the specific date
      return transactions
        .filter(t => {
          const txDate = new Date(t.date).toISOString().split("T")[0]
          return txDate === selectedDate
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else {
      // Show transactions from last 24 hours
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      return transactions
        .filter(t => {
          const txDate = new Date(t.date)
          return txDate >= yesterday && txDate <= now
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  }, [transactions, selectedDate])

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

  const getTimeDisplay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate + "T00:00:00")
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
    return "Last 24 Hours"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">Activity Feed</CardTitle>
        <CardDescription className="font-mono text-xs flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          {getTimeDisplay()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Total</p>
            <p className="text-sm font-bold font-mono">{stats.total}</p>
          </div>
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
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground font-mono text-sm">
                No transactions found for this period
              </p>
            </div>
          ) : (
            filteredTransactions.map(transaction => (
              <div
                key={transaction.id}
                className="p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
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
                        <span>{formatDate(transaction.date)}</span>
                        {transaction.party && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {transaction.party}
                            </span>
                          </>
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
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
