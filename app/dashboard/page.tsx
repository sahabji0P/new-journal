"use client"

import { PageLayout } from "@/components/PageLayout"
import { SaathiWorkspace } from "@/components/chat/SaathiWorkspace"

export default function DashboardPage() {
  return (
    <PageLayout showTopBar={false}>
      <div className="h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-8rem)] min-h-[25rem] md:min-h-[34rem] flex flex-col">
        <SaathiWorkspace />
      </div>
    </PageLayout>
  )
}
