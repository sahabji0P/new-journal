import { RecurringTransactionsManagement } from "@/components/recurring/RecurringTransactionsManagement"

export default function RecurringTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-mono">Recurring Transactions</h2>
        <p className="text-muted-foreground font-mono text-sm">
          Automate your regular income and expenses with recurring transactions
        </p>
      </div>
      <RecurringTransactionsManagement />
    </div>
  )
}
