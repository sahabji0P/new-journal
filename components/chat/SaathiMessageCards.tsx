"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { AlertCircle, CheckCircle2, CircleDot, Lightbulb, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  SaathiAssistantMetadataSchema,
  type SaathiCard,
  type SaathiToolCall,
} from "@/lib/saathi/schema"

gsap.registerPlugin(useGSAP)

interface CategoryOption {
  id: string
  name: string
  type: string
}

interface AccountOption {
  id: string
  name: string
}

interface SaathiMessageCardsProps {
  metadata: unknown
  onSuggestedPrompt?: (prompt: string) => void
  onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
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

function DraftTransactionCard({
  card,
  categories,
  accounts,
  optionsUnavailable,
  onExecuteToolRequests,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
  categories: CategoryOption[]
  accounts: AccountOption[]
  optionsUnavailable: boolean
  onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
}) {
  const initialDescription = normalizeFieldValue(getFieldValue(card, "Description"))
  const initialCategory = normalizeFieldValue(getFieldValue(card, "Category"))
  const initialAccount = normalizeFieldValue(getFieldValue(card, "Account"))
  const initialType = normalizeFieldValue(getFieldValue(card, "Type")).toLowerCase().includes("income") ? "income" : "expense"
  const initialParty = normalizeFieldValue(getFieldValue(card, "Party"))
  const initialDateRaw = normalizeFieldValue(getFieldValue(card, "Date"))
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(initialDateRaw)
    ? initialDateRaw
    : new Date().toISOString().slice(0, 10)
  const initialAmount = parseAmountValue(getFieldValue(card, "Amount"))

  const [description, setDescription] = useState(initialDescription)
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "")
  const [type, setType] = useState<"income" | "expense">(initialType)
  const [party, setParty] = useState(initialParty)
  const [date, setDate] = useState(initialDate)
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">(initialCategory ? "existing" : "new")
  const [category, setCategory] = useState(initialCategory)
  const [newCategory, setNewCategory] = useState("")
  const [accountName, setAccountName] = useState(initialAccount)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [error, setError] = useState("")

  const categoryNames = useMemo(() => categories.map(item => item.name), [categories])
  const accountNames = useMemo(() => accounts.map(item => item.name), [accounts])
  const hasCategoryOptions = categoryNames.length > 0
  const hasAccountOptions = accountNames.length > 0

  const hasCategoryInOptions = categoryNames.some(name => name.toLowerCase() === category.toLowerCase())
  const hasAccountInOptions = accountNames.some(name => name.toLowerCase() === accountName.toLowerCase())

