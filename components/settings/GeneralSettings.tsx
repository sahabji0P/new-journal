"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalsManagement } from "@/components/goals/GoalsManagement"
import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"
import { RecurringTransactionsManagement } from "@/components/recurring/RecurringTransactionsManagement"

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="watchlists">Watchlists</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>
        <TabsContent value="goals" className="mt-6">
          <GoalsManagement />
        </TabsContent>
        <TabsContent value="watchlists" className="mt-6">
          <WatchlistsManagement />
        </TabsContent>
        <TabsContent value="recurring" className="mt-6">
          <RecurringTransactionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
