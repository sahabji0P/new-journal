"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { AlertCircle, CheckCircle2, CircleDot, Lightbulb, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/contexts/AppContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/types"
import {
  SaathiAssistantMetadataSchema,
  type SaathiCard,
  type SaathiToolCall,
} from "@/lib/saathi/schema"
import { TransactionFormModern } from "@/components/transactions/TransactionFormModern"

gsap.registerPlugin(useGSAP)

interface SaathiMessageCardsProps {
  metadata: unknown
  onSuggestedPrompt?: (prompt: string) => void
  onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
  onUnresolvedCountChange?: (count: number) => void
}

interface CardNavigationLink {
  href: string
  label: string
}

function statusBadgeClass(status: "info" | "draft" | "created" | "updated" | "deleted" | "error") {
  if (status === "created" || status === "updated") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (status === "deleted") return "text-slate-700 bg-slate-100 border-slate-300"
  if (status === "error") return "text-red-700 bg-red-50 border-red-200"
  if (status === "draft") return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-muted-foreground bg-muted border-border"
}

function riskBadgeClass(level: "low" | "medium" | "high") {
  if (level === "high") return "text-red-700 bg-red-50 border-red-200"
  if (level === "medium") return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-emerald-700 bg-emerald-50 border-emerald-200"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function parseAmountValue(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, "")
  if (!cleaned) return null
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.abs(parsed)
}

function normalizeFieldValue(value: string | undefined): string {
  if (!value) return ""
  if (value.trim().toLowerCase() === "missing") return ""
  return value.trim()
}

function getFieldValue(card: Extract<SaathiCard, { type: "entity" }>, label: string): string {
  const found = card.fields.find(field => field.label.trim().toLowerCase() === label.toLowerCase())
  return found?.value || ""
}

type TransactionDraftMode = "create" | "update"

const TRANSACTION_FIELD_ALIASES = {
  draftMode: ["draft mode", "mode"],
  transactionId: ["transaction id", "txn id", "tx id", "id"],
  description: ["description", "desc", "details", "narration", "item", "what"],
  amount: ["amount", "amt", "value", "sum", "cost", "price", "total"],
  type: ["type", "direction", "kind"],
  category: ["category", "cat", "bucket", "group"],
  account: ["account", "account name", "source", "payment source", "payment method", "wallet", "bank", "mode of payment"],
  date: ["date", "transaction date", "when", "date & time", "datetime", "time"],
  party: ["party", "payee", "payer", "merchant", "vendor", "counterparty"],
  updateFields: ["update fields", "changed fields", "changes"],
  currentSnapshot: ["current snapshot", "snapshot", "original snapshot", "before snapshot"],
} as const

function normalizeFieldLabelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getFieldValueByAliases(
  card: Extract<SaathiCard, { type: "entity" }>,
  aliases: readonly string[]
): string {
  if (!aliases.length) return ""
  const aliasSet = new Set(aliases.map(alias => normalizeFieldLabelKey(alias)))

  const exact = card.fields.find(field => aliasSet.has(normalizeFieldLabelKey(field.label)))
  if (exact) return exact.value

  const loose = card.fields.find(field => {
    const labelKey = normalizeFieldLabelKey(field.label)
    for (const alias of aliasSet) {
      if (labelKey.includes(alias) || alias.includes(labelKey)) return true
    }
    return false
  })

  return loose?.value || ""
}

function parseQuickEntryValue(raw: string): { amount: number | null; description: string } {
  const value = raw.trim()
  if (!value) return { amount: null, description: "" }

  const arrowMatch = value.match(/^([+\-]?\s*[\d,.]+)\s*(?:->|=>|to|for|:)\s*(.+)$/i)
  if (arrowMatch) {
    return {
      amount: parseAmountValue(arrowMatch[1]),
      description: arrowMatch[2].trim(),
    }
  }

  const leadingAmountMatch = value.match(/^([+\-]?\s*[\d,.]+)\s+(.+)$/)
  if (leadingAmountMatch) {
    return {
      amount: parseAmountValue(leadingAmountMatch[1]),
      description: leadingAmountMatch[2].trim(),
    }
  }

  const trailingAmountMatch = value.match(/^(.+)\s+([+\-]?\s*[\d,.]+)$/)
  if (trailingAmountMatch) {
    return {
      amount: parseAmountValue(trailingAmountMatch[2]),
      description: trailingAmountMatch[1].trim(),
    }
  }

  return { amount: parseAmountValue(value), description: "" }
}

interface TransactionDraftSnapshot {
  description: string
  amount: number | null
  type: "income" | "expense"
  category: string
  account: string
  date: string
  party: string
}

function normalizeDateInputValue(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  return parsed.toISOString().slice(0, 10)
}

function parseTransactionDraftSnapshot(value: string): TransactionDraftSnapshot | null {
  if (!value.trim()) return null
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return {
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
      amount: typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
        ? Math.abs(parsed.amount)
        : null,
      type: parsed.type === "income" ? "income" : "expense",
      category: typeof parsed.category === "string" ? parsed.category.trim() : "",
      account: typeof parsed.account === "string" ? parsed.account.trim() : "",
      date: normalizeDateInputValue(typeof parsed.date === "string" ? parsed.date : ""),
      party: typeof parsed.party === "string" ? parsed.party.trim() : "",
    }
  } catch {
    return null
  }
}

