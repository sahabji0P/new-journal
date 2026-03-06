"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { SettlementGroupList } from "./SettlementGroupList"
import { GroupChatArea } from "./chat/GroupChatArea"
import { GroupInfoPanel } from "./chat/GroupInfoPanel"
import { PendingInvitationsCard } from "./PendingInvitationsCard"
import { CreateGroupDialog } from "./CreateGroupDialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { MessageSquare } from "lucide-react"
import type { SettlementGroupSuggestion } from "@/lib/types"

export function SettlementsChatLayout() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const ws = useSettlementWorkspace()
  const { loadSettlementWorkspace } = useApp()

  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")

  const selectedGroup = ws.selectedGroup

  const handleSelectGroup = useCallback(
    (id: string) => {
      ws.setSelectedGroupId(id)
      setMobileView("chat")
    },
    [ws]
  )

  const handleBackToList = useCallback(() => {
    setMobileView("list")
  }, [])

  const handleSettleUpFromPanel = useCallback(
    (suggestion: SettlementGroupSuggestion) => {
      void suggestion
      setInfoPanelOpen(false)
    },
    []
  )

  const handleRemindFromPanel = useCallback(
    (suggestion: { fromUserId: string; amount: number }) => {
      if (!selectedGroup) return
      ws.onSendReminder(suggestion)
    },
    [selectedGroup, ws]
  )

  const handleInviteMember = useCallback(
    async (email: string) => {
      if (!selectedGroup) return
      ws.setInviteEmail(email)
      await ws.onSendInvite()
    },
    [selectedGroup, ws]
  )

  return (
    <div className="flex h-[calc(100vh-0px)] md:h-[calc(100vh-0px)] bg-background">
      {/* Left sidebar: Group list */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r flex flex-col shrink-0 ${
          mobileView === "list" ? "block" : "hidden md:flex"
        }`}
      >
        <div className="p-3 border-b">
          <h1 className="font-semibold text-lg">Settlements</h1>
        </div>

        {/* Pending invitations */}
        {ws.myPendingInvites.length > 0 && (
          <div className="p-3 border-b">
            <PendingInvitationsCard
              invitations={ws.myPendingInvites}
              onRespond={ws.respondToSettlementInvite}
            />
          </div>
        )}

        {/* Group list */}
        <div className="flex-1 overflow-y-auto">
          <SettlementGroupList
            groups={ws.settlementGroups}
            selectedGroupId={ws.selectedGroupId}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={() => ws.setGroupDialogOpen(true)}
          />
        </div>
      </div>

      {/* Center: Chat area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          mobileView === "chat" ? "block" : "hidden md:flex"
        }`}
      >
        {selectedGroup ? (
          <GroupChatArea
            group={selectedGroup}
            onToggleInfoPanel={() => setInfoPanelOpen(!infoPanelOpen)}
            onBack={handleBackToList}
            onBalancesChanged={loadSettlementWorkspace}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                Select a group to start chatting
              </p>
              <p className="text-xs mt-1">
                Or create a new group to split expenses with friends
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar: Group info (desktop) */}
      {selectedGroup && infoPanelOpen && (
        <div className="hidden xl:block w-80 border-l overflow-y-auto">
          <GroupInfoPanel
            group={selectedGroup}
            currentUserId={currentUserId}
            formatCurrency={ws.formatCurrency}
            totalSpent={ws.selectedGroupTotalSpent}
            myNetBalance={ws.myNetBalance}
            onSettleUp={handleSettleUpFromPanel}
            onRemind={handleRemindFromPanel}
            onInviteMember={handleInviteMember}
          />
        </div>
      )}

      {/* Right sidebar: Group info (tablet/mobile as sheet) */}
      {selectedGroup && (
        <Sheet
          open={infoPanelOpen && typeof window !== "undefined" && window.innerWidth < 1280}
          onOpenChange={setInfoPanelOpen}
        >
          <SheetContent side="right" className="w-[85vw] max-w-[24rem] p-0 xl:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Group Info</SheetTitle>
              <SheetDescription>
                View group details, balances, and members
              </SheetDescription>
            </SheetHeader>
            <GroupInfoPanel
              group={selectedGroup}
              currentUserId={currentUserId}
              formatCurrency={ws.formatCurrency}
              totalSpent={ws.selectedGroupTotalSpent}
              myNetBalance={ws.myNetBalance}
              onSettleUp={handleSettleUpFromPanel}
              onRemind={handleRemindFromPanel}
              onInviteMember={handleInviteMember}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog
        open={ws.groupDialogOpen}
        onOpenChange={ws.setGroupDialogOpen}
        groupName={ws.groupName}
        onGroupNameChange={ws.setGroupName}
        groupDescription={ws.groupDescription}
        onGroupDescriptionChange={ws.setGroupDescription}
        onSubmit={ws.onCreateGroup}
      />
    </div>
  )
}
