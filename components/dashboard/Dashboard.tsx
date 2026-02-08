"use client"

import { useApp } from "@/contexts/AppContext"
import type { Account, Transaction } from "@/lib/types"
import {
  ArrowRightLeft,
  CheckCircle,
  CreditCard,
  DollarSign,
  Landmark,
  PiggyBank,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { CashFlowChart } from "./CashFlowChart"
import { ActionItemsCard } from "./ActionItemsCard"

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
  const { budgets, formatDate } = useApp()

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

  const thisMonthIncome = thisMonthTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const thisMonthExpenses = thisMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netIncome = thisMonthIncome - thisMonthExpenses

  const activeBudgets = budgets.filter(budget => budget.isActive !== false)
  const totalBudgetAllocated = activeBudgets.reduce((sum, budget) => sum + budget.totalAllocated, 0)
  const totalBudgetSpent = activeBudgets.reduce((sum, budget) => sum + budget.totalSpent, 0)
  const budgetUsagePercent = totalBudgetAllocated > 0
    ? Math.round((totalBudgetSpent / totalBudgetAllocated) * 100)
    : 0

  const recentTransactions = filteredTransactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <Wallet className="w-4 h-4" />
      case "savings":
        return <PiggyBank className="w-4 h-4" />
      case "credit":
        return <CreditCard className="w-4 h-4" />
      default:
        return <Landmark className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium mb-3 text-muted-foreground">Account Scope</h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {accounts.map(account => {
            const selected = selectedAccountIds.includes(account.id)
            return (
              <button
                key={account.id}
                onClick={() => toggleAccountSelection(account.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors ${
                  selected
                    ? "bg-primary/10 border-primary/40"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {getAccountIcon(account.type)}
                <span>{account.name}</span>
                {selected && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Balance"
          value={formatCurrency(totalBalance)}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          helper={`${filteredAccounts.length} account${filteredAccounts.length !== 1 ? "s" : ""}`}
        />
        <SummaryCard
          label="Income (Month)"
          value={formatCurrency(thisMonthIncome)}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          helper={`${thisMonthTransactions.filter(t => t.type === "income").length} entries`}
        />
        <SummaryCard
          label="Expenses (Month)"
          value={formatCurrency(thisMonthExpenses)}
          icon={<TrendingDown className="w-4 h-4 text-red-600" />}
          helper={`${thisMonthTransactions.filter(t => t.type === "expense").length} entries`}
        />
        <SummaryCard
          label="Net (Month)"
          value={formatCurrency(netIncome)}
          icon={<Target className={`w-4 h-4 ${netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`} />}
          helper={netIncome >= 0 ? "Positive cashflow" : "Negative cashflow"}
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Core Actions</CardTitle>
            <CardDescription>Use these most often to stay on top of finances.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/transactions">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/transactions">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Review Transactions
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/budget">
                <Target className="w-4 h-4 mr-2" />
                Check Budgets
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
            <CardDescription>Income vs expenses trend.</CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowChart type="line" />
          </CardContent>
        </Card>
        <ActionItemsCard />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget Snapshot</CardTitle>
            <CardDescription>
              {activeBudgets.length} active budget{activeBudgets.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeBudgets.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No active budgets. Create one from the Budget page.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall usage</span>
                  <span className={budgetUsagePercent > 100 ? "text-red-600 font-semibold" : "font-medium"}>
                    {budgetUsagePercent}%
                  </span>
                </div>
                <Progress value={Math.min(100, budgetUsagePercent)} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(totalBudgetSpent)} of {formatCurrency(totalBudgetAllocated)} used
                </div>
                <div className="space-y-3 pt-2">
                  {activeBudgets.slice(0, 3).map(budget => {
                    const usage = budget.totalAllocated > 0
                      ? Math.round((budget.totalSpent / budget.totalAllocated) * 100)
                      : 0
                    return (
                      <div key={budget.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{budget.name}</span>
                          <span>{usage}%</span>
                        </div>
                        <Progress value={Math.min(100, usage)} className="h-1.5" />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest activity across selected accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)} • {transaction.category}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full mt-2">
                  <Link href="/transactions">View All Transactions</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ReactNode
  helper: string
}

function SummaryCard({ label, value, icon, helper }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{helper}</p>
      </CardContent>
    </Card>
  )
}
