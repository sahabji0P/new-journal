"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
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

export function SaathiChat() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Load chat history when opened (only if authenticated)
  useEffect(() => {
    if (isOpen && messages.length === 0 && session) {
      loadChatHistory()
    }
  }, [isOpen, session, messages.length])

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

    // Optimistically add user message
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
        // Remove optimistic message on error
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
    if (!session || isLoading || toolRequests.length === 0) return

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
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
        return
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
    } finally {
      setIsLoading(false)
    }
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          {line}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      ))
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
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed mobile-nav-offset md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
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
            className="fixed mobile-nav-offset md:bottom-6 right-3 left-3 md:left-auto md:right-6 z-50 md:w-[380px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-orange-500/12 to-amber-400/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Saathi</h3>
                  <p className="text-xs text-muted-foreground">Your Financial Companion</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                  {!session ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500/12 to-amber-400/10 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-orange-500" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">Hi, I&apos;m Saathi!</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sign in to chat with me about your finances. I can help you understand your spending, track goals, and provide personalized insights!
                      </p>
                      <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-400">
                        <Link href="/">
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In to Chat
                        </Link>
                      </Button>
                    </div>
                  ) : isLoadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500/12 to-amber-400/10 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-orange-500" />
                      </div>
                      <h4 className="font-medium text-foreground mb-2">Hi, I&apos;m Saathi!</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        I&apos;m your financial companion. Ask me anything about your accounts, spending, budgets, or goals!
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "How much did I spend this month?",
                          "Am I on track with my goals?",
                          "What's my biggest expense?",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setInput(suggestion)}
                            className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.role === "user" ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                              message.role === "user"
                                ? "bg-foreground text-background"
                                : "bg-gradient-to-r from-orange-500 to-amber-400 text-white"
                            }`}
                          >
                            {message.role === "user" ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </div>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              message.role === "user"
                                ? "bg-foreground text-background rounded-tr-sm"
                                : "bg-muted rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {formatMessage(message.content)}
                            </p>
                            {message.role === "assistant" && (
                              <SaathiMessageCards
                                metadata={message.metadata}
                                onSuggestedPrompt={suggestion => setInput(suggestion)}
                                onExecuteToolRequests={executeToolRequestsFromCard}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                {session && (
                  <form ref={formRef} onSubmit={sendMessage} className="p-4 border-t border-border">
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask Saathi anything..."
                        className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="rounded-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
