"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { GroupActivityFeed } from "./GroupActivityFeed"

interface GroupExpensesTabProps {
  transactions: Array<{
    id: string
    transactionType?: string
    paidByName: string
    fromUserName?: string
    toUserName?: string
    totalAmount: number
    description: string
    shares: Array<{ userId: string; name: string; amount: number }>
    notes?: string
    createdAt: string
  }>
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
  onAddExpense: () => void
}

export function GroupExpensesTab({
  transactions,
  formatCurrency,
  formatDate,
  onAddExpense,
}: GroupExpensesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={onAddExpense} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>
      <GroupActivityFeed
        transactions={transactions}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </div>
  )
}
