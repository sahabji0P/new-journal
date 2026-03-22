"use client"
import type { ReactNode } from "react"
import { PageLayout } from "@/components/PageLayout"
import { InvestmentsProvider } from "@/contexts/InvestmentsContext"

export default function InvestmentsLayout({ children }: { children: ReactNode }) {
  return (
    <InvestmentsProvider>
      <PageLayout>{children}</PageLayout>
    </InvestmentsProvider>
  )
}
