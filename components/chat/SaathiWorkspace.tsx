"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  LogIn,
  Menu,
  MessageSquare,
  Mic,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaathiAudioRecorder } from "@/components/chat/SaathiAudioRecorder"
import { SaathiMessageCards } from "@/components/chat/SaathiMessageCards"
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
const MAX_ATTACHMENTS_PER_TYPE = 3
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

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesListRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const captureInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageUrlsRef = useRef<Set<string>>(new Set())
  const hasLoadedHistoryRef = useRef(false)
  const animatedMessageIdsRef = useRef<Set<string>>(new Set())
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const attachmentToggleRef = useRef<HTMLButtonElement>(null)

  const hasAttachments = imageFiles.length > 0 || audioFiles.length > 0
  const canSubmit = Boolean(session) && !isLoading && !isRecorderOpen && (Boolean(draft.trim()) || hasAttachments)

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
    const nextHeight = Math.min(textarea.scrollHeight, 160)
    textarea.style.height = `${Math.max(nextHeight, 40)}px`
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden"
  }, [draft])

  useEffect(() => {
    if (!isAttachmentMenuOpen) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const menu = attachmentMenuRef.current
      const trigger = attachmentToggleRef.current
      if (menu?.contains(target) || trigger?.contains(target)) {
        return
      }
      setIsAttachmentMenuOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [isAttachmentMenuOpen])

  useEffect(() => {
    const imageUrls = imageUrlsRef.current

    return () => {
      imageUrls.forEach(url => URL.revokeObjectURL(url))
      imageUrls.clear()
    }
  }, [])

  useGSAP(() => {
    if (!shellRef.current) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    gsap.fromTo(
      shellRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
    )
  }, [])

  useGSAP(() => {
    if (!messagesListRef.current) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const nodes = messagesListRef.current.querySelectorAll<HTMLElement>("[data-saathi-message-id]")
    const unseen: HTMLElement[] = []

    nodes.forEach(node => {
      const messageId = node.dataset.saathiMessageId
      if (!messageId) return
      if (animatedMessageIdsRef.current.has(messageId)) return
      animatedMessageIdsRef.current.add(messageId)
      unseen.push(node)
    })

    if (unseen.length === 0) return

    gsap.fromTo(
      unseen,
      { y: 12, opacity: 0, scale: 0.98 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.24,
        ease: "power2.out",
        stagger: 0.03,
      }
    )
  }, [messages.length])

  const appendFiles = (incoming: FileList | null, type: "image" | "audio") => {
    if (!incoming || incoming.length === 0) return

    const nextFiles = Array.from(incoming)

    if (type === "image") {
      const availableSlots = Math.max(0, MAX_ATTACHMENTS_PER_TYPE - imageFiles.length)
      if (availableSlots === 0) {
        setComposerHint(`You can attach up to ${MAX_ATTACHMENTS_PER_TYPE} images.`)
        return
      }

      const imageAttachments = nextFiles
        .filter(file => file.type.startsWith("image/"))
        .slice(0, availableSlots)
        .map(file => {
          const previewUrl = URL.createObjectURL(file)
          imageUrlsRef.current.add(previewUrl)
          return { file, previewUrl }
        })

      if (imageAttachments.length === 0) return

      setImageFiles(prev => [...prev, ...imageAttachments])
      setComposerHint("Image attached.")
      return
    }

    const availableSlots = Math.max(0, MAX_ATTACHMENTS_PER_TYPE - audioFiles.length)
    if (availableSlots === 0) {
      setComposerHint(`You can attach up to ${MAX_ATTACHMENTS_PER_TYPE} audio files.`)
      return
    }

    const selectedAudio = nextFiles.slice(0, availableSlots)
    if (selectedAudio.length === 0) return

    setAudioFiles(prev => [...prev, ...selectedAudio])
    setComposerHint("Audio attached.")
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
    setIsAttachmentMenuOpen(false)
    setIsRecorderOpen(false)
  }

  const applySuggestion = (suggestion: string) => {
    setDraft(suggestion)
    textAreaRef.current?.focus()
  }

  const persistAssistantMetadata = (messageText: string, metadata: unknown, userText: string) => {
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
  }

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || isLoading || isRecorderOpen) return
    if (!draft.trim() && !hasAttachments) return

    setIsAttachmentMenuOpen(false)
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
          mimeType: file.type || "audio/webm",
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
      setComposerHint("Chat history cleared.")
    } catch (error) {
      console.error("Failed to clear chat history:", error)
    }
  }

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      if (canSubmit) formRef.current?.requestSubmit()
    }
  }

  const triggerImageUpload = () => {
    setIsAttachmentMenuOpen(false)
    imageInputRef.current?.click()
  }

  const triggerImageCapture = () => {
    setIsAttachmentMenuOpen(false)
    captureInputRef.current?.click()
  }

  const triggerAudioUpload = () => {
    setIsAttachmentMenuOpen(false)
    audioInputRef.current?.click()
  }

  const openRecorder = () => {
    setIsAttachmentMenuOpen(false)
    setIsRecorderOpen(true)
  }

  const handleRecorderCancel = () => {
    setIsRecorderOpen(false)
  }

  const handleRecorderSend = (file: File, durationSeconds: number) => {
    setIsRecorderOpen(false)
    setAudioFiles(prev => [...prev, file].slice(0, MAX_ATTACHMENTS_PER_TYPE))
    const minutes = Math.floor(durationSeconds / 60)
    const seconds = durationSeconds % 60
    setComposerHint(`Voice note attached (${minutes}:${String(seconds).padStart(2, "0")}).`)
  }

  const toggleAppSidebar = () => {
    window.dispatchEvent(new Event("toggle-app-sidebar"))
  }

  return (
    <section ref={shellRef} className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background/40">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,245,245,0.04) 0%, rgba(100,100,100,0.02) 48%, rgba(245,245,245,0.04) 100%)",
          backgroundSize: "200% 200%",
          backgroundPosition: "0% 0%",
        }}
      />

      <header className="sticky top-0 z-20 bg-chat-panel/80 backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={toggleAppSidebar}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border/70 bg-card/70 hover:bg-muted transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          <h1 className="text-center text-[15px] font-semibold tracking-tight">Saathi</h1>

          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clearChatHistory}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <span className="h-9 w-9" aria-hidden="true" />
          )}
        </div>
      </header>

      <div
        ref={messagesListRef}
        className="flex-1 overflow-y-auto scroll-smooth"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        <div className="mx-auto w-full max-w-4xl space-y-4 px-2 py-6 sm:px-4">
          {!session ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <div className="h-12 w-12 rounded-2xl bg-chat-assistant flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium mb-2">Sign in to use Saathi</h4>
              <p className="text-xs text-muted-foreground mb-4 max-w-xl">
                Saathi can answer questions and run actions on your data after sign in.
              </p>
              <Button asChild size="sm">
                <Link href="/">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          ) : isLoadingHistory ? (
            <div className="h-[50vh] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-[50vh] flex flex-col items-center justify-center text-center px-2">
              <div className="h-12 w-12 rounded-2xl bg-chat-assistant flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Start a conversation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Type a message below to begin chatting
              </p>
            </div>
          ) : (
            messages.map(message => {
              const isUser = message.role === "user"
              return (
                <div
                  key={message.id}
                  data-saathi-message-id={message.id}
                  className={cn("flex items-start gap-3 px-1 sm:px-0", isUser && "flex-row-reverse")}
                  role="article"
                  aria-label={`${message.role} message`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-lg bg-chat-assistant flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-chat-assistant-foreground text-xs font-bold">S</span>
                    </div>
                  )}

                  <div className={cn("flex max-w-[92%] flex-col gap-1 sm:max-w-[80%]", isUser && "items-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
                        isUser
                          ? "bg-chat-user text-chat-user-foreground rounded-tr-md"
                          : "bg-chat-assistant text-chat-assistant-foreground rounded-tl-md"
                      )}
                    >
                      {message.content}

                      {isUser && message.attachments && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.attachments.images.map(name => (
                            <span key={`img-${name}`} className="text-[10px] rounded-full border border-primary-foreground/35 px-2 py-0.5 bg-primary-foreground/10">
                              Image: {name}
                            </span>
                          ))}
                          {message.attachments.audio.map(name => (
                            <span key={`audio-${name}`} className="text-[10px] rounded-full border border-primary-foreground/35 px-2 py-0.5 bg-primary-foreground/10">
                              Audio: {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.role === "assistant" && (
                      <div className="w-full max-w-full">
                        <SaathiMessageCards
                          metadata={message.metadata}
                          onSuggestedPrompt={applySuggestion}
                          onExecuteToolRequests={executeToolRequestsFromCard}
                        />
                      </div>
                    )}

                    <span className={cn("text-[10px] text-muted-foreground/60 px-1", isUser ? "text-right" : "text-left")}>
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })
          )}

          {isLoading && (
            <div className="flex items-start gap-3 px-2 sm:px-0">
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
        </div>
      </div>

      {session && (
        <div className="sticky bottom-0 z-10 bg-chat-panel/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto w-full max-w-4xl p-3 sm:p-4">
            {isRecorderOpen ? (
              <SaathiAudioRecorder
                disabled={isLoading}
                onCancel={handleRecorderCancel}
                onSend={handleRecorderSend}
                onFallbackUpload={triggerAudioUpload}
              />
            ) : (
              <>
                {(imageFiles.length > 0 || audioFiles.length > 0) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {imageFiles.map((item, index) => (
                      <div key={`image-${item.file.name}-${index}`} className="relative group rounded-lg border border-border bg-secondary/50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedImage({ src: item.previewUrl, name: item.file.name })}
                          className="relative block h-16 w-16"
                          aria-label={`Preview ${item.file.name}`}
                        >
                          <Image src={item.previewUrl} alt={item.file.name} fill className="object-cover" unoptimized />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAttachment("image", index)}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${item.file.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {audioFiles.map((file, index) => (
                      <span key={`audio-${file.name}-${index}`} className="inline-flex items-center gap-1 text-[11px] rounded-full border border-border px-2 py-1 bg-secondary/50">
                        <Mic className="w-3 h-3" />
                        {file.name}
                        <button type="button" onClick={() => removeAttachment("audio", index)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form ref={formRef} onSubmit={sendMessage}>
                  <div className="flex items-end gap-2 rounded-xl bg-chat-composer p-2 chat-shadow transition-shadow focus-within:chat-shadow-lg focus-within:ring-1 focus-within:ring-ring/30">
                    <div className="relative">
                      <button
                        ref={attachmentToggleRef}
                        type="button"
                        onClick={() => setIsAttachmentMenuOpen(prev => !prev)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95 disabled:opacity-30"
                        aria-label="Attach file"
                        disabled={isLoading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>

                      {isAttachmentMenuOpen && (
                        <div
                          ref={attachmentMenuRef}
                          className="absolute left-0 bottom-[calc(100%+0.45rem)] w-52 p-1.5 rounded-xl border border-border bg-chat-composer chat-shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={triggerImageCapture}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Camera className="h-4 w-4 text-muted-foreground" />
                            Capture Image
                          </button>
                          <button
                            type="button"
                            onClick={triggerImageUpload}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={triggerAudioUpload}
                            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Mic className="h-4 w-4 text-muted-foreground" />
                            Upload Audio
                          </button>
                        </div>
                      )}
                    </div>

                    <textarea
                      ref={textAreaRef}
                      value={draft}
                      onChange={event => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Message Saathi..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                      aria-label="Type a message"
                      disabled={isLoading}
                    />

                    <button
                      type="button"
                      onClick={openRecorder}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-95 disabled:opacity-30"
                      aria-label="Record voice message"
                      disabled={isLoading}
                    >
                      <Mic className="h-4 w-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Send message (Ctrl/Cmd+Enter)"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </form>

                <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
                  Ctrl/Cmd + Enter to send {composerHint ? `· ${composerHint}` : ""}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={event => {
          appendFiles(event.target.files, "image")
          event.target.value = ""
        }}
      />
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={event => {
          appendFiles(event.target.files, "image")
          event.target.value = ""
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={event => {
          appendFiles(event.target.files, "audio")
          event.target.value = ""
        }}
      />

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
