"use client"

import { useRef, useEffect } from "react"
import { ArrowUp } from "lucide-react"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea between 1 and 3 rows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const lineHeight = 24
    const minHeight = lineHeight
    const maxHeight = lineHeight * 3
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSend()
      }
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border/30">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about projects, skills, experience..."
        rows={1}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none leading-6 disabled:opacity-50 scrollbar-none"
        style={{ maxHeight: "72px", overflowY: "auto" }}
      />
      <button
        onClick={() => {
          if (canSend) onSend()
        }}
        disabled={!canSend}
        aria-label="Send message"
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 ${
          canSend
            ? "bg-lime-400 text-black hover:bg-lime-300"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  )
}
