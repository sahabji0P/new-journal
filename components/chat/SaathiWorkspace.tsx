"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Bot, Loader2, LogIn, Send, Sparkles, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export function SaathiWorkspace() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!session) return
    loadChatHistory()
  }, [session])

  const loadChatHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch("/api/chat?limit=50")
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
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
        body: JSON.stringify({ message: userMessage }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
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
      }
    } catch (error) {
      console.error("Failed to clear history:", error)
    }
  }

  return (
    <section className="rounded-2xl border bg-card min-h-[70vh] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Saathi Workspace</h3>
            <p className="text-xs text-muted-foreground">
              Chat, analyze, and plan your finances in one place.
            </p>
          </div>
        </div>
        {session && (
          <Button variant="ghost" size="icon" onClick={clearHistory} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-medium mb-2">Hi, I&apos;m Saathi!</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to chat with me about your spending, budget, and goals.
            </p>
            <Button asChild className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Link href="/auth/signin">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In to Chat
              </Link>
            </Button>
          </div>
        ) : isLoadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-medium mb-2">Ask Saathi anything</h4>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "How much did I spend this month?",
                "What should I reduce first?",
                "Show me budget risks this week",
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  }`}
                >
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[84%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-foreground text-background rounded-tr-sm"
                      : "bg-muted rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {session && (
        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Saathi anything..."
              className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/40"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
