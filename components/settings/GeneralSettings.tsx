"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoalsManagement } from "@/components/goals/GoalsManagement"
import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="watchlists">Watchlists</TabsTrigger>
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
