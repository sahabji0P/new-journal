"use client"

import { PageLayout } from "@/components/PageLayout"
import { TransactionsList } from "@/components/transactions/TransactionsList"

export default function TransactionsPage() {
  return (
    <PageLayout>
      <TransactionsList />
    </PageLayout>
  )
}
