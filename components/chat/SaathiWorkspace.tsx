"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  Bot,
  Image as ImageIcon,
  Loader2,
  LogIn,
  Mic,
  PanelRight,
  Send,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaathiMessageCards } from "@/components/chat/SaathiMessageCards"
import { SaathiCardDock } from "@/components/chat/SaathiCardDock"
import { SaathiAssistantMetadataSchema, type SaathiMutation, type SaathiToolCall } from "@/lib/saathi/schema"
import {
  appendSaathiRecentConversation,
  clearSaathiRecentConversation,
  readSaathiRecentConversation,
  writeSaathiRecentConversation,
} from "@/lib/saathi/local-history"
import { cn } from "@/lib/utils"

gsap.registerPlugin(useGSAP)

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

const MAX_ATTACHMENT_SIZE_BYTES = 6 * 1024 * 1024
const SAATHI_MUTATION_EVENT = "saathi:mutations"

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

function dispatchSaathiMutations(mutations: SaathiMutation[]) {
  if (mutations.length === 0) return
  window.dispatchEvent(new CustomEvent(SAATHI_MUTATION_EVENT, { detail: { mutations } }))
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
  const [dockQuery, setDockQuery] = useState("")
  const [dockTypeFilter, setDockTypeFilter] = useState("all")
  const [dockStatusFilter, setDockStatusFilter] = useState("all")
  const [isDockOpen, setIsDockOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesListRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageUrlsRef = useRef<Set<string>>(new Set())
  const hasLoadedHistoryRef = useRef(false)
  const messageNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map())

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
  }, [session])

  useEffect(() => {
    const textarea = textAreaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    const nextHeight = Math.min(textarea.scrollHeight, 180)
    textarea.style.height = `${Math.max(nextHeight, 52)}px`
    textarea.style.overflowY = textarea.scrollHeight > 180 ? "auto" : "hidden"
  }, [draft])

  useEffect(() => {
    const imageUrls = imageUrlsRef.current
    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url))
      imageUrls.clear()
    }
  }, [])

  useGSAP(() => {
    if (!messagesListRef.current) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const nodes = messagesListRef.current.querySelectorAll("[data-saathi-message]")
    if (nodes.length === 0) return

    gsap.fromTo(
      nodes,
      { y: 14, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        ease: "power2.out",
        stagger: 0.03,
      }
    )
  }, [messages.length])

  useGSAP(() => {
    if (!dockRef.current || !isDockOpen) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    gsap.fromTo(
      dockRef.current,
      { x: 18, opacity: 0.4 },
      { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
    )
  }, [dockQuery, dockTypeFilter, dockStatusFilter, messages.length, isDockOpen])

  const greeting = useMemo(() => {
    const firstName = session?.user?.name?.split(" ")[0] || "there"
    const now = new Date()
    const hour = now.getHours()
    const period = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
    return `Good ${period}, ${firstName}. Ask Saathi to analyze, create, update, or manage your data in one place.`
  }, [session?.user?.name])

  const canSubmit = Boolean(session) && !isLoading && (Boolean(draft.trim()) || hasAttachments)

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
      setComposerHint("Image attached. Saathi can extract draft details before saving.")
      return
    }

    setAudioFiles(prev => [...prev, ...nextFiles])
    setComposerHint("Audio attached. Saathi can help with transcript-based drafts.")
  }

  const removeAttachment = (type: "image" | "audio", index: number) => {
    if (type === "image") {
      setImageFiles(prev => {
        const target = prev[index]
        if (target) {
          URL.revokeObjectURL(target.previewUrl)
          imageUrlsRef.current.delete(target.previewUrl)
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

  const onMessageNodeRef = useCallback((messageId: string, node: HTMLDivElement | null) => {
    if (!node) {
      messageNodeMapRef.current.delete(messageId)
      return
    }
    messageNodeMapRef.current.set(messageId, node)
  }, [])

  const jumpToMessage = useCallback((messageId: string) => {
    const node = messageNodeMapRef.current.get(messageId)
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "center" })
    node.classList.add("ring-1", "ring-primary/50")
    window.setTimeout(() => {
      node.classList.remove("ring-1", "ring-primary/50")
    }, 900)
  }, [])

  const persistAssistantMetadata = useCallback((messageText: string, metadata: unknown, userText: string) => {
    const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(metadata)
    appendSaathiRecentConversation(
      { role: "user", content: userText },
      {
        role: "assistant",
        content: messageText,
        metadata: parsedMetadata.success ? parsedMetadata.data : undefined,
      }
    )

    if (parsedMetadata.success) {
      dispatchSaathiMutations(parsedMetadata.data.mutations || [])
    }
  }, [])

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || isLoading) return
    if (!draft.trim() && !hasAttachments) return

    const messageText = draft.trim() || "Please extract and organize transaction details from my attachments."
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
      setComposerHint(`Skipped oversized files (>6MB): ${ignoredAttachments.join(", ")}`)
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
      persistAssistantMetadata(data?.message?.content || "", data?.message?.metadata, messageText)
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
    if (!session || isLoading || toolRequests.length === 0) {
      throw new Error("Cannot execute this action right now.")
    }

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
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to apply draft action.")
      }

      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      persistAssistantMetadata(data?.message?.content || "", data?.message?.metadata, messageText)
    } catch (error) {
      console.error("Error executing tool requests:", error)
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
      throw error
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

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      if (canSubmit) formRef.current?.requestSubmit()
    }
  }

  return (
    <section className="h-full min-h-0 flex flex-col overflow-hidden">
      <header className="hidden md:block mb-4">
        <div className="flex items-center md:items-start justify-between gap-3 px-1 md:px-5 md:py-4 md:rounded-2xl md:border md:border-border/70 md:bg-gradient-to-br md:from-card/95 md:via-card/75 md:to-card/55 md:backdrop-blur-md md:shadow-sm">
          <div className="min-w-0">
            <h1 className="text-base md:text-3xl font-semibold tracking-[-0.02em]">Saathi</h1>
            <p className="hidden md:block text-[13px] text-muted-foreground mt-1.5 max-w-2xl">{greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isDockOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsDockOpen(prev => !prev)}
              className="hidden lg:inline-flex transition-all duration-200 hover:-translate-y-0.5"
            >
              <PanelRight className="w-4 h-4 mr-1" />
              {isDockOpen ? "Hide Cards" : "Show Cards"}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChatHistory}
                className="h-8 px-3 text-xs md:h-9 md:px-4 md:text-sm transition-all duration-200 hover:-translate-y-0.5"
              >
                Clear Chat
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className={cn(
        "flex-1 min-h-0 grid grid-cols-1 gap-4",
        isDockOpen ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : "lg:grid-cols-1"
      )}>
        <div className="min-h-0 md:rounded-2xl md:border md:border-border/70 md:bg-gradient-to-b md:from-card/85 md:to-card/55 md:backdrop-blur-md flex flex-col overflow-hidden md:shadow-sm">
          {messages.length > 0 && (
            <div className="md:hidden px-1 pb-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChatHistory}
                className="h-8 px-3 text-xs"
              >
                Clear Chat
              </Button>
            </div>
          )}

          <div
            ref={messagesListRef}
            className={cn(
              "flex-1 min-h-0 overflow-y-auto px-1 md:px-5 pt-1 md:pt-4 space-y-3.5",
              session ? "pb-30 md:pb-4" : "pb-4"
            )}
          >
            {!session ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-medium mb-2">Sign in to use Saathi</h4>
                <p className="text-sm text-muted-foreground mb-4 max-w-xl">
                  Saathi can answer questions and run CRUD actions on your data after sign in.
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
              <div className="h-full flex flex-col items-center justify-center text-center px-3 md:px-2">
                <div className="h-11 w-11 rounded-full border border-primary/35 bg-primary/10 flex items-center justify-center mb-5">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-[2rem] md:text-4xl leading-tight font-medium mb-3 tracking-tight">
                  How can I help you today?
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ask Saathi to create, update, analyze, or clean up your financial data.
                </p>
              </div>
            ) : (
              <>
                {messages.map(message => (
                  <div
                    key={message.id}
                    ref={node => onMessageNodeRef(message.id, node)}
                    data-saathi-message
                    className={cn(
                      "w-full",
                      message.role === "user" && "ml-auto max-w-[86%] md:max-w-4xl",
                      message.role === "assistant" && "max-w-4xl"
                    )}
                  >
                    <div className="hidden md:flex items-center gap-2 mb-1.5 text-[11px] tracking-wide text-muted-foreground/90">
                      {message.role === "assistant" ? (
                        <>
                          <Bot className="w-4 h-4" />
                          <span className="uppercase">Saathi</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" />
                          <span className="uppercase">You</span>
                        </>
                      )}
                    </div>
                    <div className={cn(
                      "rounded-2xl border px-4 py-3 transition-all duration-200 hover:shadow-sm",
                      message.role === "assistant"
                        ? "bg-background/85 border-border/70"
                        : "bg-primary/[0.16] border-primary/[0.35]"
                    )}>
                      <p className="text-[15px] leading-6 whitespace-pre-wrap">{message.content}</p>
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
                            <span key={`img-${name}`} className="text-[11px] rounded-full border px-2 py-1 bg-background/80">
                              Image: {name}
                            </span>
                          ))}
                          {message.attachments.audio.map(name => (
                            <span key={`audio-${name}`} className="text-[11px] rounded-full border px-2 py-1 bg-background/80">
                              Audio: {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="max-w-4xl">
                    <div className="hidden md:flex items-center gap-2 mb-1.5 text-[11px] tracking-wide text-muted-foreground/90">
                      <Bot className="w-4 h-4" />
                      <span className="uppercase">Saathi</span>
                    </div>
                    <div className="rounded-2xl border bg-background/85 px-4 py-2.5 inline-flex items-center gap-2 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-[13px] text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {session && (
            <div className="sticky bottom-0 z-20 border-t border-border/70 bg-gradient-to-t from-background via-background/95 to-background/70 px-1 md:px-5 pt-3 md:pt-3 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] md:pb-3">
              <form ref={formRef} onSubmit={sendMessage}>
                <div className="rounded-[1.5rem] border border-border/70 bg-card/90 backdrop-blur-xl p-2.5 md:p-3 shadow-[0_12px_30px_rgba(0,0,0,0.26)]">
                  {(imageFiles.length > 0 || audioFiles.length > 0) && (
                    <div className="px-2 pt-2 pb-1 flex flex-wrap gap-2">
                      {imageFiles.map((item, i) => (
                        <div key={`image-${item.file.name}-${i}`} className="relative w-20">
                          <button
                            type="button"
                            onClick={() => setSelectedImage({ src: item.previewUrl, name: item.file.name })}
                            className="relative block h-20 w-20 overflow-hidden rounded-md border transition-transform duration-200 hover:scale-[1.02]"
                            aria-label={`Preview ${item.file.name}`}
                          >
                            <Image src={item.previewUrl} alt={item.file.name} fill className="object-cover" unoptimized />
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
                        <span key={`audio-${file.name}-${i}`} className="inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-1 bg-background/70">
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
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Ask Saathi anything..."
                    rows={1}
                    className="w-full min-h-12 max-h-44 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1.5 pb-1">
                    <div className="text-[11px] text-muted-foreground max-w-[12rem] sm:max-w-none truncate">
                      {composerHint || "Enter sends"}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={event => appendFiles(event.target.files, "image")}
                      />
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        multiple
                        className="hidden"
                        onChange={event => appendFiles(event.target.files, "audio")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 w-11 p-0 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Attach image"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 w-11 p-0 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                        onClick={() => audioInputRef.current?.click()}
                        aria-label="Attach audio"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!canSubmit}
                        className="h-11 w-11 p-0 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                        aria-label="Send message"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        <div ref={dockRef} className={cn("hidden lg:block min-h-0", !isDockOpen && "lg:hidden")}>
          <SaathiCardDock
            messages={messages}
            query={dockQuery}
            onQueryChange={setDockQuery}
            typeFilter={dockTypeFilter}
            onTypeFilterChange={setDockTypeFilter}
            statusFilter={dockStatusFilter}
            onStatusFilterChange={setDockStatusFilter}
            onJumpToMessage={jumpToMessage}
          />
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl h-[80vh] rounded-xl overflow-hidden border border-border bg-background">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 z-10 rounded-full border bg-background/80 p-2"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
            <Image src={selectedImage.src} alt={selectedImage.name} fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </section>
  )
}
