"use client"

import { use, Suspense } from "react"
import { GroupDetailPage } from "@/components/settlements/group-detail/GroupDetailPage"

function GroupPageContent({ groupId }: { groupId: string }) {
  return <GroupDetailPage groupId={groupId} />
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = use(params)

  return (
    <Suspense
      fallback={
        <div className="h-dvh flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <GroupPageContent groupId={groupId} />
    </Suspense>
  )
}
