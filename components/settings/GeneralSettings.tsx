"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalsManagement } from "@/components/goals/GoalsManagement"
import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"
import Link from "next/link"

export function GeneralSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Advanced Tools</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Planning modules for long-term tracking and alerts.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Recurring, Templates, and Settlements moved to{" "}
          <Link href="/transactions/history" className="underline underline-offset-2 hover:text-foreground">
            Transactions
          </Link>
          .
        </p>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto p-1 h-auto gap-1">
          <TabsTrigger value="goals" className="flex-none whitespace-nowrap">Goals</TabsTrigger>
          <TabsTrigger value="watchlists" className="flex-none whitespace-nowrap">Watchlists</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="mt-6">
          <GoalsManagement />
        </TabsContent>
        <TabsContent value="watchlists" className="mt-6">
          <WatchlistsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
