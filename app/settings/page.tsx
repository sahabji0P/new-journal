import { Suspense } from "react"
import { SettingsPageClient } from "@/components/settings/SettingsPageClient"

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading settings...</div>}>
      <SettingsPageClient />
    </Suspense>
  )
}
