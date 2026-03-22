"use client"

import { useApp } from "@/contexts/AppContext"
import type { Account, Transaction } from "@/lib/types"
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Wallet,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState, useRef, useEffect } from "react"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { CashFlowChart } from "./CashFlowChart"
import { SpendingChart } from "./SpendingChart"
import { AccountsGrid } from "./AccountsGrid"

interface DashboardProps {
  accounts: Account[]
  transactions: Transaction[]
  selectedAccountIds: string[]
  toggleAccountSelection: (accountId: string) => void
  formatCurrency: (amount: number) => string
}

export function Dashboard({
  accounts,
  transactions,
  selectedAccountIds,
  toggleAccountSelection,
  formatCurrency,
}: DashboardProps) {
  const { formatDate } = useApp()
  const [scopeOpen, setScopeOpen] = useState(false)
  const scopeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (scopeRef.current && !scopeRef.current.contains(e.target as Node)) {
        setScopeOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredAccounts = useMemo(
    () => accounts.filter(acc => selectedAccountIds.includes(acc.id)),
    [accounts, selectedAccountIds]
  )

  const filteredTransactions = useMemo(
    () => transactions.filter(tx => selectedAccountIds.includes(tx.accountId)),
    [transactions, selectedAccountIds]
  )

  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthTransactions = useMemo(() => {
    return filteredTransactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    })
  }, [filteredTransactions, currentMonth, currentYear])

  const lastMonthTransactions = useMemo(() => {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear
    return filteredTransactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === lastMonth && txDate.getFullYear() === lastYear
    })
  }, [filteredTransactions, currentMonth, currentYear])

  const thisMonthIncome = thisMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const thisMonthExpenses = thisMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const lastMonthIncome = lastMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const lastMonthExpenses = lastMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netIncome = thisMonthIncome - thisMonthExpenses

  const incomeChange = lastMonthIncome > 0
    ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome * 100).toFixed(1)
    : null

  const expenseChange = lastMonthExpenses > 0
    ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)
    : null

  const recentTransactions = filteredTransactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  // Mini sparkline data — last 7 days of spending
  const last7DaysSpending = useMemo(() => {
    const days: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().split("T")[0]
      const dayTotal = filteredTransactions
        .filter(t => t.type === "expense" && t.date.startsWith(dateKey))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      days.push(dayTotal)
    }
    return days
  }, [filteredTransactions])

  const maxSpend = Math.max(...last7DaysSpending, 1)

  return (
    <div className="space-y-6">
      {/* Header with Account Scope */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finances</h1>
        </div>
        <div className="relative" ref={scopeRef}>
          <button
            onClick={() => setScopeOpen(!scopeOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-subtle text-sm hover:bg-white/[0.06] transition-colors"
          >
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span>{filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {scopeOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 glass rounded-xl p-2 min-w-[200px] shadow-xl">
              {accounts.map(account => {
                const selected = selectedAccountIds.includes(account.id)
                return (
                  <button
                    key={account.id}
                    onClick={() => toggleAccountSelection(account.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selected ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    <span className="truncate">{account.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 1 — Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card with mini sparkline */}
        <Card className="glass-hover">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            <div className="flex items-end gap-0.5 mt-3 h-8">
              {last7DaysSpending.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/40"
                  style={{ height: `${Math.max(8, (val / maxSpend) * 100)}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income Card */}
        <Card className="glass-hover">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-2xl font-bold">{formatCurrency(thisMonthIncome)}</p>
            <div className="flex items-center gap-1 mt-2">
              {incomeChange !== null ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">
                    {Number(incomeChange) >= 0 ? "+" : ""}{incomeChange}%
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No prior data</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="glass-hover">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-2xl font-bold">{formatCurrency(thisMonthExpenses)}</p>
            <div className="flex items-center gap-1 mt-2">
              {expenseChange !== null ? (
                <>
                  <ArrowDownRight className={`w-3.5 h-3.5 ${Number(expenseChange) > 0 ? "text-red-400" : "text-emerald-400"}`} />
                  <span className={`text-xs ${Number(expenseChange) > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {Number(expenseChange) >= 0 ? "+" : ""}{expenseChange}%
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No prior data</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Net Card */}
        <Card className="glass-hover">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Net Cash Flow</p>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(netIncome)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {netIncome >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <DollarSign className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className="text-xs text-muted-foreground">
                {netIncome >= 0 ? "Positive" : "Negative"} cashflow
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Row 2 — Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="pt-5">
            <CashFlowChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="pt-5">
            <SpendingChart />
          </CardContent>
        </Card>
      </section>

      {/* Row 3 — Transactions & Accounts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Transactions</h3>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/transactions/history">View All</Link>
              </Button>
            </div>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet.</p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        transaction.type === "income"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/5 text-muted-foreground"
                      }`}>
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold whitespace-nowrap ${
                      transaction.type === "income" ? "text-emerald-400" : ""
                    }`}>
                      {transaction.type === "expense" ? "-" : "+"}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        <Card>
          <CardContent className="pt-5">
            <AccountsGrid accounts={filteredAccounts} formatCurrency={formatCurrency} />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
