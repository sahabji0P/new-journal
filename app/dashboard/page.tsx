"use client"

import { PageLayout } from "@/components/PageLayout"
import { SaathiWorkspace } from "@/components/chat/SaathiWorkspace"

export default function DashboardPage() {
  return (
    <PageLayout
      showHero
      heroTitle="Saathi Dashboard"
      heroDescription="Talk to Saathi to analyze spending, plan budgets, and decide your next money moves."
    >
      <SaathiWorkspace />
    </PageLayout>
  )
}
