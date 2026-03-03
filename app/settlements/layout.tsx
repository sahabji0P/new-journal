"use client"

import type { ReactNode } from "react"
import { PageLayout } from "@/components/PageLayout"

export default function SettlementsLayout({ children }: { children: ReactNode }) {
  return (
    <PageLayout fullBleed showTopBar={false}>
      {children}
    </PageLayout>
  )
}
