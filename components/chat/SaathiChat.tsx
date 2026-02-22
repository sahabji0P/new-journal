"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  MessageSquare,
  X,
  Send,
  Trash2,
  Loader2,
  Minimize2,
  Maximize2,
  LogIn
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SaathiMessageCards } from "@/components/chat/SaathiMessageCards"
import { SaathiAssistantMetadataSchema, type SaathiMutation, type SaathiToolCall } from "@/lib/saathi/schema"
import {
  appendSaathiRecentConversation,
  clearSaathiRecentConversation,
  readSaathiRecentConversation,
  writeSaathiRecentConversation,
} from "@/lib/saathi/local-history"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  metadata?: unknown
}

const SAATHI_MUTATION_EVENT = "saathi:mutations"

function dispatchSaathiMutations(mutations: SaathiMutation[]) {
  if (mutations.length === 0) return
  window.dispatchEvent(new CustomEvent(SAATHI_MUTATION_EVENT, { detail: { mutations } }))
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function SaathiChat() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [unresolvedByMessage, setUnresolvedByMessage] = useState<Record<string, number>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const messageNodeRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  useEffect(() => {
    if (isOpen && messages.length === 0 && session) {
      loadChatHistory()
    }
  }, [isOpen, session, messages.length])

  useEffect(() => {
    setUnresolvedByMessage(previous => {
      const valid = new Set(messages.map(message => message.id))
      const next: Record<string, number> = {}
      for (const [messageId, count] of Object.entries(previous)) {
        if (valid.has(messageId) && count > 0) {
          next[messageId] = count
        }
      }
      return next
    })
  }, [messages])

  const updateMessageUnresolvedCount = useCallback((messageId: string, count: number) => {
    setUnresolvedByMessage(previous => {
      const current = previous[messageId] || 0
      if (current === count) return previous
      const next = { ...previous }
      if (count > 0) {
        next[messageId] = count
      } else {
        delete next[messageId]
      }
      return next
    })
  }, [])

  const unresolvedSummary = useMemo(() => {
    const total = Object.values(unresolvedByMessage).reduce((sum, count) => sum + count, 0)
    const firstMessageId = messages.find(message => (unresolvedByMessage[message.id] || 0) > 0)?.id || null
    return { total, firstMessageId }
  }, [messages, unresolvedByMessage])

  const jumpToFirstUnresolved = () => {
    if (!unresolvedSummary.firstMessageId) return
    messageNodeRefs.current[unresolvedSummary.firstMessageId]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })
  }

  const loadChatHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch("/api/chat?limit=50")
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        const memory = (data as Message[])
          .filter(item => item.role === "user" || item.role === "assistant")
          .map(item => {
            const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(item.metadata)
            return {
              role: item.role,
              content: item.content,
              metadata: parsedMetadata.success ? parsedMetadata.data : undefined,
            }
          })
          .slice(-6)
        writeSaathiRecentConversation(memory)
      }
    } catch (error) {
      console.error("Failed to load chat history:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          recentConversation: readSaathiRecentConversation(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(data?.message?.metadata)
        if (parsedMetadata.success) {
          dispatchSaathiMutations(parsedMetadata.data.mutations || [])
        }
        appendSaathiRecentConversation(
          { role: "user", content: userMessage },
          {
            role: "assistant",
            content: data?.message?.content || "",
            metadata: parsedMetadata.success ? parsedMetadata.data : undefined,
          }
        )
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
        console.error("Failed to send message")
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear all chat history?")) return

    try {
      const res = await fetch("/api/chat", { method: "DELETE" })
      if (res.ok) {
        setMessages([])
        clearSaathiRecentConversation()
      }
    } catch (error) {
      console.error("Failed to clear history:", error)
    }
  }

  const executeToolRequestsFromCard = async ({
    toolRequests,
    userMessage,
  }: {
    toolRequests: SaathiToolCall[]
    userMessage?: string
  }) => {
    if (!session || isLoading || toolRequests.length === 0) {
      throw new Error("Cannot execute this action right now.")
    }

    const actionMessage = userMessage?.trim() || "Apply requested draft changes."
    const tempUserMessage: Message = {
      id: `temp-tool-${Date.now()}`,
      role: "user",
      content: actionMessage,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, tempUserMessage])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: actionMessage,
          toolRequests,
          recentConversation: readSaathiRecentConversation(),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to apply draft action.")
      }

      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(data?.message?.metadata)
      if (parsedMetadata.success) {
        dispatchSaathiMutations(parsedMetadata.data.mutations || [])
      }
      appendSaathiRecentConversation(
        { role: "user", content: actionMessage },
        {
          role: "assistant",
          content: data?.message?.content || "",
          metadata: parsedMetadata.success ? parsedMetadata.data : undefined,
        }
      )
    } catch (error) {
      console.error("Error executing tool requests:", error)
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = !isLoading && Boolean(input.trim())

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      if (canSubmit) {
        formRef.current?.requestSubmit()
      }
    }
  }

  return (
    <>
      {/* Chat Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed mobile-nav-offset md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : "min(600px, calc(100vh - 8rem))"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed mobile-nav-offset md:bottom-6 right-3 left-3 md:left-auto md:right-6 z-50 md:w-[380px] bg-background border border-border rounded-2xl chat-shadow-lg flex flex-col overflow-hidden"
          >
            {/* Header — Frosted glass */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-chat-panel/80 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-chat-user flex items-center justify-center">
                  <span className="text-chat-user-foreground text-xs font-bold">S</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-none">Saathi</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Financial Companion</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth" role="log" aria-label="Chat messages" aria-live="polite">
                  <div className="space-y-4 p-4">
                    {!session ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
                        <div className="h-12 w-12 rounded-2xl bg-chat-assistant flex items-center justify-center mb-4">
                          <MessageSquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h4 className="text-sm font-medium text-foreground mb-2">Hi, I&apos;m Saathi!</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Sign in to chat about your finances.
                        </p>
                        <Button asChild size="sm">
                          <Link href="/">
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In
                          </Link>
                        </Button>
                      </div>
                    ) : isLoadingHistory ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center px-4 py-12">
                        <div className="h-12 w-12 rounded-2xl bg-chat-assistant flex items-center justify-center mb-3">
                          <MessageSquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Start a conversation</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">
                          Ask about your finances
                        </p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {[
                            "How much did I spend this month?",
                            "Am I on track with my goals?",
                            "What's my biggest expense?",
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setInput(suggestion)}
                              className="text-[11px] px-2.5 py-1 bg-chat-assistant text-chat-assistant-foreground rounded-full hover:bg-secondary transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {unresolvedSummary.total > 0 && (
                          <div className="rounded-xl border border-amber-300/70 bg-amber-50/20 px-3 py-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-amber-700">
                              {unresolvedSummary.total} unresolved card{unresolvedSummary.total === 1 ? "" : "s"} pending review.
                            </p>
                            <Button size="sm" variant="outline" onClick={jumpToFirstUnresolved}>
                              View
                            </Button>
                          </div>
                        )}

                        {messages.map((message) => {
                          const isUser = message.role === "user"
                          return (
                            <div
                              key={message.id}
                              ref={(node) => {
                                messageNodeRefs.current[message.id] = node
                              }}
                              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                              role="article"
                              aria-label={`${message.role} message`}
                            >
                              {!isUser && (
                                <div className="h-7 w-7 rounded-lg bg-chat-assistant flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-chat-assistant-foreground text-xs font-bold">S</span>
                                </div>
                              )}

                              <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? "items-end" : ""}`}>
                                <div
                                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                    isUser
                                      ? "bg-chat-user text-chat-user-foreground rounded-tr-md"
                                      : "bg-chat-assistant text-chat-assistant-foreground rounded-tl-md"
                                  }`}
                                >
                                  {message.content}
                                </div>

                                {message.role === "assistant" && (
                                  <div className="w-full max-w-full">
                                    <SaathiMessageCards
                                      metadata={message.metadata}
                                      onSuggestedPrompt={suggestion => setInput(suggestion)}
                                      onExecuteToolRequests={executeToolRequestsFromCard}
                                      onUnresolvedCountChange={(count) => updateMessageUnresolvedCount(message.id, count)}
                                    />
                                  </div>
                                )}

                                <span className={`text-[10px] text-muted-foreground/60 px-1 ${isUser ? "text-right" : "text-left"}`}>
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                            </div>
                          )
                        })}

                        {/* Typing indicator — bouncing dots */}
                        {isLoading && (
                          <div className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-chat-assistant flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-chat-assistant-foreground text-xs font-bold">S</span>
                            </div>
                            <div className="rounded-2xl rounded-tl-md bg-chat-assistant px-4 py-3 inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 chat-dot-1" />
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 chat-dot-2" />
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 chat-dot-3" />
                            </div>
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </div>

                {/* Composer */}
                {session && (
                  <div className="border-t border-border bg-chat-panel/80 backdrop-blur-md">
                    <form ref={formRef} onSubmit={sendMessage} className="p-3">
                      <div className="flex items-end gap-2 rounded-xl bg-chat-composer p-2 chat-shadow transition-shadow focus-within:chat-shadow-lg focus-within:ring-1 focus-within:ring-ring/30">
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Message Saathi..."
                          className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                          disabled={isLoading}
                          aria-label="Type a message"
                        />
                        <button
                          type="submit"
                          disabled={!canSubmit}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Send message"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
                        Ctrl/Cmd + Enter to send
                      </p>
                    </form>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
