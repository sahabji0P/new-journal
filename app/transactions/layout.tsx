"use client"

import type { ReactNode } from "react"
import { PageLayout } from "@/components/PageLayout"

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  return (
    <PageLayout>
      {children}
    </PageLayout>
  )
}
