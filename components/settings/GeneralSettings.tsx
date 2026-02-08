"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalsManagement } from "@/components/goals/GoalsManagement"
import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"
import { RecurringTransactionsManagement } from "@/components/recurring/RecurringTransactionsManagement"
import { TemplatesManagement } from "@/components/templates/TemplatesManagement"
import { SettlementsManagement } from "@/components/settlements/SettlementsManagement"

export function GeneralSettings() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Advanced Tools</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Feature-rich modules for planning, automation, and shared finances.
        </p>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto p-1 h-auto gap-1">
          <TabsTrigger value="goals" className="flex-none whitespace-nowrap">Goals</TabsTrigger>
          <TabsTrigger value="watchlists" className="flex-none whitespace-nowrap">Watchlists</TabsTrigger>
          <TabsTrigger value="recurring" className="flex-none whitespace-nowrap">Recurring</TabsTrigger>
          <TabsTrigger value="templates" className="flex-none whitespace-nowrap">Templates</TabsTrigger>
          <TabsTrigger value="settlements" className="flex-none whitespace-nowrap">Settlements</TabsTrigger>
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
        <TabsContent value="templates" className="mt-6">
          <TemplatesManagement />
        </TabsContent>
        <TabsContent value="settlements" className="mt-6">
          <SettlementsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
