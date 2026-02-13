"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Bot,
  Image as ImageIcon,
  Loader2,
  LogIn,
  Mic,
  Plus,
  Send,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaathiMessageCards } from "@/components/chat/SaathiMessageCards"
import { SaathiAssistantMetadataSchema, type SaathiToolCall } from "@/lib/saathi/schema"
import {
  appendSaathiRecentConversation,
  clearSaathiRecentConversation,
  readSaathiRecentConversation,
  writeSaathiRecentConversation,
} from "@/lib/saathi/local-history"

interface ImageAttachment {
  file: File
  previewUrl: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  metadata?: unknown
  attachments?: {
    images: string[]
    audio: string[]
  }
}

const SUGGESTIONS = [
  "What are my top spending categories this month?",
  "Summarize my current budget risks.",
  "Give me a practical saving plan for the next 30 days.",
  "How is my income vs expenses trending?",
]

const MAX_ATTACHMENT_SIZE_BYTES = 6 * 1024 * 1024

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function SaathiWorkspace() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [imageFiles, setImageFiles] = useState<ImageAttachment[]>([])
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [composerHint, setComposerHint] = useState("")
  const [selectedImage, setSelectedImage] = useState<{ src: string; name: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageUrlsRef = useRef<Set<string>>(new Set())
  const hasLoadedHistoryRef = useRef(false)

  const hasAttachments = imageFiles.length > 0 || audioFiles.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    textAreaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!session) {
      hasLoadedHistoryRef.current = false
      setMessages([])
      return
    }

    if (hasLoadedHistoryRef.current) return

    const loadHistory = async () => {
      setIsLoadingHistory(true)
      try {
        const res = await fetch("/api/chat?limit=80")
        if (!res.ok) return
        const data: Message[] = await res.json()
        setMessages(data)

        const memory = data
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
        hasLoadedHistoryRef.current = true
      } catch (error) {
        console.error("Failed to load Saathi history:", error)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    void loadHistory()
  }, [session, setMessages])

  useEffect(() => {
    const textarea = textAreaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    const nextHeight = Math.min(textarea.scrollHeight, 240)
    textarea.style.height = `${Math.max(nextHeight, 56)}px`
    textarea.style.overflowY = textarea.scrollHeight > 240 ? "auto" : "hidden"
  }, [draft])

  useEffect(() => {
    const imageUrls = imageUrlsRef.current
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url))
      imageUrls.clear()
    }
  }, [])

  const greeting = useMemo(() => {
    const firstName = session?.user?.name?.split(" ")[0] || "there"
    const now = new Date()
    const hour = now.getHours()
    const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
    const linesByPeriod: Record<"morning" | "afternoon" | "evening", string[]> = {
      morning: [
        "Small, intentional money decisions today build long-term freedom.",
        "A clear money plan this morning makes every spend more confident.",
        "Start with priorities first, and the rest of your budget follows.",
      ],
      afternoon: [
        "A quick mid-day check-in can keep your monthly goals on track.",
        "Consistency beats intensity when it comes to building financial strength.",
        "Progress is usually one smart decision at a time.",
      ],
      evening: [
        "Ending the day with clarity is how strong financial habits are built.",
        "Reviewing today’s spends now makes tomorrow easier.",
        "Steady discipline compounds faster than most people expect.",
      ],
    }
    const dateSeed = Number(now.toISOString().slice(0, 10).replace(/-/g, ""))
    const options = linesByPeriod[period]
    const pick = options[dateSeed % options.length]
    return `Good ${period}, ${firstName}. ${pick}`
  }, [session?.user?.name])

  const attachmentSummary = useMemo(() => {
    if (!hasAttachments) return ""
    return `${imageFiles.length} image${imageFiles.length !== 1 ? "s" : ""}, ${audioFiles.length} audio`
  }, [hasAttachments, imageFiles.length, audioFiles.length])

  const inlineSuggestions = useMemo(() => {
    const query = draft.trim().toLowerCase()
    if (!query) return []

    const matched = SUGGESTIONS.filter(suggestion => {
      const normalized = suggestion.toLowerCase()
      return normalized.includes(query) && normalized !== query
    })

    if (matched.length > 0) return matched.slice(0, 4)
    return SUGGESTIONS.slice(0, 3)
  }, [draft])

  const appendFiles = (incoming: FileList | null, type: "image" | "audio") => {
    if (!incoming || incoming.length === 0) return
    const nextFiles = Array.from(incoming)

    if (type === "image") {
      const imageAttachments = nextFiles
        .filter(file => file.type.startsWith("image/"))
        .map(file => {
          const previewUrl = URL.createObjectURL(file)
          imageUrlsRef.current.add(previewUrl)
          return { file, previewUrl }
        })
      if (imageAttachments.length === 0) return
      setImageFiles(prev => [...prev, ...imageAttachments])
      setComposerHint("Image attached. Saathi can extract details for transaction drafts.")
    } else {
      setAudioFiles(prev => [...prev, ...nextFiles])
      setComposerHint("Audio attached. Saathi can use it for transcript-based transaction drafts.")
    }
  }

  const removeAttachment = (type: "image" | "audio", index: number) => {
    if (type === "image") {
      setImageFiles(prev => {
        const toRemove = prev[index]
        if (toRemove) {
          URL.revokeObjectURL(toRemove.previewUrl)
          imageUrlsRef.current.delete(toRemove.previewUrl)
        }
        return prev.filter((_, i) => i !== index)
      })
      return
    }
    setAudioFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearComposer = () => {
    setDraft("")
    setImageFiles(prev => {
      prev.forEach(item => {
        URL.revokeObjectURL(item.previewUrl)
        imageUrlsRef.current.delete(item.previewUrl)
      })
      return []
    })
    setAudioFiles([])
    setComposerHint("")
  }

  const applySuggestion = (suggestion: string) => {
    setDraft(suggestion)
    textAreaRef.current?.focus()
  }

  const canSubmit = Boolean(session) && !isLoading && (Boolean(draft.trim()) || hasAttachments)

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      if (canSubmit) {
        formRef.current?.requestSubmit()
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || isLoading) return

    if (!draft.trim() && !hasAttachments) return

    const messageText = draft.trim() || "Please extract and organize transaction details from the attached files."

    const ignoredAttachments: string[] = []
    const imagesPayload = await Promise.all(
      imageFiles.map(async image => {
        if (image.file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          ignoredAttachments.push(image.file.name)
          return null
        }
        return {
          name: image.file.name,
          mimeType: image.file.type || "image/jpeg",
          dataUrl: await fileToDataUrl(image.file),
        }
      })
    )
    const audioPayload = await Promise.all(
      audioFiles.map(async file => {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          ignoredAttachments.push(file.name)
          return null
        }
        return {
          name: file.name,
          mimeType: file.type || "audio/mpeg",
          dataUrl: await fileToDataUrl(file),
        }
      })
    )

    if (ignoredAttachments.length > 0) {
      setComposerHint(
        `Skipped oversized files (>6MB): ${ignoredAttachments.join(", ")}`
      )
    }

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
      attachments: {
        images: imageFiles.map(image => image.file.name),
        audio: audioFiles.map(file => file.name),
      },
    }

    setMessages(prev => [...prev, tempUserMessage])
    clearComposer()
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          recentConversation: readSaathiRecentConversation(),
          attachments: {
            images: imagesPayload.filter(item => item !== null),
            audio: audioPayload.filter(item => item !== null),
          },
        }),
      })

      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
        return
      }

      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(data?.message?.metadata)
      appendSaathiRecentConversation(
        { role: "user", content: messageText },
        {
          role: "assistant",
          content: data?.message?.content || "",
          metadata: parsedMetadata.success ? parsedMetadata.data : undefined,
        }
      )
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
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

    const messageText = userMessage?.trim() || "Apply requested draft changes."

    const tempUserMessage: Message = {
      id: `temp-tool-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, tempUserMessage])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
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
      appendSaathiRecentConversation(
        { role: "user", content: messageText },
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

  const clearChatHistory = async () => {
    if (!confirm("Clear this chat history?")) return

    try {
      const res = await fetch("/api/chat", { method: "DELETE" })
      if (!res.ok) return
      setMessages([])
      clearSaathiRecentConversation()
    } catch (error) {
      console.error("Failed to clear chat history:", error)
    }
  }

  return (
    <section className="h-full min-h-0 flex flex-col overflow-hidden">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Saathi</h1>
            <p className="text-sm text-muted-foreground mt-1">{greeting}</p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChatHistory}
            >
              Clear chat
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto pr-1">
          {!session ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-medium mb-2">Sign in to use Saathi</h4>
              <p className="text-sm text-muted-foreground mb-4 max-w-xl">
                Saathi can answer questions using your financial data once you sign in.
              </p>
              <Button asChild>
                <Link href="/">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          ) : isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-2 pb-20">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-semibold mb-2">What do you want to know?</h2>
                <p className="text-muted-foreground">Type a prompt or start with one of these.</p>
              </div>
              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setDraft(suggestion)
                      textAreaRef.current?.focus()
                    }}
                    className="rounded-xl border bg-card text-left px-4 py-3 text-sm hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-5 pb-6">
              {messages.map(message => (
                <div key={message.id} className={message.role === "user" ? "ml-auto max-w-3xl" : "max-w-3xl"}>
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    {message.role === "assistant" ? (
                      <>
                        <Bot className="w-4 h-4" />
                        <span>Saathi</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        <span>You</span>
                      </>
                    )}
                  </div>
                  <div
                    className={
                      message.role === "assistant"
                        ? "rounded-2xl border bg-card px-4 py-3"
                        : "rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3"
                    }
                  >
                    <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>
                    {message.role === "assistant" && (
                      <SaathiMessageCards
                        metadata={message.metadata}
                        onSuggestedPrompt={applySuggestion}
                        onExecuteToolRequests={executeToolRequestsFromCard}
                      />
                    )}
                    {message.role === "user" && message.attachments && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.attachments.images.map(name => (
                          <span key={`img-${name}`} className="text-xs rounded-full border px-2 py-1 bg-background/70">
                            Image: {name}
                          </span>
                        ))}
                        {message.attachments.audio.map(name => (
                          <span key={`audio-${name}`} className="text-xs rounded-full border px-2 py-1 bg-background/70">
                            Audio: {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                    <Bot className="w-4 h-4" />
                    <span>Saathi</span>
                  </div>
                  <div className="rounded-2xl border bg-card px-4 py-3 inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {session && (
        <div className="mt-4">
          <form ref={formRef} onSubmit={sendMessage} className="mx-auto max-w-4xl">
            <div className="rounded-2xl border bg-card p-2 shadow-sm">
              {(imageFiles.length > 0 || audioFiles.length > 0) && (
                <div className="px-2 pt-2 pb-1 flex flex-wrap gap-2">
                  {imageFiles.map((item, i) => (
                    <div key={`image-${item.file.name}-${i}`} className="relative w-20">
                      <button
                        type="button"
                        onClick={() => setSelectedImage({ src: item.previewUrl, name: item.file.name })}
                        className="relative block h-20 w-20 overflow-hidden rounded-md border"
                        aria-label={`Preview ${item.file.name}`}
                      >
                        <Image
                          src={item.previewUrl}
                          alt={item.file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachment("image", i)}
                        className="absolute -top-2 -right-2 rounded-full border bg-background p-0.5"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="mt-1 text-[10px] text-muted-foreground truncate">{item.file.name}</p>
                    </div>
                  ))}
                  {audioFiles.map((file, i) => (
                    <span key={`audio-${file.name}-${i}`} className="inline-flex items-center gap-1 text-xs rounded-full border px-2 py-1">
                      <Mic className="w-3 h-3" />
                      {file.name}
                      <button type="button" onClick={() => removeAttachment("audio", i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                ref={textAreaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Ask Saathi anything..."
                rows={1}
                className="w-full min-h-14 max-h-60 resize-none bg-transparent px-3 py-2 text-sm outline-none"
              />

              {inlineSuggestions.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="rounded-xl border bg-background/95 overflow-hidden">
                    {inlineSuggestions.map(suggestion => (
                      <button
                        key={`inline-suggestion-${suggestion}`}
                        type="button"
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => imageInputRef.current?.click()}
                    aria-label="Attach image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => audioInputRef.current?.click()}
                    aria-label="Attach audio"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {hasAttachments ? attachmentSummary : "Add image or audio"}
                  </span>
                </div>

                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || (!draft.trim() && !hasAttachments)}
                  className="h-8 w-8 rounded-full"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => appendFiles(e.target.files, "image")}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={e => appendFiles(e.target.files, "audio")}
              />
            </div>
            {composerHint && <p className="text-xs text-muted-foreground mt-2 px-1">{composerHint}</p>}
          </form>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 px-4 py-6 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview for ${selectedImage.name}`}
          onClick={() => setSelectedImage(null)}
        >
          <div className="mx-auto h-full w-full max-w-5xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedImage(null)}>
                Close
              </Button>
            </div>
            <div className="relative mt-3 flex-1">
              <Image
                src={selectedImage.src}
                alt={selectedImage.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/80 truncate">{selectedImage.name}</p>
          </div>
        </div>
      )}
    </section>
  )
}
