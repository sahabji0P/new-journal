"use client"

import Link from "next/link"
import { CreditCard, PiggyBank } from "lucide-react"
import { Dashboard } from "@/components/dashboard/Dashboard"
import { useApp } from "@/contexts/AppContext"

export default function TransactionsOverviewPage() {
  const { accounts, transactions, selectedAccountIds, toggleAccountSelection, formatCurrency } = useApp()

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const now = new Date()
  const thisMonthTransactions = transactions.filter(t => {
    const txDate = new Date(t.date)
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()
  })
  const monthlySpent = thisMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-r from-background via-muted/10 to-background p-6 md:p-8 rounded-2xl border border-border/50">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            {formatCurrency(totalBalance)} Total Balance
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            You&apos;ve spent {formatCurrency(monthlySpent)} this month across {thisMonthTransactions.length} transactions.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              href="/transactions/history"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg hover:bg-foreground/90 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Review History
            </Link>
            <Link
              href="/transactions/budget"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg hover:border-muted-foreground/50 transition-colors"
            >
              <PiggyBank className="w-4 h-4" />
              Manage Budget
            </Link>
          </div>
        </div>
      </section>

      <Dashboard
        accounts={accounts}
        transactions={transactions}
        selectedAccountIds={selectedAccountIds}
        toggleAccountSelection={toggleAccountSelection}
        formatCurrency={formatCurrency}
      />
    </div>
  )
}
