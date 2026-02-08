"use client"

import { Dashboard } from "@/components/dashboard/Dashboard"
import { useApp } from "@/contexts/AppContext"

export default function TransactionsOverviewPage() {
  const { accounts, transactions, selectedAccountIds, toggleAccountSelection, formatCurrency } = useApp()

  return (
    <div className="space-y-6">

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
