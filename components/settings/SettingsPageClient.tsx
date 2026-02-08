"use client"

import { Bell, Download, Eye, Lock, Settings, Settings2, Target } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PageLayout } from "@/components/PageLayout"
import { Accounts } from "@/components/settings/Accounts"
import { Categories } from "@/components/settings/Categories"
import { Parties } from "@/components/settings/Parties"
import { GeneralSettings } from "@/components/settings/GeneralSettings"
import { UserAccount } from "@/components/settings/UserAccount"
import { Preferences } from "@/components/settings/Preferences"
import { ExportImport } from "@/components/settings/ExportImport"
import { SettingsSplitPanel, type SettingsSplitSection } from "@/components/settings/SettingsSplitPanel"
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

  const preferencesSections: SettingsSplitSection[] = [
    {
      id: "general",
      label: "General",
      description: "Currency and date format",
      icon: Settings2,
      content: <Preferences section="general" />,
    },
    {
      id: "display",
      label: "Display",
      description: "Amount and layout visibility",
      icon: Eye,
      content: <Preferences section="display" />,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Budget and reminder alerts",
      icon: Bell,
      content: <Preferences section="notifications" />,
    },
    {
      id: "privacy",
      label: "Privacy",
      description: "Auto-lock and access controls",
      icon: Lock,
      content: <Preferences section="privacy" />,
    },
    {
      id: "backup",
      label: "Backup & Import",
      description: "Export and restore data",
      icon: Download,
      content: <ExportImport />,
    },
  ]

  const advancedSections: SettingsSplitSection[] = [
    {
      id: "overview",
      label: "Overview",
      description: "Advanced workspace notes",
      icon: Settings,
      content: <GeneralSettings section="overview" />,
    },
    {
      id: "goals",
      label: "Goals",
      description: "Savings goals and milestones",
      icon: Target,
      content: <GeneralSettings section="goals" />,
    },
    {
      id: "watchlists",
      label: "Watchlists",
      description: "Track limits and monitors",
      icon: Eye,
      content: <GeneralSettings section="watchlists" />,
    },
  ]

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Core setup first. Detailed controls are grouped in focused side panels.
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

          <TabsContent value="preferences" className="mt-6">
            <SettingsSplitPanel
              title="Preferences"
              description="Control app behavior, notifications, privacy, and data portability."
              sections={preferencesSections}
              defaultSectionId="general"
            />
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <SettingsSplitPanel
              title="Advanced Tools"
              description="Open long-term planning modules and power-user utilities."
              sections={advancedSections}
              defaultSectionId="overview"
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <UserAccount />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
