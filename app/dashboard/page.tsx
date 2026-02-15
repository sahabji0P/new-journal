"use client"

import { PageLayout } from "@/components/PageLayout"
import { SaathiWorkspace } from "@/components/chat/SaathiWorkspace"

export default function DashboardPage() {
  return (
    <PageLayout showTopBar={false} fullBleed>
      <div className="h-[calc(100dvh-4rem)] md:h-dvh flex flex-col">
        <SaathiWorkspace />
      </div>
    </PageLayout>
  )
}