  const handleApply = async () => {
    if (!onExecuteToolRequests || isResolved) return

    const parsedAmount = Number.parseFloat(amount)
    const resolvedCategory = categoryMode === "new" ? newCategory.trim() : category.trim()
    const resolvedAccount = accountName.trim()

    if (!description.trim()) {
      setError("Description is required")
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (!resolvedCategory) {
      setError("Category is required")
      return
    }

    if (!resolvedAccount) {
      setError("Account is required")
      return
    }

    setError("")
    setIsSubmitting(true)

    const shouldCreateCategory = !categoryNames.some(name => name.toLowerCase() === resolvedCategory.toLowerCase())
    const toolRequests: SaathiToolCall[] = []

    if (shouldCreateCategory) {
      toolRequests.push({
        tool: "create_category",
        rationale: "Create category requested from editable draft card",
        input: {
          name: resolvedCategory,
          type: type === "income" ? "income" : "expense",
        },
      })
    }

    toolRequests.push({
      tool: "create_transaction",
      rationale: "Create transaction from editable draft card",
      input: {
        description: description.trim(),
        amount: Math.abs(parsedAmount),
        type,
        category: resolvedCategory,
        accountName: resolvedAccount,
        date: `${date}T12:00:00.000Z`,
        ...(party.trim() ? { party: party.trim() } : {}),
      },
    })

    try {
      await onExecuteToolRequests({
        toolRequests,
        userMessage: `Apply draft transaction: ${description.trim()} (${formatCurrency(Math.abs(parsedAmount))})`,
      })
      setIsResolved(true)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not apply draft. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isResolved) {
    return (
      <Card className="gap-2.5 py-3.5 border-emerald-300/70 bg-emerald-50/20 shadow-sm">
        <CardHeader className="px-3.5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[13px] tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Draft Transaction Resolved
            </CardTitle>
            <span className="text-[11px] px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
              resolved
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3.5">
          <p className="text-[12px] text-muted-foreground">
            This draft has already been submitted and cannot be applied again.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-2.5 py-3.5 border-amber-300/70 bg-amber-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
      <CardHeader className="px-3.5 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-[13px] tracking-tight">Editable Draft Transaction</CardTitle>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
            {card.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-3.5 space-y-2.5">
        <div>
          <label className="text-[11px] text-muted-foreground">Description</label>
          <input
            value={description}
            onChange={event => setDescription(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            placeholder="What was this transaction?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Amount</label>
            <input
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="165"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={event => setType(event.target.value === "income" ? "income" : "expense")}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Category</label>
          {hasCategoryOptions ? (
            <select
              value={categoryMode === "new" ? "__new__" : category}
              onChange={event => {
                const value = event.target.value
                if (value === "__new__") {
                  setCategoryMode("new")
                  return
                }
                setCategoryMode("existing")
                setCategory(value)
              }}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Select category</option>
              {hasCategoryInOptions ? null : category ? <option value={category}>{category}</option> : null}
              {categoryNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value="__new__">+ Create new category</option>
            </select>
          ) : (
            <input
              value={categoryMode === "new" ? newCategory : category}
              onChange={event => {
                setCategoryMode("new")
                setNewCategory(event.target.value)
              }}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="Enter category"
            />
          )}
          {categoryMode === "new" && (
            <input
              value={newCategory}
              onChange={event => setNewCategory(event.target.value)}
              className="mt-2 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="New category name"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Account</label>
          {hasAccountOptions ? (
            <select
              value={accountName}
              onChange={event => setAccountName(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            >
              <option value="">Select account</option>
              {hasAccountInOptions ? null : accountName ? <option value={accountName}>{accountName}</option> : null}
              {accountNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          ) : (
            <input
              value={accountName}
              onChange={event => setAccountName(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="Enter account"
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Date</label>
            <input
              value={date}
              type="date"
              onChange={event => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Party (optional)</label>
            <input
              value={party}
              onChange={event => setParty(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-[13px] outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="chirag"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {optionsUnavailable && (
          <p className="text-xs text-amber-700">
            Could not load categories/accounts from server. You can still enter values manually.
          </p>
        )}

        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="transition-all duration-200 hover:-translate-y-0.5"
            onClick={handleApply}
            disabled={isSubmitting || !onExecuteToolRequests}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Apply and Create
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DraftCategoryCard({
  card,
  onExecuteToolRequests,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
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
  const [isResolved, setIsResolved] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!onExecuteToolRequests || !name.trim() || isResolved) return
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
      setIsResolved(true)
      setError("")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create category. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isResolved) {
    return (
      <Card className="gap-2.5 py-3.5 border-emerald-300/70 bg-emerald-50/20 shadow-sm">
        <CardHeader className="px-3.5 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[13px] tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Draft Category Resolved
            </CardTitle>
            <span className="text-[11px] px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
              resolved
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3.5">
          <p className="text-[12px] text-muted-foreground">
            This draft has already been submitted and cannot be applied again.
          </p>
        </CardContent>
      </Card>
    )
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
  index: number,
  {
    onSuggestedPrompt,
    onExecuteToolRequests,
    categories,
    accounts,
    optionsUnavailable,
  }: {
    onSuggestedPrompt?: (prompt: string) => void
    onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
    categories: CategoryOption[]
    accounts: AccountOption[]
    optionsUnavailable: boolean
  }
) {
  if (card.type === "text") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader className="px-3.5 pb-0">
          {card.title && <CardTitle className="text-[13px] tracking-tight">{card.title}</CardTitle>}
        </CardHeader>
        <CardContent className="px-3.5">
          <p className="text-[13px] leading-6 whitespace-pre-wrap">{card.body}</p>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "stats") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
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
        </CardContent>
      </Card>
    )
  }

  if (card.type === "list") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
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
        </CardContent>
      </Card>
    )
  }

  if (card.type === "entity" && card.status === "draft" && card.entityType === "transaction") {
    return (
      <DraftTransactionCard
        key={`saathi-card-${index}`}
        card={card}
        categories={categories}
        accounts={accounts}
        optionsUnavailable={optionsUnavailable}
        onExecuteToolRequests={onExecuteToolRequests}
      />
    )
  }

  if (card.type === "entity" && card.status === "draft" && card.entityType === "category") {
    return (
      <DraftCategoryCard
        key={`saathi-card-${index}`}
        card={card}
        onExecuteToolRequests={onExecuteToolRequests}
      />
    )
  }

  if (card.type === "entity") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
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
        </CardContent>
      </Card>
    )
  }

  if (card.type === "budget") {
    const width = Math.max(0, Math.min(100, card.usagePercent))
    const overBudget = card.remaining < 0
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
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
          </div>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "confirm") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 border-red-300/70 bg-red-50/20 shadow-sm transition-all duration-200 hover:shadow-md">
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
                  void execution.catch(error => {
                    console.error("Failed to execute confirm action:", error)
                  })
                }
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
    <Card key={`saathi-card-${index}`} className="gap-2.5 py-3.5 bg-background/80 shadow-sm transition-all duration-200 hover:shadow-md">
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
}: SaathiMessageCardsProps) {
  const parsed = useMemo(() => SaathiAssistantMetadataSchema.safeParse(metadata), [metadata])
  const containerRef = useRef<HTMLDivElement>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [optionsStatus, setOptionsStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle")
  const [optionsError, setOptionsError] = useState("")
  const attemptedSignatureRef = useRef("")
  const loadedSignatureRef = useRef("")
  const loggedErrorSignatureRef = useRef("")
  const cards = useMemo(() => (parsed.success ? parsed.data.cards : []), [parsed])
  const executedToolCount = parsed.success ? parsed.data.executedTools.length : 0
  const hasDraftCards = useMemo(
    () => cards.some(card => card.type === "entity" && card.status === "draft"),
    [cards]
  )
  const draftSignature = useMemo(() => {
    if (!hasDraftCards) return ""
    const draftCards = cards
      .filter((card): card is Extract<SaathiCard, { type: "entity" }> => card.type === "entity" && card.status === "draft")
      .map(card => ({
        type: card.type,
        status: card.status,
        entityType: card.entityType,
        title: card.title,
        fields: card.fields.map(field => `${field.label}:${field.value}`),
      }))
    return JSON.stringify(draftCards)
  }, [cards, hasDraftCards])

  const loadOptions = useCallback(async (signature: string) => {
    attemptedSignatureRef.current = signature
    setOptionsStatus("loading")
    setOptionsError("")
    try {
      const [categoriesResponse, accountsResponse] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/accounts"),
      ])

      let loadedAtLeastOne = false

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json() as CategoryOption[]
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData)
          loadedAtLeastOne = true
        }
      }

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json() as AccountOption[]
        if (Array.isArray(accountsData)) {
          setAccounts(accountsData)
          loadedAtLeastOne = true
        }
      }

      if (!loadedAtLeastOne) {
        throw new Error("Could not load categories and accounts")
      }

      loadedSignatureRef.current = signature
      setOptionsStatus("loaded")
    } catch (error) {
      setOptionsStatus("error")
      setOptionsError("Could not load dropdown options. Enter values manually or retry.")
      if (loggedErrorSignatureRef.current !== signature) {
        console.warn("Failed to load card editor options:", error)
        loggedErrorSignatureRef.current = signature
      }
    }
  }, [])

  useEffect(() => {
    if (!parsed.success || !hasDraftCards || !draftSignature) return
    if (loadedSignatureRef.current === draftSignature) return
    if (attemptedSignatureRef.current === draftSignature) return
    void loadOptions(draftSignature)
  }, [parsed.success, hasDraftCards, draftSignature, loadOptions])

  const retryLoadOptions = () => {
    if (!draftSignature) return
    attemptedSignatureRef.current = ""
    loadedSignatureRef.current = ""
    void loadOptions(draftSignature)
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
  }, [cards.length, executedToolCount, parsed.success])

  if (!parsed.success) return null

  if (cards.length === 0 && parsed.data.executedTools.length === 0) return null

  return (
    <div ref={containerRef} className="space-y-2 mt-2.5">
      {hasDraftCards && optionsStatus === "error" && (
        <Card data-saathi-inline-card className="gap-2 py-3 border-amber-300/70 bg-amber-50/20 shadow-sm">
          <CardContent className="px-4 pt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-700">{optionsError}</p>
            <Button size="sm" variant="outline" onClick={retryLoadOptions}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {cards.map((card, index) =>
        <div key={`saathi-inline-card-${index}`} data-saathi-inline-card>
          {renderCard(card, index, {
            onSuggestedPrompt,
            onExecuteToolRequests,
            categories,
            accounts,
            optionsUnavailable: optionsStatus === "error",
          })}
        </div>
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
