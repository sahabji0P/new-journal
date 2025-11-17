"use client"

import { PageLayout } from "@/components/PageLayout"
import { Accounts } from "@/components/settings/Accounts"
import { Categories } from "@/components/settings/Categories"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-6">
            <Categories />
          </TabsContent>
          <TabsContent value="accounts" className="mt-6">
            <Accounts />
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">General settings coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
