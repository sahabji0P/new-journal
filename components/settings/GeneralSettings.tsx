"use client"

import { GoalsManagement } from "@/components/goals/GoalsManagement"
import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"
import Link from "next/link"

export type AdvancedSection = "overview" | "goals" | "watchlists"

interface GeneralSettingsProps {
  section?: AdvancedSection
}

export function GeneralSettings({ section = "overview" }: GeneralSettingsProps) {
  if (section === "goals") {
    return <GoalsManagement />
  }

  if (section === "watchlists") {
    return <WatchlistsManagement />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Advanced Tools</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Planning modules for long-term tracking and alerts.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">
          Transaction-focused tools were moved out of Settings for faster access.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/transactions/history"
            className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Transactions History
          </Link>
          <Link
            href="/transactions/recurring"
            className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Recurring
          </Link>
          <Link
            href="/transactions/templates"
            className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Templates
          </Link>
          <Link
            href="/settlements"
            className="rounded-md border bg-background px-3 py-1.5 text-xs hover:bg-muted"
          >
            Settlements
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Use the left panel to open long-term planning modules like Goals and Watchlists.
      </p>
    </div>
  )
}
