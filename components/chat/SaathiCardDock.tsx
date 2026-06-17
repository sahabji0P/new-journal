"use client"

import { useMemo, useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { CheckCircle2, CircleDashed, Search } from "lucide-react"
import { SaathiAssistantMetadataSchema, type SaathiCard } from "@/lib/saathi/schema"
import { cn } from "@/lib/utils"

interface SaathiCardDockMessage {
  id: string
  role: "user" | "assistant"
  createdAt: string
  metadata?: unknown
}

type DockEntryType = SaathiCard["type"] | "execution"
type DockBucket = "draft" | "completed"

type CardEntry = {
  key: string
  messageId: string
  createdAt: string
  title: string
  type: DockEntryType
  status: string
  bucket: DockBucket
  description?: string
}

interface SaathiCardDockProps {
  messages: SaathiCardDockMessage[]
  query: string
  onQueryChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  onJumpToMessage: (messageId: string) => void
}

function getCardTitle(card: SaathiCard): string {
  if (card.type === "text") return card.title || "Text Card"
  if (card.type === "stats") return card.title
  if (card.type === "list") return card.title
  if (card.type === "entity") return card.title
  if (card.type === "budget") return card.name
  if (card.type === "action") return card.title
  return card.title
}

function getCardDescription(card: SaathiCard): string {
  if (card.type === "text") return card.body
  if (card.type === "list") return card.items[0]?.label || ""
  if (card.type === "stats") return card.stats[0]?.label || ""
  if (card.type === "entity") return card.fields[0]?.value || ""
  if (card.type === "budget") return `${card.usagePercent.toFixed(1)}% used`
  if (card.type === "confirm") return card.preview[0] || card.body
  if (card.type === "action") return card.description || ""
  return ""
}

function getCardStatus(card: SaathiCard): string {
  if (card.type === "entity") return card.status
  if (card.type === "confirm") return "pending-confirmation"
  return "n/a"
}

function getCardBucket(card: SaathiCard): DockBucket {
  if (card.type === "entity" && card.status === "draft") return "draft"
  if (card.type === "confirm") return "draft"
  return "completed"
}

function typeLabel(value: DockEntryType): string {
  if (value === "execution") return "execution"
  return value
}

function statusBadgeClass(status: string): string {
  if (status === "draft" || status === "pending-confirmation") {
    return "border-amber-300 bg-amber-50 text-amber-700"
  }
  if (status === "created" || status === "updated" || status === "success") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700"
  }
  if (status === "deleted") {
    return "border-slate-300 bg-slate-100 text-slate-700"
  }
  if (status === "error") {
    return "border-red-300 bg-red-50 text-red-700"
  }
  return "border-border bg-muted text-muted-foreground"
}

