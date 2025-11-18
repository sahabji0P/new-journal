"use client"

import { useApp } from "@/contexts/AppContext"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Landmark,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"
import { CashFlowChart } from "./CashFlowChart"
import { ActivityHeatmap } from "./ActivityHeatmap"

interface Transaction {
  id: number
  description: string
  amount: number
  date: string
  category: string
  type: "income" | "expense"
  accountId: number
  accountName: string
}

interface Account {
  id: number
  name: string
  balance: number
  type: "checking" | "savings" | "credit"
}

interface DashboardProps {
  accounts: Account[]
  transactions: Transaction[]
  selectedAccountIds: number[]
  toggleAccountSelection: (accountId: number) => void
  formatCurrency: (amount: number) => string
}

export function Dashboard({
  accounts,
  transactions,
  selectedAccountIds,
  toggleAccountSelection,
  formatCurrency,
}: DashboardProps) {
  const { budgets } = useApp()

  const filteredAccounts = accounts.filter(acc =>
    selectedAccountIds.includes(acc.id)
  )

  const totalBalance = filteredAccounts.reduce(
    (sum, acc) => sum + acc.balance,
    0
  )

  // Calculate this month's income and expenses
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    })
  }, [transactions, currentMonth, currentYear])

  const thisMonthIncome = useMemo(() => {
    return thisMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
  }, [thisMonthTransactions])

  const thisMonthExpenses = useMemo(() => {
    return Math.abs(
      thisMonthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    )
  }, [thisMonthTransactions])

  const netIncome = thisMonthIncome - thisMonthExpenses

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => selectedAccountIds.includes(t.accountId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [transactions, selectedAccountIds])

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <Wallet className="w-5 h-5" />
      case "savings":
        return <PiggyBank className="w-5 h-5" />
      case "credit":
        return <CreditCard className="w-5 h-5" />
      default:
        return <Landmark className="w-5 h-5" />
    }
  }

  // Calculate category spending for top categories
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {}
    thisMonthTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount)
      })
    return Object.entries(spending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
  }, [thisMonthTransactions])

  return (
    <div className="space-y-8">
      {/* Account Selection */}
      <section>
        <h3 className="text-xl font-bold mb-4">Your Accounts</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => toggleAccountSelection(account.id)}
              className={`flex items-center justify-between gap-3 p-4 rounded-lg border transition-all ${
                selectedAccountIds.includes(account.id)
                  ? "border-primary/80 bg-primary/10 shadow-lg"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    selectedAccountIds.includes(account.id)
                      ? "bg-primary/20"
                      : "bg-muted/50"
                  }`}
                >
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <p className="font-semibold text-left">{account.name}</p>
                  <p className="text-sm text-muted-foreground text-left">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
              {selectedAccountIds.includes(account.id) && (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Financial Overview */}
      <section>
        <h3 className="text-xl font-bold mb-4">Financial Overview</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Balance</CardDescription>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Across {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>This Month Income</CardDescription>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(thisMonthIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthTransactions.filter(t => t.type === "income").length} transaction(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>This Month Expenses</CardDescription>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(thisMonthExpenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthTransactions.filter(t => t.type === "expense").length} transaction(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Net Income</CardDescription>
                <div className={`p-2 rounded-lg ${netIncome >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <DollarSign className={`w-5 h-5 ${netIncome >= 0 ? "text-green-500" : "text-red-500"}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(netIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Top Spending Categories */}
      {categorySpending.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-4">Top Spending Categories This Month</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {categorySpending.map(([category, amount]) => {
                  const percentage = thisMonthExpenses > 0 ? (amount / thisMonthExpenses) * 100 : 0
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(amount)} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Budget Overview */}
      {budgets.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-4">Budget Status</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {budgets.slice(0, 2).map(budget => {
              const percentage = budget.totalAllocated > 0 ? (budget.totalSpent / budget.totalAllocated) * 100 : 0
              const remaining = budget.totalAllocated - budget.totalSpent
              return (
                <Card key={budget.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{budget.name}</CardTitle>
                    <CardDescription className="capitalize">{budget.type} Budget</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-medium">{formatCurrency(budget.totalSpent)}</span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className={`font-medium ${remaining >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Activity Heatmap */}
      <section>
        <h3 className="text-xl font-bold mb-4">Activity Overview</h3>
        <ActivityHeatmap />
      </section>

      {/* Cash Flow Chart */}
      <section>
        <h3 className="text-xl font-bold mb-4">Cash Flow Analysis</h3>
        <CashFlowChart type="line" />
      </section>

      {/* Recent Transactions */}
      <section>
        <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No transactions found in selected accounts.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {recentTransactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === "income" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                        {tx.type === "income" ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {tx.accountName} • {tx.category}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-bold ${
                        tx.type === "income" ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.type === "income" ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