function extractTransactionDraftData(
  card: Extract<SaathiCard, { type: "entity" }>,
  knownAccountNames: string[] = []
): {
  draftMode: TransactionDraftMode
  transactionId: string
  description: string
  amount: number | null
  type: "income" | "expense"
  hasExplicitType: boolean
  category: string
  accountName: string
  date: string
  party: string
  updateFieldsSummary: string
  currentSnapshot: TransactionDraftSnapshot | null
} {
  const allKnownLabels = new Set(
    Object.values(TRANSACTION_FIELD_ALIASES)
      .flat()
      .map(label => normalizeFieldLabelKey(label))
  )

  const draftMode = getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.draftMode).toLowerCase().includes("update")
    ? "update"
    : "create"
  const transactionId = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.transactionId))
  let description = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.description))
  let amount = parseAmountValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.amount))
  const amountRaw = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.amount))
  const typeRaw = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.type)).toLowerCase()
  const category = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.category))
  let accountName = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.account))
  let date = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.date))
  let party = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.party))
  const updateFieldsSummary = normalizeFieldValue(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.updateFields))
  const currentSnapshot = parseTransactionDraftSnapshot(getFieldValueByAliases(card, TRANSACTION_FIELD_ALIASES.currentSnapshot))

  const knownAccounts = new Set(knownAccountNames.map(name => normalizeFieldLabelKey(name)))
  for (const field of card.fields) {
    const labelKey = normalizeFieldLabelKey(field.label)
    if (!labelKey || allKnownLabels.has(labelKey)) continue

    const quickParsed = parseQuickEntryValue(field.value)
    const isKnownAccountLabel = knownAccounts.has(labelKey)

    if (!accountName && (isKnownAccountLabel || quickParsed.amount !== null)) {
      accountName = normalizeFieldValue(field.label)
    }
    if (amount === null && quickParsed.amount !== null) {
      amount = quickParsed.amount
    }
    if (!description && quickParsed.description) {
      description = quickParsed.description
    }
    if (!party && !isKnownAccountLabel && quickParsed.amount === null && field.value.trim()) {
      party = normalizeFieldValue(field.value)
    }
  }

  if (!description) {
    const titleCandidate = card.title.replace(/^editable\s+draft\s+transaction\s*(update)?\s*/i, "").trim()
    if (titleCandidate && !/^pending transaction/i.test(titleCandidate)) {
      description = titleCandidate.replace(/^[:\-]\s*/, "")
    }
  }

  const titleQuick = card.title.match(/^([^:]+):\s*([+\-]?\s*[\d,.]+)\s*(?:->|=>|to|for)\s*(.+)$/i)
  if (titleQuick) {
    if (!accountName) accountName = normalizeFieldValue(titleQuick[1])
    if (amount === null) amount = parseAmountValue(titleQuick[2])
    if (!description) description = normalizeFieldValue(titleQuick[3])
  }

  const inferredType = amountRaw.startsWith("+")
    ? "income"
    : amountRaw.startsWith("-")
      ? "expense"
      : typeRaw.includes("income")
        ? "income"
        : "expense"
  const type: "income" | "expense" = inferredType
  const hasExplicitType = Boolean(typeRaw || amountRaw.startsWith("+") || amountRaw.startsWith("-"))

  if (!date) {
    date = new Date().toISOString().slice(0, 10)
  }

  return {
    draftMode,
    transactionId,
    description,
    amount,
    type,
    hasExplicitType,
    category,
    accountName,
    date: normalizeDateInputValue(date),
    party,
    updateFieldsSummary,
    currentSnapshot,
  }
}

