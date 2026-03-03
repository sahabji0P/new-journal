"use client"

import { useState, useRef, useCallback, type KeyboardEvent, type ChangeEvent } from "react"
import { Send, ImageIcon, Plus, Receipt, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatComposerProps {
  onSendMessage: (content: string) => Promise<void>
  onUploadBill: (imageDataUrl: string, mimeType: string) => void
  onAddExpense: () => void
  onSettleUp: () => void
  isSending: boolean
  isAnalyzingBill: boolean
  disabled?: boolean
}

const MAX_FILE_SIZE = 6 * 1024 * 1024

export function ChatComposer({
  onSendMessage,
  onUploadBill,
  onAddExpense,
  onSettleUp,
  isSending,
  isAnalyzingBill,
  disabled = false,
}: ChatComposerProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const lineHeight = 20
    const maxHeight = lineHeight * 3 + 16
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value)
      adjustHeight()
    },
    [adjustHeight]
  )

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending || disabled) return
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    await onSendMessage(trimmed)
  }, [text, isSending, disabled, onSendMessage])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE) {
        alert("File size must be under 6MB")
        e.target.value = ""
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onUploadBill(reader.result, file.type)
        }
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    },
    [onUploadBill]
  )

  const canSend = text.trim().length > 0 && !isSending && !disabled

  return (
    <div className="border-t bg-background px-3 py-2 space-y-2">
      {isAnalyzingBill && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing bill...
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isAnalyzingBill}
          aria-label="Upload bill image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs gap-1"
          onClick={onAddExpense}
          disabled={disabled}
          aria-label="Add expense"
        >
          <Plus className="h-3.5 w-3.5" />
          Expense
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs gap-1"
          onClick={onSettleUp}
          disabled={disabled}
          aria-label="Settle up"
        >
          <Receipt className="h-3.5 w-3.5" />
          Settle
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2 text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label="Message input"
        />

        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
