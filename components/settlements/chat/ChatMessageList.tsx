"use client"

import { useRef, useEffect, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { GroupChatMessage, BillAnalysisResult } from "@/lib/types"
import { SystemMessage } from "@/components/settlements/chat/cards/SystemMessage"
import { ExpenseMessageCard } from "@/components/settlements/chat/cards/ExpenseMessageCard"
import { SettlementMessageCard } from "@/components/settlements/chat/cards/SettlementMessageCard"
import { BillAnalysisCard } from "@/components/settlements/chat/cards/BillAnalysisCard"

interface ChatMessageListProps {
  messages: GroupChatMessage[]
  currentUserId: string
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  formatCurrency: (amount: number) => string
  onRecordInAccounts?: (transactionId: string) => void
  onConfirmBillAsExpense?: (result: BillAnalysisResult) => void
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString()
}

export function ChatMessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  formatCurrency,
  onRecordInAccounts,
  onConfirmBillAsExpense,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(messages.length)

  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      const el = scrollRef.current
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevLengthRef.current = messages.length
  }, [messages.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  const messagesWithSeparators = useMemo(() => {
    const items: Array<
      | { kind: "separator"; date: string; key: string }
      | { kind: "message"; message: GroupChatMessage; key: string }
    > = []

    let lastDateKey = ""
    for (const msg of messages) {
      const dk = getDateKey(msg.createdAt)
      if (dk !== lastDateKey) {
        items.push({ kind: "separator", date: msg.createdAt, key: `sep-${dk}` })
        lastDateKey = dk
      }
      items.push({ kind: "message", message: msg, key: msg.id })
    }

    return items
  }, [messages])

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No messages yet
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      {hasMore && (
        <div className="flex justify-center pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Load more
          </Button>
        </div>
      )}

      {isLoading && !hasMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {messagesWithSeparators.map((item) => {
        if (item.kind === "separator") {
          return (
            <div key={item.key} className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                {formatDateSeparator(item.date)}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )
        }

        const msg = item.message

        if (msg.type === "system") {
          return (
            <SystemMessage
              key={item.key}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          )
        }

        if (msg.type === "expense") {
          return (
            <ExpenseMessageCard
              key={item.key}
              content={msg.content}
              senderId={msg.senderId}
              currentUserId={currentUserId}
              transactionId={msg.transactionId}
              metadata={msg.metadata}
              createdAt={msg.createdAt}
              formatCurrency={formatCurrency}
              onRecordInAccounts={onRecordInAccounts}
            />
          )
        }

        if (msg.type === "settlement") {
          return (
            <SettlementMessageCard
              key={item.key}
              content={msg.content}
              createdAt={msg.createdAt}
              formatCurrency={formatCurrency}
            />
          )
        }

        if (msg.type === "bill_analysis") {
          return (
            <BillAnalysisCard
              key={item.key}
              content={msg.content}
              metadata={msg.metadata}
              formatCurrency={formatCurrency}
              onConfirmAsExpense={
                onConfirmBillAsExpense
                  ? (result: BillAnalysisResult) => onConfirmBillAsExpense(result)
                  : undefined
              }
            />
          )
        }

        const isOwn = msg.senderId === currentUserId

        return (
          <div
            key={item.key}
            className={cn(
              "flex flex-col max-w-[80%] mb-1",
              isOwn ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            {!isOwn && (
              <span className="text-xs text-muted-foreground mb-0.5 px-1">
                {msg.senderName}
              </span>
            )}
            <div
              className={cn(
                "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                isOwn
                  ? "bg-primary/10 rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
              {formatTime(msg.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
