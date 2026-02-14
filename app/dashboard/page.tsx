"use client"

import { PageLayout } from "@/components/PageLayout"
import { SaathiWorkspace } from "@/components/chat/SaathiWorkspace"

export default function DashboardPage() {
  return (
    <PageLayout>
      <div className="h-[calc(100dvh-11rem)] md:h-[calc(100dvh-8rem)] min-h-[30rem] md:min-h-[34rem] flex flex-col">
        <SaathiWorkspace />
      </div>
    </PageLayout>
  )
}
