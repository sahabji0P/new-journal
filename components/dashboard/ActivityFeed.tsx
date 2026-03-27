"use client"

import { useApp } from "@/contexts/AppContext"
import { ArrowDownCircle, ArrowUpCircle, Calendar } from "lucide-react"
import { useMemo, useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

interface ActivityFeedProps {
  selectedDate: string | null  // ISO date string (YYYY-MM-DD) or null for last 24 hours
}

export function ActivityFeed({ selectedDate }: ActivityFeedProps) {
  const { transactions, formatCurrency, formatDate } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-stat-item]",
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.05, ease: "power2.out" }
      )
      gsap.fromTo("[data-feed-item]",
        { y: 10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.24, stagger: 0.02, ease: "power2.out" }
      )
    })
  }, { scope: containerRef })

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
    <Card ref={containerRef}>
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
          <div data-stat-item className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Total</p>
            <p className="text-sm font-bold font-mono">{stats.total}</p>
          </div>
          <div data-stat-item className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Income</p>
            <p className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(stats.income)}</p>
          </div>
          <div data-stat-item className="text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">Expense</p>
            <p className="text-sm font-bold text-red-600 font-mono">{formatCurrency(stats.expense)}</p>
          </div>
          <div data-stat-item className="text-center">
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
                data-feed-item
                key={transaction.id}
                className="py-3 px-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        transaction.type === "income"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpCircle className="w-4 h-4" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {transaction.category}
                        {transaction.party ? ` · ${transaction.party}` : ""}
                        {` · ${formatDate(transaction.date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-semibold text-sm whitespace-nowrap ${
                        transaction.type === "income" ? "text-emerald-500" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
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
