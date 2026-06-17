"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { GroupDashboardTab } from "./GroupDashboardTab"
import { GroupChatTab } from "./GroupChatTab"
import { GroupSettingsTab } from "./GroupSettingsTab"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { SettlementGroupSuggestion } from "@/lib/types"

type Tab = "dashboard" | "chat" | "settings"

interface GroupDetailPageProps {
  groupId: string
}

export function GroupDetailPage({ groupId }: GroupDetailPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const { loadSettlementWorkspace, formatCurrency, sendSettlementGroupReminder } = useApp()
  const ws = useSettlementWorkspace()

  const tab = (searchParams?.get("tab") as Tab) || "dashboard"
  const settleWithParam = searchParams?.get("settleWith") || undefined

  const group = useMemo(
    () => ws.settlementGroups.find((g) => g.id === groupId),
    [ws.settlementGroups, groupId]
  )

  useEffect(() => {
    if (!group) {
      void loadSettlementWorkspace()
    }
  }, [group, loadSettlementWorkspace])

  const isOwner = useMemo(
    () =>
      group?.members.some(
        (m) => m.userId === currentUserId && m.role === "owner"
      ) ?? false,
    [group, currentUserId]
  )

  const switchTab = (next: Tab) => {
    const params = new URLSearchParams()
    params.set("tab", next)
    router.replace(`?${params.toString()}`)
  }

  const handleSettleUp = (suggestion: SettlementGroupSuggestion) => {
    const params = new URLSearchParams()
    params.set("tab", "chat")
    params.set("settleWith", suggestion.fromUserId)
    router.replace(`?${params.toString()}`)
  }

  const handleRemind = async (suggestion: { fromUserId: string; amount: number }) => {
    if (!group) return
    await sendSettlementGroupReminder({
      groupId: group.id,
      toUserId: suggestion.fromUserId,
      amount: suggestion.amount,
    })
  }

  const tabs: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { key: "chat", label: "Chat", Icon: MessageSquare },
    { key: "settings", label: "Settings", Icon: Settings },
  ]

  if (!group) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="animate-pulse text-sm">Loading group…</div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-background/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => router.push("/settlements")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{group.name}</h1>
          <p className="text-xs text-muted-foreground">
            {group.members.length} members
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 border-b flex">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "dashboard" && (
          <div className="h-full overflow-y-auto">
            <GroupDashboardTab
              group={group}
              currentUserId={currentUserId}
              formatCurrency={formatCurrency}
              onSwitchToChat={() => switchTab("chat")}
              onSettleUp={handleSettleUp}
              onRemind={(s) => void handleRemind(s)}
            />
          </div>
        )}

        {tab === "chat" && (
          <GroupChatTab
            group={group}
            initialSettleUpUserId={settleWithParam}
            onBalancesChanged={() => void loadSettlementWorkspace()}
          />
        )}

        {tab === "settings" && (
          <div className="h-full overflow-y-auto">
            <GroupSettingsTab
              group={group}
              currentUserId={currentUserId}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>
  )
}