function EntryButton({ entry, onJumpToMessage }: { entry: CardEntry; onJumpToMessage: (messageId: string) => void }) {
  return (
    <button
      type="button"
      data-card-entry
      onClick={() => onJumpToMessage(entry.messageId)}
      className={cn(
        "w-full rounded-xl border bg-background/75 px-2.5 py-2 text-left transition-all duration-200",
        "hover:bg-muted/60 hover:-translate-y-0.5 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium tracking-tight truncate">{entry.title}</p>
        <span className={cn("text-[10px] rounded-full border px-1.5 py-0.5 whitespace-nowrap", statusBadgeClass(entry.status))}>
          {entry.status}
        </span>
      </div>
      {entry.description ? (
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</p>
      ) : null}
      <p className="text-[10px] text-muted-foreground mt-1 capitalize">
        {typeLabel(entry.type)}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">
        {new Date(entry.createdAt).toLocaleString()}
      </p>
    </button>
  )
}

export function SaathiCardDock({
  messages,
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onJumpToMessage,
}: SaathiCardDockProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const allEntries = useMemo<CardEntry[]>(() => {
    const entries: CardEntry[] = []

    for (const message of messages) {
      if (message.role !== "assistant") continue
      const parsed = SaathiAssistantMetadataSchema.safeParse(message.metadata)
      if (!parsed.success) continue

      parsed.data.cards.forEach((card, index) => {
        entries.push({
          key: `${message.id}-card-${index}`,
          messageId: message.id,
          createdAt: message.createdAt,
          title: getCardTitle(card),
          type: card.type,
          status: getCardStatus(card),
          bucket: getCardBucket(card),
          description: getCardDescription(card),
        })
      })

      parsed.data.executedTools.forEach((execution, index) => {
        entries.push({
          key: `${message.id}-execution-${index}`,
          messageId: message.id,
          createdAt: message.createdAt,
          title: execution.tool,
          type: "execution",
          status: execution.status,
          bucket: "completed",
          description: execution.summary,
        })
      })
    }

    return entries.reverse()
  }, [messages])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return allEntries.filter(entry => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false
      if (statusFilter !== "all" && entry.status !== statusFilter) return false
      if (!normalizedQuery) return true

      return `${entry.title} ${entry.type} ${entry.status} ${entry.description || ""}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [allEntries, query, statusFilter, typeFilter])

  const draftEntries = useMemo(
    () => filteredEntries.filter(entry => entry.bucket === "draft"),
    [filteredEntries]
  )
  const completedEntries = useMemo(
    () => filteredEntries.filter(entry => entry.bucket === "completed"),
    [filteredEntries]
  )

  const statusValues = useMemo(() => {
    const unique = new Set(allEntries.map(entry => entry.status))
    return ["all", ...[...unique].sort()]
  }, [allEntries])

  useGSAP(() => {
    if (!containerRef.current) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const cards = containerRef.current.querySelectorAll("[data-card-entry]")
    if (cards.length === 0) return

    gsap.fromTo(
      cards,
      { y: 12, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.26,
        ease: "power2.out",
        stagger: 0.02,
      }
    )
  }, [filteredEntries.length])

  return (
    <aside className="h-full min-h-0 rounded-2xl border border-border/70 bg-gradient-to-b from-card/90 to-card/65 backdrop-blur-md p-3 lg:p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13px] font-semibold tracking-tight">Shared Cards</h3>
        <span className="text-[11px] text-muted-foreground">{filteredEntries.length}</span>
      </div>

      <div className="space-y-2 mb-3 sticky top-0 z-10 bg-card/80 backdrop-blur-sm pb-2">
        <label className="relative block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Search cards"
            className="w-full rounded-lg border bg-background/85 pl-8 pr-2 py-2 text-[11px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={typeFilter}
            onChange={event => onTypeFilterChange(event.target.value)}
            className="rounded-lg border bg-background/85 px-2 py-2 text-[11px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            <option value="all">All types</option>
            <option value="text">Text</option>
            <option value="stats">Stats</option>
            <option value="list">List</option>
            <option value="entity">Entity</option>
            <option value="budget">Budget</option>
            <option value="action">Action</option>
            <option value="confirm">Confirm</option>
            <option value="execution">Execution</option>
          </select>
          <select
            value={statusFilter}
            onChange={event => onStatusFilterChange(event.target.value)}
            className="rounded-lg border bg-background/85 px-2 py-2 text-[11px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            {statusValues.map(value => (
              <option key={`status-${value}`} value={value}>
                {value === "all" ? "All status" : value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={containerRef} className="h-[calc(100%-7.5rem)] overflow-y-auto pr-1 space-y-3.5">
        {filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-[11px] text-muted-foreground">
            No cards or actions match your filters.
          </div>
        ) : (
          <>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground inline-flex items-center gap-1">
                  <CircleDashed className="w-3 h-3" />
                  Drafts
                </p>
                <span className="text-[10px] text-muted-foreground">{draftEntries.length}</span>
              </div>
              <div className="space-y-2">
                {draftEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-2 text-[11px] text-muted-foreground">
                    No draft cards pending.
                  </div>
                ) : (
                  draftEntries.map(entry => (
                    <EntryButton key={entry.key} entry={entry} onJumpToMessage={onJumpToMessage} />
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed Actions
                </p>
                <span className="text-[10px] text-muted-foreground">{completedEntries.length}</span>
              </div>
              <div className="space-y-2">
                {completedEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-2 text-[11px] text-muted-foreground">
                    No completed actions yet.
                  </div>
                ) : (
                  completedEntries.map(entry => (
                    <EntryButton key={entry.key} entry={entry} onJumpToMessage={onJumpToMessage} />
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  )
}