function isSameTextValue(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function normalizeDateIsoValue(input: string): string | null {
  const value = input.trim()
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T12:00:00.000Z`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function normalizeDateDayValue(input: string): string | null {
  const isoValue = normalizeDateIsoValue(input)
  if (!isoValue) return null
  return isoValue.slice(0, 10)
}

function dedupeToolRequests(toolRequests: SaathiToolCall[]): SaathiToolCall[] {
  const deduped: SaathiToolCall[] = []
  const signatures = new Set<string>()

  for (const toolRequest of toolRequests) {
    const signature = `${toolRequest.tool}|${JSON.stringify(toolRequest.input)}`
    if (signatures.has(signature)) continue
    signatures.add(signature)
    deduped.push(toolRequest)
  }

  return deduped
}

function isCardActionable(card: SaathiCard): boolean {
  if (card.type === "confirm") return true
  if (card.type === "entity" && card.status === "draft") return true
  return false
}

function getCardNavigationLink(card: SaathiCard): CardNavigationLink | null {
  const linkCarrier = card as { href?: unknown; hrefLabel?: unknown }
  if (typeof linkCarrier.href !== "string" || !linkCarrier.href.trim()) return null

  const label = typeof linkCarrier.hrefLabel === "string" && linkCarrier.hrefLabel.trim()
    ? linkCarrier.hrefLabel.trim()
    : "Open"

  return {
    href: linkCarrier.href,
    label,
  }
}

function buildDraftToolRequestsFromCard(card: Extract<SaathiCard, { type: "entity" }>): SaathiToolCall[] {
  if (card.status !== "draft") return []

  if (card.entityType === "category") {
    const name = normalizeFieldValue(getFieldValue(card, "Name"))
    if (!name) return []

    const rawType = normalizeFieldValue(getFieldValue(card, "Type")).toLowerCase()
    const type = rawType.includes("income")
      ? "income"
      : rawType.includes("both")
        ? "both"
        : "expense"

    return [{
      tool: "create_category",
      rationale: "Bulk apply from draft category cards",
      input: {
        name,
        type,
      },
    }]
  }

  if (card.entityType !== "transaction") return []

  const draft = extractTransactionDraftData(card)

  if (draft.draftMode === "update") {
    if (!draft.transactionId) return []

    const currentSnapshot = draft.currentSnapshot
    const updates: Record<string, unknown> = {}

    if (draft.description && (!currentSnapshot || draft.description !== currentSnapshot.description)) {
      updates.description = draft.description
    }

    if (draft.amount && (!currentSnapshot || currentSnapshot.amount === null || Math.abs(draft.amount - currentSnapshot.amount) > 0.0001)) {
      updates.amount = draft.amount
    }

    if (!currentSnapshot || draft.type !== currentSnapshot.type) {
      updates.type = draft.type
    }

    if (draft.category && (!currentSnapshot || !isSameTextValue(draft.category, currentSnapshot.category))) {
      updates.category = draft.category
    }

    if (draft.accountName && (!currentSnapshot || !isSameTextValue(draft.accountName, currentSnapshot.account))) {
      updates.accountName = draft.accountName
    }

    const proposedDate = normalizeDateDayValue(draft.date)
    const currentDate = currentSnapshot ? normalizeDateDayValue(currentSnapshot.date) : null
    if (proposedDate && proposedDate !== currentDate) {
      updates.date = `${proposedDate}T12:00:00.000Z`
    }

    if (currentSnapshot) {
      if (draft.party !== currentSnapshot.party.trim()) {
        updates.party = draft.party
      }
    } else if (draft.party) {
      updates.party = draft.party
    }

    if (Object.keys(updates).length === 0) return []

    return [{
      tool: "update_transaction",
      rationale: "Bulk apply from draft transaction update cards",
      input: {
        transactionId: draft.transactionId,
        updates,
      },
    }]
  }

  if (!draft.description || !draft.amount || !draft.category || !draft.accountName) return []

  return [{
    tool: "create_transaction",
    rationale: "Bulk apply from draft transaction cards",
    input: {
      description: draft.description,
      amount: draft.amount,
      type: draft.type,
      category: draft.category,
      accountName: draft.accountName,
      date: normalizeDateIsoValue(draft.date) || `${new Date().toISOString().slice(0, 10)}T12:00:00.000Z`,
      ...(draft.party ? { party: draft.party } : {}),
    },
  }]
}

function resolveEntityTransactionId(card: Extract<SaathiCard, { type: "entity" }>): string {
  const entityId = normalizeFieldValue(card.entityId || "")
  if (entityId) return entityId

  const fieldId = normalizeFieldValue(getFieldValue(card, "Transaction ID"))
  if (fieldId) return fieldId

  return normalizeFieldValue(getFieldValue(card, "ID"))
}

function parseEntityTransactionType(card: Extract<SaathiCard, { type: "entity" }>): "income" | "expense" {
  const typeValue = normalizeFieldValue(getFieldValue(card, "Type")).toLowerCase()
  if (typeValue.includes("income")) return "income"
  if (typeValue.includes("expense")) return "expense"

  const amountValue = normalizeFieldValue(getFieldValue(card, "Amount"))
  if (amountValue.startsWith("+")) return "income"
  return "expense"
}

function InteractiveTransactionEntityCard({
  card,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
}) {
  const { transactions, accounts } = useApp()
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorFocusSection, setEditorFocusSection] = useState<"general" | "split">("general")
  const [editorSeed, setEditorSeed] = useState(0)
  const [error, setError] = useState("")
  const infoLink = getCardNavigationLink(card)

  const transactionId = useMemo(() => resolveEntityTransactionId(card), [card])
  const targetTransaction = useMemo(
    () => (transactionId ? transactions.find(item => item.id === transactionId) || null : null),
    [transactionId, transactions]
  )
  const description = normalizeFieldValue(getFieldValue(card, "Description")) || normalizeFieldValue(card.title)
  const amount = parseAmountValue(getFieldValue(card, "Amount"))
  const type = targetTransaction?.type || parseEntityTransactionType(card)
  const category = normalizeFieldValue(getFieldValue(card, "Category"))
  const accountName = normalizeFieldValue(getFieldValue(card, "Account")) || normalizeFieldValue(getFieldValue(card, "Account Name"))
  const date = normalizeDateInputValue(normalizeFieldValue(getFieldValue(card, "Date")))
  const party = normalizeFieldValue(getFieldValue(card, "Party"))
  const matchedAccount = useMemo(
    () => accounts.find(item => isSameTextValue(item.name, accountName)),
    [accountName, accounts]
  )
  const fallbackPrefill = useMemo<Partial<Transaction>>(
    () => ({
      description,
      amount: type === "expense" ? -Math.abs(amount || 0) : Math.abs(amount || 0),
      type,
      category,
      accountId: matchedAccount?.id || "",
      accountName: matchedAccount?.name || accountName,
      date: `${date}T12:00:00.000Z`,
      ...(party ? { party } : {}),
    }),
    [accountName, amount, category, date, description, matchedAccount?.id, matchedAccount?.name, party, type]
  )
  const isDeleted = card.status === "deleted"
  const canSplit = !isDeleted && type === "expense"

  const openEditor = (section: "general" | "split") => {
    if (isDeleted) {
      setError("Deleted transactions cannot be edited.")
      return
    }
    setError("")
    setEditorFocusSection(section)
    setEditorSeed(previous => previous + 1)
    setIsEditorOpen(true)
  }

  const handleEditorSubmit = () => {
    setIsEditorOpen(false)
    setError("")
  }

  return (
    <>
      <Card className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
              {card.status}
            </span>
          </div>
          <CardDescription className="capitalize">
            {card.entityType}
            {transactionId ? ` • ${transactionId}` : card.entityId ? ` • ${card.entityId}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3.5">
          <div className="space-y-1">
            {card.fields.map((field, fieldIndex) => (
              <div key={`field-${fieldIndex}`} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground uppercase tracking-wide">{field.label}</span>
                <span className="text-right font-medium text-[12px]">{field.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditor("general")}
                disabled={isDeleted}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditor("split")}
                disabled={!canSplit}
              >
                Split
              </Button>
            </div>

            {infoLink && (
              <Button size="sm" variant="outline" asChild>
                <Link href={infoLink.href}>{infoLink.label}</Link>
              </Button>
            )}
          </div>

          {transactionId && !targetTransaction && !isDeleted && (
            <p className="mt-2 text-[11px] text-amber-700">
              Live transaction was not found. Opening with card details as a prefill.
            </p>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-h-[95vh] overflow-y-auto p-2 sm:max-w-4xl sm:p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Use the standard transaction editor with split support.
            </DialogDescription>
          </DialogHeader>

          {targetTransaction ? (
            <TransactionFormModern
              key={`saathi-entity-edit-${targetTransaction.id}-${editorSeed}`}
              mode="edit"
              initial={targetTransaction}
              focusSection={editorFocusSection}
              onSubmit={handleEditorSubmit}
              onCancel={() => setIsEditorOpen(false)}
            />
          ) : (
            <TransactionFormModern
              key={`saathi-entity-prefill-${transactionId || card.title}-${editorSeed}`}
              mode="add"
              prefill={fallbackPrefill}
              focusSection={editorFocusSection}
              onSubmit={handleEditorSubmit}
              onCancel={() => setIsEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function DraftTransactionCard({
  card,
  onResolved,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
  onResolved?: () => void
}) {
  const { transactions, accounts } = useApp()
  const [formSeed, setFormSeed] = useState(0)
  const [error, setError] = useState("")
  const accountNames = useMemo(() => accounts.map(item => item.name), [accounts])
  const draft = useMemo(
    () => extractTransactionDraftData(card, accountNames),
    [accountNames, card]
  )

  const targetTransaction = useMemo(
    () => (
      draft.draftMode === "update" && draft.transactionId
        ? transactions.find(item => item.id === draft.transactionId) || null
        : null
    ),
    [draft.draftMode, draft.transactionId, transactions]
  )

  const matchedAccount = useMemo(
    () => (draft.accountName ? accounts.find(item => isSameTextValue(item.name, draft.accountName)) : undefined),
    [accounts, draft.accountName]
  )

  const prefill = useMemo<Partial<Transaction>>(
    () => ({
      description: draft.description,
      amount: draft.amount !== null
        ? (draft.type === "expense" ? -Math.abs(draft.amount) : Math.abs(draft.amount))
        : undefined,
      type: draft.type,
      category: draft.category,
      accountId: matchedAccount?.id || "",
      accountName: matchedAccount?.name || draft.accountName,
      date: `${draft.date}T12:00:00.000Z`,
      ...(draft.party ? { party: draft.party } : {}),
    }),
    [draft, matchedAccount?.id, matchedAccount?.name]
  )

  const updateInitial = useMemo<Transaction | null>(() => {
    if (!targetTransaction) return null

    const nextType = draft.hasExplicitType ? draft.type : targetTransaction.type
    const nextAmount = draft.amount !== null
      ? (nextType === "expense" ? -Math.abs(draft.amount) : Math.abs(draft.amount))
      : targetTransaction.amount

    return {
      ...targetTransaction,
      description: draft.description || targetTransaction.description,
      amount: nextAmount,
      type: nextType,
      category: draft.category || targetTransaction.category,
      accountId: matchedAccount?.id || targetTransaction.accountId,
      accountName: matchedAccount?.name || draft.accountName || targetTransaction.accountName,
      date: draft.date ? `${draft.date}T12:00:00.000Z` : targetTransaction.date,
      party: draft.party || targetTransaction.party,
    }
  }, [draft, matchedAccount?.id, matchedAccount?.name, targetTransaction])

  const handleSubmit = () => {
    setError("")
    onResolved?.()
  }

  const handleCancel = () => {
    setError("")
    setFormSeed(previous => previous + 1)
  }

  return (
    <Card className="gap-2.5 py-3.5 border-amber-300/70 bg-amber-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="px-3.5 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[13px] tracking-tight">
            {draft.draftMode === "update" ? "Draft Transaction Update" : "Draft Transaction"}
          </CardTitle>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
            {card.status}
          </span>
        </div>
        <CardDescription className="text-[11px]">
          {draft.draftMode === "update" && draft.transactionId
            ? `Target transaction: ${draft.transactionId}`
            : "Review and submit this draft transaction"}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-2 sm:px-3.5">
        {draft.updateFieldsSummary && draft.updateFieldsSummary.toLowerCase() !== "none" && (
          <p className="mb-2 text-[11px] text-muted-foreground">
            Suggested fields: {draft.updateFieldsSummary}
          </p>
        )}

        {draft.draftMode === "update" && !updateInitial && (
          <p className="mb-2 text-[11px] text-amber-700">
            Target transaction was not found. You can still review/edit the prefilled values and create a new entry.
          </p>
        )}

        {error && (
          <p className="mb-2 text-xs text-red-600">{error}</p>
        )}

        {draft.draftMode === "update" && updateInitial ? (
          <TransactionFormModern
            key={`saathi-draft-update-${card.title}-${formSeed}`}
            mode="edit"
            initial={updateInitial}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        ) : (
          <TransactionFormModern
            key={`saathi-draft-create-${card.title}-${formSeed}`}
            mode="add"
            prefill={prefill}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </CardContent>
    </Card>
  )
}

function DraftCategoryCard({
  card,
  onResolved,
  onExecuteToolRequests,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
  onResolved?: () => void
  onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
}) {
  const [name, setName] = useState(normalizeFieldValue(getFieldValue(card, "Name")))
  const [type, setType] = useState<"income" | "expense" | "both">(
    normalizeFieldValue(getFieldValue(card, "Type")).toLowerCase().includes("income")
      ? "income"
      : normalizeFieldValue(getFieldValue(card, "Type")).toLowerCase().includes("both")
        ? "both"
        : "expense"
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!onExecuteToolRequests || !name.trim()) return
    setIsSubmitting(true)
    try {
      await onExecuteToolRequests({
        toolRequests: [{
          tool: "create_category",
          rationale: "Create category from editable draft card",
          input: {
            name: name.trim(),
            type,
          },
        }],
        userMessage: `Create category ${name.trim()}`,
      })
      setError("")
      onResolved?.()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create category. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="gap-2.5 py-3.5 border-amber-300/70 bg-amber-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="px-3.5 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[13px] tracking-tight">Editable Draft Category</CardTitle>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
            {card.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-3.5 space-y-2">
        <div>
          <label className="text-[11px] text-muted-foreground">Category name</label>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">Type</label>
          <select
            value={type}
            onChange={event => {
              const value = event.target.value
              if (value === "income" || value === "both") {
                setType(value)
                return
              }
              setType("expense")
            }}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="transition-all duration-200 hover:-translate-y-0.5"
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim() || !onExecuteToolRequests}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Create Category
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function renderCard(
  card: SaathiCard,
  cardKey: string,
  {
    onSuggestedPrompt,
    onExecuteToolRequests,
    onResolveCard,
  }: {
    onSuggestedPrompt?: (prompt: string) => void
    onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
    onResolveCard: (cardKey: string) => void
  }
) {
  if (card.type === "text") {
    const infoLink = getCardNavigationLink(card)
    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          {card.title && <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>}
        </CardHeader>
        <CardContent className="px-3.5">
          <p className="text-[13px] leading-6 whitespace-pre-wrap">{card.body}</p>
          {infoLink && (
            <div className="mt-2.5 flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={infoLink.href}>{infoLink.label}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (card.type === "stats") {
    const infoLink = getCardNavigationLink(card)
    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {card.stats.map((stat, statIndex) => (
              <div key={`stat-${statIndex}`} className="rounded-lg border p-2">
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p
                  className={cn(
                    "text-[13px] font-semibold mt-0.5 tracking-tight",
                    stat.tone === "good" && "text-emerald-600",
                    stat.tone === "warn" && "text-amber-600"
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {infoLink && (
            <div className="mt-2.5 flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={infoLink.href}>{infoLink.label}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (card.type === "list") {
    const infoLink = getCardNavigationLink(card)
    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-3.5">
          <ul className="space-y-1.5">
            {card.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`} className="rounded-lg border p-2">
                <p className="text-[13px] font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
          {infoLink && (
            <div className="mt-2.5 flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={infoLink.href}>{infoLink.label}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (card.type === "entity" && card.status === "draft" && card.entityType === "transaction") {
    return (
      <DraftTransactionCard
        key={cardKey}
        card={card}
        onResolved={() => onResolveCard(cardKey)}
      />
    )
  }

  if (card.type === "entity" && card.status === "draft" && card.entityType === "category") {
    return (
      <DraftCategoryCard
        key={cardKey}
        card={card}
        onResolved={() => onResolveCard(cardKey)}
        onExecuteToolRequests={onExecuteToolRequests}
      />
    )
  }

  if (card.type === "entity" && card.entityType === "transaction") {
    return (
      <InteractiveTransactionEntityCard
        key={cardKey}
        card={card}
      />
    )
  }

  if (card.type === "entity") {
    const infoLink = getCardNavigationLink(card)

    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
              {card.status}
            </span>
          </div>
          <CardDescription className="capitalize">
            {card.entityType}
            {card.entityId ? ` • ${card.entityId}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3.5">
          <div className="space-y-1">
            {card.fields.map((field, fieldIndex) => (
              <div key={`field-${fieldIndex}`} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground uppercase tracking-wide">{field.label}</span>
                <span className="text-right font-medium text-[12px]">{field.value}</span>
              </div>
            ))}
          </div>
          {infoLink && (
            <div className="mt-2.5 flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={infoLink.href}>{infoLink.label}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (card.type === "budget") {
    const infoLink = getCardNavigationLink(card)
    const width = Math.max(0, Math.min(100, card.usagePercent))
    const overBudget = card.remaining < 0
    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <CardTitle className="text-[13px] tracking-tight">{card.name}</CardTitle>
          <CardDescription className="text-[11px]">Budget progress</CardDescription>
        </CardHeader>
        <CardContent className="px-3.5">
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", overBudget ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground">Allocated</p>
                <p className="font-medium">{formatCurrency(card.allocated)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Spent</p>
                <p className="font-medium">{formatCurrency(card.spent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className={cn("font-medium", overBudget && "text-red-600")}>
                  {formatCurrency(card.remaining)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Usage</p>
                <p className="font-medium">{card.usagePercent.toFixed(1)}%</p>
              </div>
            </div>
            {infoLink && (
              <div className="mt-2.5 flex justify-end">
                <Button size="sm" variant="outline" asChild>
                  <Link href={infoLink.href}>{infoLink.label}</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "confirm") {
    return (
      <Card key={cardKey} className="gap-2.5 py-3.5 border-red-300/70 bg-red-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", riskBadgeClass(card.riskLevel))}>
              {card.riskLevel} risk
            </span>
          </div>
          <CardDescription>{card.body}</CardDescription>
        </CardHeader>
        <CardContent className="px-3.5">
          {card.preview.length > 0 && (
            <ul className="space-y-1 mb-2.5">
              {card.preview.map((line, previewIndex) => (
                <li key={`preview-${previewIndex}`} className="text-[11px] text-muted-foreground rounded-md border bg-background/80 px-2 py-1">
                  {line}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="transition-transform duration-200 hover:-translate-y-0.5"
              onClick={() => {
                const execution = onExecuteToolRequests?.({
                  toolRequests: card.confirmToolRequests,
                  userMessage: `Confirm action: ${card.title}`,
                })
                if (execution instanceof Promise) {
                  void execution
                    .then(() => onResolveCard(cardKey))
                    .catch(error => {
                    console.error("Failed to execute confirm action:", error)
                    })
                  return
                }
                onResolveCard(cardKey)
              }}
              disabled={!onExecuteToolRequests}
            >
              Go Ahead
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="transition-transform duration-200 hover:-translate-y-0.5"
              onClick={() => {
                if (card.suggestChangesPrompt && onSuggestedPrompt) {
                  onSuggestedPrompt(card.suggestChangesPrompt)
                }
              }}
              disabled={!card.suggestChangesPrompt || !onSuggestedPrompt}
            >
              Suggest Changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="transition-transform duration-200 hover:-translate-y-0.5"
              onClick={() => {
                if (card.cancelSuggestedPrompt && onSuggestedPrompt) {
                  onSuggestedPrompt(card.cancelSuggestedPrompt)
                }
              }}
              disabled={!card.cancelSuggestedPrompt || !onSuggestedPrompt}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card key={cardKey} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="px-3.5 pb-0">
        <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>
        {card.description && <CardDescription>{card.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-3.5">
        <div className="flex flex-wrap gap-2">
          {card.actions.map((action, actionIndex) => {
            if (action.href) {
              return (
                <Button key={`action-${actionIndex}`} size="sm" variant={action.variant || "default"} asChild>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              )
            }

            if (action.suggestedPrompt && onSuggestedPrompt) {
              return (
                <Button
                  key={`action-${actionIndex}`}
                  size="sm"
                  variant={action.variant || "outline"}
                  onClick={() => onSuggestedPrompt(action.suggestedPrompt as string)}
                >
                  {action.label}
                </Button>
              )
            }

            return (
              <Button key={`action-${actionIndex}`} size="sm" variant={action.variant || "secondary"} disabled>
                {action.label}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SaathiMessageCards({
  metadata,
  onSuggestedPrompt,
  onExecuteToolRequests,
  onUnresolvedCountChange,
}: SaathiMessageCardsProps) {
  const parsed = useMemo(() => SaathiAssistantMetadataSchema.safeParse(metadata), [metadata])
  const containerRef = useRef<HTMLDivElement>(null)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [bulkError, setBulkError] = useState("")
  const [resolvedCardKeys, setResolvedCardKeys] = useState<string[]>([])
  const cards = useMemo(() => (parsed.success ? parsed.data.cards : []), [parsed])
  const executedToolCount = parsed.success ? parsed.data.executedTools.length : 0
  const cardEntries = useMemo(
    () => cards.map((card, index) => ({ key: `card-${index}`, card })),
    [cards]
  )

  useEffect(() => {
    setResolvedCardKeys(previous => previous.filter(cardKey => cardEntries.some(entry => entry.key === cardKey)))
  }, [cardEntries])

  const markCardResolved = useCallback((cardKey: string) => {
    setResolvedCardKeys(previous => (previous.includes(cardKey) ? previous : [...previous, cardKey]))
  }, [])

  const visibleEntries = useMemo(
    () => cardEntries.filter(entry => !resolvedCardKeys.includes(entry.key)),
    [cardEntries, resolvedCardKeys]
  )
  const unresolvedEntries = useMemo(
    () => visibleEntries.filter(entry => (
      (entry.card.type === "entity" && entry.card.status === "draft") || entry.card.type === "confirm"
    )),
    [visibleEntries]
  )
  const [stackOrder, setStackOrder] = useState<string[]>([])
  const [cardOffsets, setCardOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingCardKey, setDraggingCardKey] = useState<string | null>(null)
  const dragSessionRef = useRef<{
    cleanup: () => void
  } | null>(null)
  useEffect(() => {
    const visibleKeys = visibleEntries.map(entry => entry.key)
    setStackOrder(previous => {
      const kept = previous.filter(key => visibleKeys.includes(key))
      const appended = visibleKeys.filter(key => !kept.includes(key))
      return [...kept, ...appended]
    })
    setCardOffsets(previous => {
      const next: Record<string, { x: number; y: number }> = {}
      for (const key of visibleKeys) {
        next[key] = previous[key] || { x: 0, y: 0 }
      }
      return next
    })
  }, [visibleEntries])

  useEffect(() => {
    return () => {
      dragSessionRef.current?.cleanup()
      dragSessionRef.current = null
    }
  }, [])

  const orderedVisibleEntries = useMemo(() => {
    if (visibleEntries.length === 0) return []

    const map = new Map(visibleEntries.map(entry => [entry.key, entry]))
    const ordered: typeof visibleEntries = []
    for (const key of stackOrder) {
      const found = map.get(key)
      if (found) ordered.push(found)
    }
    for (const entry of visibleEntries) {
      if (!ordered.some(item => item.key === entry.key)) {
        ordered.push(entry)
      }
    }
    return ordered
  }, [stackOrder, visibleEntries])

  const bringCardToFront = useCallback((cardKey: string) => {
    setStackOrder(previous => {
      const index = previous.indexOf(cardKey)
      if (index <= 0) return previous
      const next = [...previous]
      next.splice(index, 1)
      next.unshift(cardKey)
      return next
    })
  }, [])

  const resetCardOffset = useCallback((cardKey: string) => {
    setCardOffsets(previous => ({
      ...previous,
      [cardKey]: { x: 0, y: 0 },
    }))
  }, [])

  const startDraggingCard = useCallback((event: ReactPointerEvent<HTMLButtonElement>, cardKey: string) => {
    event.preventDefault()
    event.stopPropagation()
    bringCardToFront(cardKey)
    const offset = cardOffsets[cardKey] || { x: 0, y: 0 }
    const startX = event.clientX
    const startY = event.clientY
    setDraggingCardKey(cardKey)

    const handleMove = (moveEvent: PointerEvent) => {
      setCardOffsets(previous => ({
        ...previous,
        [cardKey]: {
          x: offset.x + (moveEvent.clientX - startX),
          y: offset.y + (moveEvent.clientY - startY),
        },
      }))
    }

    const handleFinish = () => {
      const active = dragSessionRef.current
      if (active) {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleFinish)
        window.removeEventListener("pointercancel", handleFinish)
      }
      dragSessionRef.current = null
      setDraggingCardKey(null)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleFinish)
    window.addEventListener("pointercancel", handleFinish)
    dragSessionRef.current = {
      cleanup: handleFinish,
    }
  }, [bringCardToFront, cardOffsets])

  const bulkActionData = useMemo(() => {
    const actionableTitles: string[] = []
    const actionableCardKeys: string[] = []
    const toolRequests: SaathiToolCall[] = []

    for (const entry of visibleEntries) {
      const card = entry.card
      if (card.type === "confirm") {
        if (card.confirmToolRequests.length === 0) continue
        actionableTitles.push(card.title)
        actionableCardKeys.push(entry.key)
        toolRequests.push(...card.confirmToolRequests)
        continue
      }

      if (card.type === "entity" && card.status === "draft" && (card.entityType === "transaction" || card.entityType === "category")) {
        const draftToolRequests = buildDraftToolRequestsFromCard(card)
        if (draftToolRequests.length === 0) continue
        actionableTitles.push(card.title)
        actionableCardKeys.push(entry.key)
        toolRequests.push(...draftToolRequests)
      }
    }

    const deduped = dedupeToolRequests(toolRequests)
    const maxBatchSize = 8
    return {
      actionableCount: actionableTitles.length,
      actionableTitles,
      actionableCardKeys,
      executableToolRequests: deduped.slice(0, maxBatchSize),
      hasOverflow: deduped.length > maxBatchSize,
    }
  }, [visibleEntries])
  const showBulkAction = bulkActionData.actionableCount > 1 && bulkActionData.executableToolRequests.length > 1

  const handleBulkApply = async () => {
    if (!onExecuteToolRequests || isBulkSubmitting || bulkActionData.executableToolRequests.length === 0) return

    setBulkError("")
    setIsBulkSubmitting(true)
    try {
      await onExecuteToolRequests({
        toolRequests: bulkActionData.executableToolRequests,
        userMessage: `Bulk confirm ${bulkActionData.executableToolRequests.length} pending changes`,
      })
      setResolvedCardKeys(previous => {
        const merged = new Set(previous)
        for (const cardKey of bulkActionData.actionableCardKeys) {
          merged.add(cardKey)
        }
        return [...merged]
      })
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Could not apply bulk changes.")
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  useGSAP(() => {
    if (!parsed.success || !containerRef.current) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const nodes = containerRef.current.querySelectorAll("[data-saathi-inline-card]")
    if (nodes.length === 0) return

    gsap.fromTo(
      nodes,
      { y: 8, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        stagger: 0.02,
      }
    )
  }, [executedToolCount, parsed.success, visibleEntries.length])

  useEffect(() => {
    onUnresolvedCountChange?.(unresolvedEntries.length)
  }, [onUnresolvedCountChange, unresolvedEntries.length])

  if (!parsed.success) return null

  if (visibleEntries.length === 0 && parsed.data.executedTools.length === 0) return null

  return (
    <div ref={containerRef} className="space-y-2 mt-2.5">
      {showBulkAction && (
        <Card data-saathi-inline-card className="gap-2.5 py-3.5 border-blue-300/70 bg-blue-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-3.5 pb-0">
            <CardTitle className="text-[13px] tracking-tight">Bulk Confirmation</CardTitle>
            <CardDescription>
              Confirm {bulkActionData.actionableCount} pending cards in one action.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3.5 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Includes: {bulkActionData.actionableTitles.slice(0, 3).join(", ")}
              {bulkActionData.actionableTitles.length > 3 ? ` +${bulkActionData.actionableTitles.length - 3} more` : ""}
            </p>
            {bulkActionData.hasOverflow && (
              <p className="text-[11px] text-amber-700">
                API limit is 8 actions per request. This will apply the first 8 pending actions.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              If you manually edited a draft form, resolve that card directly instead of bulk apply.
            </p>
            {bulkError && (
              <p className="text-xs text-red-600">{bulkError}</p>
            )}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleBulkApply}
                disabled={!onExecuteToolRequests || isBulkSubmitting}
              >
                {isBulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Go Ahead All ({bulkActionData.executableToolRequests.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orderedVisibleEntries.length > 0 && (
        <section className="space-y-0">
          {orderedVisibleEntries.map((entry, position) => {
            const hasMultipleCards = orderedVisibleEntries.length > 1
            const actionable = isCardActionable(entry.card)
            const showToolbar = hasMultipleCards || !actionable
            return (
              <div
                key={`saathi-card-${entry.key}`}
                data-saathi-inline-card
                onPointerDownCapture={() => {
                  if (hasMultipleCards) bringCardToFront(entry.key)
                }}
                className={cn(
                  "relative transition-all duration-200",
                  hasMultipleCards && position > 0 && "-mt-10 md:-mt-12",
                  hasMultipleCards && position > 0 && "opacity-95"
                )}
                style={hasMultipleCards ? {
                  zIndex: Math.max(1, 30 - position),
                  transform: `translate(${(position * 8) + (cardOffsets[entry.key]?.x || 0)}px, ${cardOffsets[entry.key]?.y || 0}px) scale(${Math.max(0.96, 1 - position * 0.008)})`,
                } : undefined}
              >
                {showToolbar && (
                  <div className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-1 text-[10px] shadow-sm">
                    {hasMultipleCards && (
                      <>
                        <button
                          type="button"
                          className="rounded px-1 py-0.5 hover:bg-muted"
                          onClick={() => bringCardToFront(entry.key)}
                          aria-label="Bring card to front"
                        >
                          Front
                        </button>
                        <button
                          type="button"
                          className="rounded px-1 py-0.5 hover:bg-muted"
                          onClick={() => resetCardOffset(entry.key)}
                          aria-label="Reset card position"
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => startDraggingCard(event, entry.key)}
                          className={cn(
                            "rounded px-1 py-0.5 hover:bg-muted",
                            draggingCardKey === entry.key ? "cursor-grabbing" : "cursor-grab"
                          )}
                          aria-label="Drag to move card"
                        >
                          Move
                        </button>
                      </>
                    )}
                    {!actionable && (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => markCardResolved(entry.key)}
                        aria-label="Dismiss card"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div>
                  {renderCard(entry.card, entry.key, {
                    onSuggestedPrompt,
                    onExecuteToolRequests,
                    onResolveCard: markCardResolved,
                  })}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {parsed.data.executedTools.length > 0 && (
        <Card data-saathi-inline-card className="gap-2.5 py-3.5 bg-background/85 shadow-sm transition-all duration-200 hover:shadow-md">
          <CardHeader className="px-3.5 pb-0">
            <CardTitle className="text-[13px] tracking-tight flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Actions Executed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3.5">
            <div className="space-y-1.5">
              {parsed.data.executedTools.map((item, index) => (
                <div key={`tool-${index}`} className="text-[11px] rounded-md border p-2 flex items-start gap-2">
                  {item.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-[12px] flex items-center gap-1">
                      <CircleDot className="w-3 h-3" />
                      {item.tool}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
