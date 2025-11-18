"use client"

import { PageLayout } from "@/components/PageLayout"
import { Accounts } from "@/components/settings/Accounts"
import { Categories } from "@/components/settings/Categories"
import { Parties } from "@/components/settings/Parties"
import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { UserAccount } from "@/components/settings/UserAccount"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsPage() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-mono">Settings</h1>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="parties">Parties</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-6">
            <Categories />
          </TabsContent>
          <TabsContent value="parties" className="mt-6">
            <Parties />
          </TabsContent>
          <TabsContent value="accounts" className="mt-6">
            <Accounts />
          </TabsContent>
          <TabsContent value="general" className="mt-6">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="profile" className="mt-6">
            <UserAccount />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
