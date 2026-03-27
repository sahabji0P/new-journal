"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useGroupChat } from "@/hooks/use-group-chat"
import { ChatMessageList } from "./ChatMessageList"
import { ChatComposer } from "./ChatComposer"
import { TypingIndicator } from "./TypingIndicator"
import { AddExpenseSheet } from "./AddExpenseSheet"
import { SettleUpSheet } from "./SettleUpSheet"
import { RecordInAccountsDialog } from "./RecordInAccountsDialog"
import { Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  SettlementGroup,
  SettlementGroupSuggestion,
  BillAnalysisResult,
  GroupSplitShare,
} from "@/lib/types"
import { toast } from "@/lib/toast"

interface GroupChatAreaProps {
  group: SettlementGroup
  onToggleInfoPanel: () => void
  onBack?: () => void
  onBalancesChanged: () => void
  settleUpSuggestion?: SettlementGroupSuggestion | null
  onClearSettleUpSuggestion?: () => void
}

export function GroupChatArea({
  group,
  onToggleInfoPanel,
  onBack,
  onBalancesChanged,
  settleUpSuggestion,
  onClearSettleUpSuggestion,
}: GroupChatAreaProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ""
  const userName = session?.user?.name || session?.user?.email || ""
  const {
    formatCurrency,
    accounts,
    categories,
    addSettlementGroupTransaction,
    recordSettlementGroupPayment,
    loadSettlementWorkspace,
  } = useApp()

  const {
    messages,
    isLoadingMessages,
    hasMore,
    isSending,
    isAnalyzingBill,
    typingUsers,
    sendTextMessage,
    loadMore,
    analyzeBill,
    emitTyping,
  } = useGroupChat(group.id, currentUserId, { onBalancesChanged, userName })

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [settleUpSheetOpen, setSettleUpSheetOpen] = useState(false)
  const [billPrefill, setBillPrefill] = useState<BillAnalysisResult | null>(
    null
  )
  const [preselectedSuggestion, setPreselectedSuggestion] =
    useState<SettlementGroupSuggestion | null>(null)

  useEffect(() => {
    if (settleUpSuggestion) {
      setPreselectedSuggestion(settleUpSuggestion)
      setSettleUpSheetOpen(true)
      onClearSettleUpSuggestion?.()
    }
  }, [settleUpSuggestion, onClearSettleUpSuggestion])

  // Record in accounts state
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [recordingTransaction, setRecordingTransaction] = useState<{
    transactionId: string
    description: string
    shareAmount: number
  } | null>(null)
  const [locallyRecordedTxns, setLocallyRecordedTxns] = useState<Set<string>>(
    new Set()
  )

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendTextMessage(content)
      } catch {
        toast.error("Failed to send message")
      }
    },
    [sendTextMessage]
  )

  const handleUploadBill = useCallback(
    async (imageDataUrl: string, mimeType: string) => {
      const result = await analyzeBill(imageDataUrl, mimeType)
      if (result.success && result.analysisResult) {
        setBillPrefill(result.analysisResult)
        setExpenseSheetOpen(true)
      }
    },
    [analyzeBill]
  )

  const handleAddExpense = useCallback(
    async (data: {
      description: string
      totalAmount: number
      paidByUserId: string
      splitType: "equal" | "custom" | "percentage"
      splitBetween: string[]
      shares: { userId: string; amount: number }[]
      percentageShares: { userId: string; percentage: number }[]
      notes: string
    }) => {
      await addSettlementGroupTransaction({
        groupId: group.id,
        description: data.description,
        paidByUserId: data.paidByUserId,
        totalAmount: data.totalAmount,
        splitType: data.splitType,
        splitBetween: data.splitBetween,
        shares: data.shares,
        percentageShares: data.percentageShares,
        notes: data.notes,
      })
      setExpenseSheetOpen(false)
      setBillPrefill(null)
      await loadSettlementWorkspace()
    },
    [group.id, addSettlementGroupTransaction, loadSettlementWorkspace]
  )

  const handleSettleUp = useCallback(
    async (data: {
      fromUserId: string
      toUserId: string
      amount: number
      notes: string
    }) => {
      await recordSettlementGroupPayment({
        groupId: group.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
        notes: data.notes,
      })
      setSettleUpSheetOpen(false)
      setPreselectedSuggestion(null)
      await loadSettlementWorkspace()
    },
    [group.id, recordSettlementGroupPayment, loadSettlementWorkspace]
  )

  const handleRecordInAccounts = useCallback(
    (transactionId: string) => {
      // Find the transaction to get details
      const txn = group.transactions.find((t) => t.id === transactionId)
      if (!txn) return

      const userShare = txn.shares?.find(
        (s: GroupSplitShare) => s.userId === currentUserId
      )
      if (!userShare) return

      setRecordingTransaction({
        transactionId,
        description: txn.description,
        shareAmount: userShare.amount,
      })
      setRecordDialogOpen(true)
    },
    [group.transactions, currentUserId]
  )

  const handleConfirmRecord = useCallback(
    async (data: { accountId: string; category: string }) => {
      if (!recordingTransaction) return

      try {
        const res = await fetch(
          `/api/settlements/groups/${group.id}/record-personal`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transactionId: recordingTransaction.transactionId,
              accountId: data.accountId,
              category: data.category,
            }),
          }
        )

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || "Failed to record")
        }

        const result = await res.json()
        toast.success(
          `Expense recorded in ${result.accountName || "your account"}`
        )
        setLocallyRecordedTxns(
          (prev) => new Set(prev).add(recordingTransaction.transactionId)
        )
        setRecordDialogOpen(false)
        setRecordingTransaction(null)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to record"
        )
      }
    },
    [recordingTransaction, group.id]
  )

  const handleConfirmBillAsExpense = useCallback(
    (result: BillAnalysisResult) => {
      setBillPrefill(result)
      setExpenseSheetOpen(true)
    },
    []
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="md:hidden -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members.length} members
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Member avatars */}
          <div className="hidden sm:flex -space-x-2 mr-2">
            {group.members.slice(0, 4).map((member) => (
              <div
                key={member.userId}
                className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                title={member.name}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {group.members.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                +{group.members.length - 4}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleInfoPanel}>
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoadingMessages}
        hasMore={hasMore}
        onLoadMore={loadMore}
        formatCurrency={formatCurrency}
        onRecordInAccounts={handleRecordInAccounts}
        onConfirmBillAsExpense={handleConfirmBillAsExpense}
        locallyRecordedTransactionIds={locallyRecordedTxns}
      />

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Composer */}
      <ChatComposer
        onSendMessage={handleSendMessage}
        onUploadBill={handleUploadBill}
        onAddExpense={() => {
          setBillPrefill(null)
          setExpenseSheetOpen(true)
        }}
        onSettleUp={() => {
          setPreselectedSuggestion(null)
          setSettleUpSheetOpen(true)
        }}
        isSending={isSending}
        isAnalyzingBill={isAnalyzingBill}
        onTyping={emitTyping}
      />

      {/* Sheets and Dialogs */}
      <AddExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={(open) => {
          setExpenseSheetOpen(open)
          if (!open) setBillPrefill(null)
        }}
        members={group.members}
        currentUserId={currentUserId}
        formatCurrency={formatCurrency}
        onSubmit={handleAddExpense}
        prefillData={billPrefill}
      />

      <SettleUpSheet
        open={settleUpSheetOpen}
        onOpenChange={(open) => {
          setSettleUpSheetOpen(open)
          if (!open) setPreselectedSuggestion(null)
        }}
        suggestions={group.suggestions || []}
        currentUserId={currentUserId}
        formatCurrency={formatCurrency}
        onSubmit={handleSettleUp}
        preselectedSuggestion={preselectedSuggestion}
      />

      {recordingTransaction && (
        <RecordInAccountsDialog
          open={recordDialogOpen}
          onOpenChange={(open) => {
            setRecordDialogOpen(open)
            if (!open) setRecordingTransaction(null)
          }}
          expenseDescription={recordingTransaction.description}
          shareAmount={recordingTransaction.shareAmount}
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          }))}
          formatCurrency={formatCurrency}
          onSubmit={handleConfirmRecord}
        />
      )}
    </div>
  )
}
