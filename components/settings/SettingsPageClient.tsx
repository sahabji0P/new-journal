"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PageLayout } from "@/components/PageLayout"
import { Accounts } from "@/components/settings/Accounts"
import { Categories } from "@/components/settings/Categories"
import { Parties } from "@/components/settings/Parties"
import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { UserAccount } from "@/components/settings/UserAccount"
import { Preferences } from "@/components/settings/Preferences"
import { ExportImport } from "@/components/settings/ExportImport"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const SETTINGS_TABS = [
  "accounts",
  "categories",
  "parties",
  "preferences",
  "advanced",
  "profile",
] as const

export function SettingsPageClient() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabFromUrl = searchParams.get("tab")
  const activeTab = SETTINGS_TABS.includes(tabFromUrl as (typeof SETTINGS_TABS)[number])
    ? (tabFromUrl as (typeof SETTINGS_TABS)[number])
    : "accounts"

  const handleTabChange = (value: string) => {
    const nextTab = SETTINGS_TABS.includes(value as (typeof SETTINGS_TABS)[number])
      ? (value as (typeof SETTINGS_TABS)[number])
      : "accounts"

    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", nextTab)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Core setup first. Advanced tools are grouped separately.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto p-1 h-auto gap-1">
            <TabsTrigger value="accounts" className="flex-none whitespace-nowrap">Accounts</TabsTrigger>
            <TabsTrigger value="categories" className="flex-none whitespace-nowrap">Categories</TabsTrigger>
            <TabsTrigger value="parties" className="flex-none whitespace-nowrap">Parties</TabsTrigger>
            <TabsTrigger value="preferences" className="flex-none whitespace-nowrap">Preferences</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-none whitespace-nowrap">Advanced Tools</TabsTrigger>
            <TabsTrigger value="profile" className="flex-none whitespace-nowrap">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-6">
            <Accounts />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <Categories />
          </TabsContent>

          <TabsContent value="parties" className="mt-6">
            <Parties />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6 space-y-6">
            <Preferences />
            <ExportImport />
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
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
