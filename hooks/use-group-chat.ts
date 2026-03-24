"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Channel } from "pusher-js"
import type { GroupChatMessage, BillAnalysisResult } from "@/lib/types"
import { getPusherClient } from "@/lib/pusher-client"

interface UseGroupChatOptions {
  onBalancesChanged?: () => void
  userName?: string
}

interface UseGroupChatReturn {
  messages: GroupChatMessage[]
  isLoadingMessages: boolean
  hasMore: boolean
  isSending: boolean
  isAnalyzingBill: boolean
  typingUsers: Map<string, string>
  sendTextMessage: (content: string) => Promise<void>
  loadMore: () => Promise<void>
  analyzeBill: (
    imageDataUrl: string,
    mimeType?: string
  ) => Promise<{ success: boolean; analysisResult?: BillAnalysisResult }>
  emitTyping: () => void
}

export function useGroupChat(
  groupId: string | null,
  currentUserId: string | null,
  options?: UseGroupChatOptions
): UseGroupChatReturn {
  const [messages, setMessages] = useState<GroupChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isAnalyzingBill, setIsAnalyzingBill] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map()
  )

  const channelRef = useRef<Channel | null>(null)
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const onBalancesChangedRef = useRef(options?.onBalancesChanged)
  onBalancesChangedRef.current = options?.onBalancesChanged
  const userNameRef = useRef(options?.userName || "Someone")
  useEffect(() => { userNameRef.current = options?.userName || "Someone" }, [options?.userName])

  // Load initial messages when group changes
  useEffect(() => {
    if (!groupId) {
      setMessages([])
      setHasMore(true)
      setCursor(null)
      return
    }

    let cancelled = false

    async function fetchInitial() {
      setIsLoadingMessages(true)
      try {
        const res = await fetch(
          `/api/settlements/groups/${groupId}/messages?limit=50`
        )
        if (!res.ok) throw new Error("Failed to fetch messages")
        const data = await res.json()

        if (!cancelled) {
          // Messages come newest-first from API, reverse for display (oldest first)
          setMessages((data.messages as GroupChatMessage[]).reverse())
          setHasMore(data.hasMore)
          setCursor(data.nextCursor)
        }
      } catch (error) {
        console.error("Failed to load messages:", error)
      } finally {
        if (!cancelled) setIsLoadingMessages(false)
      }
    }

    fetchInitial()
    return () => {
      cancelled = true
    }
  }, [groupId])

  // Subscribe to Pusher channel
  useEffect(() => {
    if (!groupId) return

    const pusher = getPusherClient()
    const channel = pusher.subscribe(`private-group-${groupId}`)
    channelRef.current = channel

    const handleNewMessage = (data: GroupChatMessage) => {
      setMessages((prev) => {
        // Dedup by id
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data]
      })
    }

    const handleExpenseAdded = (data: GroupChatMessage) => {
      handleNewMessage(data)
      onBalancesChangedRef.current?.()
    }

    const handleSettlementRecorded = (data: GroupChatMessage) => {
      handleNewMessage(data)
      onBalancesChangedRef.current?.()
    }

    const handleMemberJoined = (data: GroupChatMessage) => {
      handleNewMessage(data)
      onBalancesChangedRef.current?.()
    }

    const handleTyping = (data: { userId: string; userName: string }) => {
      if (data.userId === currentUserId) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(data.userId, data.userName)
        return next
      })

      // Clear after 3 seconds
      const existing = typingTimersRef.current.get(data.userId)
      if (existing) clearTimeout(existing)
      typingTimersRef.current.set(
        data.userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev)
            next.delete(data.userId)
            return next
          })
          typingTimersRef.current.delete(data.userId)
        }, 3000)
      )
    }

    channel.bind("new-message", handleNewMessage)
    channel.bind("expense-added", handleExpenseAdded)
    channel.bind("settlement-recorded", handleSettlementRecorded)
    channel.bind("member-joined", handleMemberJoined)
    channel.bind("typing", handleTyping)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-group-${groupId}`)
      channelRef.current = null

      // Clear typing timers
      for (const timer of typingTimersRef.current.values()) {
        clearTimeout(timer)
      }
      typingTimersRef.current.clear()
      setTypingUsers(new Map())
    }
  }, [groupId, currentUserId])

  const sendTextMessage = useCallback(
    async (content: string) => {
      if (!groupId || !content.trim()) return
      setIsSending(true)
      try {
        const res = await fetch(
          `/api/settlements/groups/${groupId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content.trim() }),
          }
        )
        if (!res.ok) throw new Error("Failed to send message")
        const data = await res.json()

        // Add to local state (Pusher will also deliver it, dedup handles it)
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev
          return [...prev, data]
        })
      } catch (error) {
        console.error("Failed to send message:", error)
        throw error
      } finally {
        setIsSending(false)
      }
    },
    [groupId]
  )

  const loadMore = useCallback(async () => {
    if (!groupId || !hasMore || isLoadingMessages || !cursor) return

    setIsLoadingMessages(true)
    try {
      const res = await fetch(
        `/api/settlements/groups/${groupId}/messages?limit=50&cursor=${encodeURIComponent(cursor)}`
      )
      if (!res.ok) throw new Error("Failed to load more messages")
      const data = await res.json()

      const olderMessages = (data.messages as GroupChatMessage[]).reverse()
      setMessages((prev) => {
        // Dedup
        const existingIds = new Set(prev.map((m) => m.id))
        const newOnes = olderMessages.filter((m) => !existingIds.has(m.id))
        return [...newOnes, ...prev]
      })
      setHasMore(data.hasMore)
      setCursor(data.nextCursor)
    } catch (error) {
      console.error("Failed to load more messages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [groupId, hasMore, isLoadingMessages, cursor])

  const analyzeBill = useCallback(
    async (imageDataUrl: string, mimeType?: string) => {
      if (!groupId) return { success: false }

      setIsAnalyzingBill(true)
      try {
        const res = await fetch(
          `/api/settlements/groups/${groupId}/analyze-bill`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: { dataUrl: imageDataUrl, mimeType },
            }),
          }
        )
        if (!res.ok) throw new Error("Failed to analyze bill")
        const data = await res.json()

        // The message is created server-side and broadcast via Pusher
        // Add it locally too for immediate feedback
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message.id)) return prev
            return [...prev, data.message]
          })
        }

        return {
          success: data.success,
          analysisResult: data.analysisResult as BillAnalysisResult | undefined,
        }
      } catch (error) {
        console.error("Failed to analyze bill:", error)
        return { success: false }
      } finally {
        setIsAnalyzingBill(false)
      }
    },
    [groupId]
  )

  const emitTyping = useCallback(() => {
    if (!groupId || !currentUserId) return
    const channel = channelRef.current
    if (!channel) return

    try {
      channel.trigger("client-typing", {
        userId: currentUserId,
        userName: userNameRef.current,
      })
    } catch {
      // client events may not be enabled, silently ignore
    }
  }, [groupId, currentUserId])

  return {
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
  }
}
