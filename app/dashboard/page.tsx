"use client"

import { Dashboard } from "@/components/dashboard/Dashboard"
import { PageLayout } from "@/components/PageLayout"
import { useApp } from "@/contexts/AppContext"
import Link from "next/link"
import { CreditCard, PiggyBank } from "lucide-react"

export default function DashboardPage() {
  const { accounts, transactions, selectedAccountIds, toggleAccountSelection, formatCurrency } = useApp()

  // Calculate quick stats for the hero
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
    <PageLayout
      showHero
      heroTitle={`${formatCurrency(totalBalance)} Total Balance`}
      heroDescription={`You've spent ${formatCurrency(monthlySpent)} this month across ${thisMonthTransactions.length} transactions. Click the chat button to ask Saathi for personalized insights!`}
      heroActions={
        <>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Add Transaction
          </Link>
          <Link
            href="/budget"
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg hover:border-muted-foreground/50 transition-colors"
          >
            <PiggyBank className="w-4 h-4" />
            View Budgets
          </Link>
        </>
      }
    >
      <Dashboard
        accounts={accounts}
        transactions={transactions}
        selectedAccountIds={selectedAccountIds}
        toggleAccountSelection={toggleAccountSelection}
        formatCurrency={formatCurrency}
      />
    </PageLayout>
  )
}
