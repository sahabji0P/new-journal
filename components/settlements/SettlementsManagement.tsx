"use client"

import { useState } from "react"
import { useSettlementWorkspace } from "@/hooks/use-settlement-workspace"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Users, Handshake } from "lucide-react"
import { SettlementGroupList } from "./SettlementGroupList"
import { SettlementGroupDetail } from "./SettlementGroupDetail"
import { PendingInvitationsCard } from "./PendingInvitationsCard"
import { PersonalSplitBillForm } from "./PersonalSplitBillForm"
import { PersonalSettlementsList } from "./PersonalSettlementsList"
import { CreateGroupDialog } from "./CreateGroupDialog"
import { GroupExpenseDialog } from "./group/GroupExpenseDialog"
import { GroupSettleDialog } from "./group/GroupSettleDialog"

export function SettlementsManagement() {
  const ws = useSettlementWorkspace()
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Tabs value={ws.activeTab} onValueChange={(v) => ws.setActiveTab(v as "groups" | "personal")}>
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="groups" className="shrink-0 gap-2">
            <Users className="w-4 h-4" />
            Group Settlements
          </TabsTrigger>
          <TabsTrigger value="personal" className="shrink-0 gap-2">
            <Handshake className="w-4 h-4" />
            Personal Split + Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <SettlementGroupList
              groups={ws.settlementGroups}
              selectedGroupId={ws.selectedGroupId}
              onSelectGroup={ws.setSelectedGroupId}
              onCreateGroup={() => ws.setGroupDialogOpen(true)}
            />
            <SettlementGroupDetail
              group={ws.selectedGroup}
              memberCount={ws.selectedGroup?.members.length ?? 0}
              entryCount={ws.selectedGroup?.transactions.length ?? 0}
              totalSpent={ws.selectedGroupTotalSpent}
              myNetBalance={ws.myNetBalance}
              balances={ws.groupBalances}
              suggestions={ws.groupSuggestions}
              groupActivity={ws.groupActivity}
              currentUserId={ws.currentUserId}
              inviteEmail={ws.inviteEmail}
              onInviteEmailChange={ws.setInviteEmail}
              onSendInvite={ws.onSendInvite}
              onSettleUp={ws.openSettleDialog}
              onRemind={ws.onSendReminder}
              onAddExpense={() => setExpenseDialogOpen(true)}
              formatCurrency={ws.formatCurrency}
              formatDate={ws.formatDate}
            />
          </div>

          <PendingInvitationsCard
            invitations={ws.myPendingInvites}
            onRespond={ws.respondToSettlementInvite}
          />
        </TabsContent>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <PersonalSplitBillForm
            description={ws.personalDescription}
            onDescriptionChange={ws.setPersonalDescription}
            total={ws.personalTotal}
            onTotalChange={ws.setPersonalTotal}
            counterparty={ws.personalCounterparty}
            onCounterpartyChange={ws.setPersonalCounterparty}
            category={ws.personalCategory}
            onCategoryChange={ws.setPersonalCategory}
            categories={ws.categories}
            splits={ws.personalSplits}
            onAddPerson={ws.addPersonalSplitPerson}
            onRemovePerson={ws.removePersonalSplitPerson}
            onUpdateSplit={ws.updatePersonalSplit}
            splitTotal={ws.personalSplitTotal}
            onCreateSplit={ws.onCreatePersonalSplit}
            onDownloadSplit={ws.onDownloadPersonalSplit}
            formatCurrency={ws.formatCurrency}
          />

          <PersonalSettlementsList
            pendingSettlements={ws.pendingSettlements}
            completedSettlements={ws.completedSettlements}
            totalIOwe={ws.totalIOwe}
            totalOwedToMe={ws.totalOwedToMe}
            isAddDialogOpen={ws.isAddDialogOpen}
            onAddDialogChange={ws.handleAddDialogChange}
            onOpenAddDialog={ws.openAddDialog}
            formData={ws.formData}
            onFormDataChange={ws.setFormData}
            onAddSettlement={ws.handleAddSettlement}
            isDeleteDialogOpen={ws.isDeleteDialogOpen}
            onDeleteDialogChange={ws.setIsDeleteDialogOpen}
            selectedSettlement={ws.selectedSettlement}
            onDeleteSettlement={ws.handleDeleteSettlement}
            onClearSelectedSettlement={() => ws.setSelectedSettlement(null)}
            onCompleteSettlement={ws.handleCompleteSettlement}
            onOpenDeleteDialog={ws.openDeleteDialog}
            formatCurrency={ws.formatCurrency}
            formatDate={ws.formatDate}
          />
        </TabsContent>
      </Tabs>

      <CreateGroupDialog
        open={ws.groupDialogOpen}
        onOpenChange={ws.setGroupDialogOpen}
        groupName={ws.groupName}
        onGroupNameChange={ws.setGroupName}
        groupDescription={ws.groupDescription}
        onGroupDescriptionChange={ws.setGroupDescription}
        onSubmit={ws.onCreateGroup}
      />

      {ws.selectedGroup && (
        <GroupExpenseDialog
          open={expenseDialogOpen}
          onOpenChange={setExpenseDialogOpen}
          members={ws.selectedGroup.members}
          onSubmit={async (data) => {
            await ws.addSettlementGroupTransaction({
              groupId: ws.selectedGroup!.id,
              description: data.description,
              paidByUserId: data.paidByUserId,
              totalAmount: data.totalAmount,
              splitType: data.splitType,
              splitBetween: data.splitBetween,
              shares: data.shares || [],
              percentageShares: data.percentageShares,
              notes: data.notes,
            })
            setExpenseDialogOpen(false)
            await ws.loadSettlementWorkspace()
          }}
          formatCurrency={ws.formatCurrency}
        />
      )}

      <GroupSettleDialog
        open={ws.settleDialogOpen}
        onOpenChange={(open) => {
          ws.setSettleDialogOpen(open)
          if (!open) ws.setSettleDraft(null)
        }}
        draft={ws.settleDraft}
        onDraftChange={ws.setSettleDraft}
        onSubmit={ws.onRecordSettlement}
        formatCurrency={ws.formatCurrency}
      />
    </div>
  )
}
