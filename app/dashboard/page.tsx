"use client"

import { Dashboard } from "@/components/dashboard/Dashboard"
import { PageLayout } from "@/components/PageLayout"
import { useApp } from "@/contexts/AppContext"
import Link from "next/link"
import { CreditCard, PiggyBank } from "lucide-react"

export default function DashboardPage() {
  const { accounts, transactions, selectedAccountIds, toggleAccountSelection, formatCurrency } = useApp()

  return (
    <PageLayout
      showHero
      heroTitle="Welcome to your Financial Dashboard"
      heroDescription="Get a clear overview of your finances. Track your spending, manage budgets, and achieve your financial goals."
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
