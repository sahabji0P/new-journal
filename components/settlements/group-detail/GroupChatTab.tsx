"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "@/contexts/AppContext"
import { useGroupChat } from "@/hooks/use-group-chat"
import { ChatMessageList } from "@/components/settlements/chat/ChatMessageList"
import { ChatComposer } from "@/components/settlements/chat/ChatComposer"
import { TypingIndicator } from "@/components/settlements/chat/TypingIndicator"
import { AddExpenseSheet } from "@/components/settlements/chat/AddExpenseSheet"
import { SettleUpSheet } from "@/components/settlements/chat/SettleUpSheet"
import { RecordInAccountsDialog } from "@/components/settlements/chat/RecordInAccountsDialog"
import { toast } from "@/lib/toast"
import type {
  SettlementGroup,
  SettlementGroupSuggestion,
  BillAnalysisResult,
  GroupSplitShare,
} from "@/lib/types"

interface GroupChatTabProps {
  group: SettlementGroup
  initialSettleUpUserId?: string
  onBalancesChanged: () => void
}

export function GroupChatTab({
  group,
  initialSettleUpUserId,
  onBalancesChanged,
}: GroupChatTabProps) {
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
  const [billPrefill, setBillPrefill] = useState<BillAnalysisResult | null>(null)
  const [preselectedSuggestion, setPreselectedSuggestion] =
    useState<SettlementGroupSuggestion | null>(null)

  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [recordingTransaction, setRecordingTransaction] = useState<{
    transactionId: string
    description: string
    shareAmount: number
  } | null>(null)
  const [locallyRecordedTxns, setLocallyRecordedTxns] = useState<Set<string>>(
    new Set()
  )

  // On mount, check for initialSettleUpUserId and open SettleUpSheet if a
  // matching suggestion is found.
  useEffect(() => {
    if (!initialSettleUpUserId) return
    const suggestion = group.suggestions?.find(
      (s) =>
        s.fromUserId === initialSettleUpUserId ||
        s.toUserId === initialSettleUpUserId
    )
    if (suggestion) {
      setPreselectedSuggestion(suggestion)
      setSettleUpSheetOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <TypingIndicator typingUsers={typingUsers} />

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
        suggestions={group.suggestions ?? []}
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
