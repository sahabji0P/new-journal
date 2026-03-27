"use client"

import { ChatInput } from "@/components/chat/chat-input"
import { ChatMessages } from "@/components/chat/chat-messages"
import { AnimatePresence, motion } from "framer-motion"
import { MessageCircle, Sparkles, X } from "lucide-react"
import { useCallback, useState } from "react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_QUESTIONS = [
  "What AI projects has Shashwat built?",
  "Tell me about his research papers",
  "What's his tech stack?",
  "What experience does he have?",
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: text.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      const contentType = res.headers.get("content-type") || ""

      if (contentType.includes("text/event-stream")) {
        // Handle SSE streaming from OpenAI proxy
        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""
        const assistantMsg: Message = { role: "assistant", content: "" }
        setMessages([...newMessages, assistantMsg])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim()
              if (data === "[DONE]") continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content
                if (delta) {
                  accumulated += delta
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = { role: "assistant", content: accumulated }
                    return updated
                  })
                }
              } catch {
                // Skip malformed SSE chunks
              }
            }
          }
        }
      } else {
        // Handle JSON response (fallback mode or Anthropic)
        const data = await res.json()
        const content = data.content || data.error || "Sorry, I couldn't process that."
        setMessages([...newMessages, { role: "assistant", content }])
      }
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading])

  const handleSend = () => sendMessage(input)
  const handleSuggestion = (q: string) => sendMessage(q)

  return (
    <>
      {/* Toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-lime-400 text-black shadow-lg shadow-lime-400/20 hover:bg-lime-300 transition-colors"
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute inset-0 rounded-full animate-ping bg-lime-400/30" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-40 flex flex-col w-[380px] max-w-[calc(100vw-32px)] h-[500px] max-h-[70vh] rounded-2xl border border-border/50 bg-[#0d0d0f]/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-[#0d0d0f]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-lime-400" />
                <span className="text-sm font-medium">Ask about Shashwat</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <ChatMessages messages={messages} isLoading={isLoading} />

            {/* Suggestions when empty */}
            {messages.length === 0 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-foreground hover:border-lime-400/30 hover:bg-lime-400/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
