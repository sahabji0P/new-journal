"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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

function statusBadgeClass(status: "info" | "draft" | "created" | "updated" | "error") {
  if (status === "created" || status === "updated") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (status === "error") return "text-red-700 bg-red-50 border-red-200"
  if (status === "draft") return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-muted-foreground bg-muted border-border"
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
  onExecuteToolRequests,
}: {
  card: Extract<SaathiCard, { type: "entity" }>
  categories: CategoryOption[]
  accounts: AccountOption[]
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
  const [error, setError] = useState("")

  const categoryNames = useMemo(() => categories.map(item => item.name), [categories])
  const accountNames = useMemo(() => accounts.map(item => item.name), [accounts])

  const hasCategoryInOptions = categoryNames.some(name => name.toLowerCase() === category.toLowerCase())
  const hasAccountInOptions = accountNames.some(name => name.toLowerCase() === accountName.toLowerCase())

  const handleApply = async () => {
    if (!onExecuteToolRequests) return

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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="gap-3 py-4 border-amber-300/70">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Editable Draft Transaction</CardTitle>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
            {card.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-2.5">
        <div>
          <label className="text-[11px] text-muted-foreground">Description</label>
          <input
            value={description}
            onChange={event => setDescription(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            placeholder="What was this transaction?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Amount</label>
            <input
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              placeholder="165"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={event => setType(event.target.value === "income" ? "income" : "expense")}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Category</label>
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
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
          >
            <option value="">Select category</option>
            {hasCategoryInOptions ? null : category ? <option value={category}>{category}</option> : null}
            {categoryNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
            <option value="__new__">+ Create new category</option>
          </select>
          {categoryMode === "new" && (
            <input
              value={newCategory}
              onChange={event => setNewCategory(event.target.value)}
              className="mt-2 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              placeholder="New category name"
            />
          )}
        </div>

        <div>
          <label className="text-[11px] text-muted-foreground">Account</label>
          <select
            value={accountName}
            onChange={event => setAccountName(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
          >
            <option value="">Select account</option>
            {hasAccountInOptions ? null : accountName ? <option value={accountName}>{accountName}</option> : null}
            {accountNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Date</label>
            <input
              value={date}
              type="date"
              onChange={event => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Party (optional)</label>
            <input
              value={party}
              onChange={event => setParty(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
              placeholder="chirag"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <div className="flex items-center justify-end">
          <Button size="sm" onClick={handleApply} disabled={isSubmitting || !onExecuteToolRequests}>
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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="gap-3 py-4 border-amber-300/70">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Editable Draft Category</CardTitle>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
            {card.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 space-y-2">
        <div>
          <label className="text-[11px] text-muted-foreground">Category name</label>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
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
            className="mt-1 w-full rounded-md border bg-background px-2.5 py-2 text-sm"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleCreate} disabled={isSubmitting || !name.trim() || !onExecuteToolRequests}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Create Category
          </Button>
        </div>
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
  }: {
    onSuggestedPrompt?: (prompt: string) => void
    onExecuteToolRequests?: (input: { toolRequests: SaathiToolCall[]; userMessage?: string }) => Promise<void> | void
    categories: CategoryOption[]
    accounts: AccountOption[]
  }
) {
  if (card.type === "text") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          {card.title && <CardTitle className="text-sm">{card.title}</CardTitle>}
        </CardHeader>
        <CardContent className="px-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{card.body}</p>
        </CardContent>
      </Card>
    )
  }

  if (card.type === "stats") {
    return (
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {card.stats.map((stat, statIndex) => (
              <div key={`stat-${statIndex}`} className="rounded-lg border p-2.5">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p
                  className={cn(
                    "text-sm font-semibold mt-0.5",
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
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <ul className="space-y-2">
            {card.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`} className="rounded-lg border p-2.5">
                <p className="text-sm font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
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
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">{card.title}</CardTitle>
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border capitalize", statusBadgeClass(card.status))}>
              {card.status}
            </span>
          </div>
          <CardDescription className="capitalize">
            {card.entityType}
            {card.entityId ? ` • ${card.entityId}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="space-y-1.5">
            {card.fields.map((field, fieldIndex) => (
              <div key={`field-${fieldIndex}`} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{field.label}</span>
                <span className="text-right font-medium">{field.value}</span>
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
      <Card key={`saathi-card-${index}`} className="gap-3 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">{card.name}</CardTitle>
          <CardDescription>Budget progress</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="space-y-2">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full transition-all", overBudget ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
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

  return (
    <Card key={`saathi-card-${index}`} className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm">{card.title}</CardTitle>
        {card.description && <CardDescription>{card.description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
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
  const parsed = SaathiAssistantMetadataSchema.safeParse(metadata)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const cards = useMemo(() => (parsed.success ? parsed.data.cards : []), [parsed])

  useEffect(() => {
    if (!parsed.success) return

    const hasDraftCards = cards.some(
      card => card.type === "entity" && card.status === "draft"
    )
    if (!hasDraftCards) return

    const loadOptions = async () => {
      try {
        const [categoriesResponse, accountsResponse] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/accounts"),
        ])

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json() as CategoryOption[]
          if (Array.isArray(categoriesData)) {
            setCategories(categoriesData)
          }
        }

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json() as AccountOption[]
          if (Array.isArray(accountsData)) {
            setAccounts(accountsData)
          }
        }
      } catch (error) {
        console.error("Failed to load card editor options:", error)
      }
    }

    void loadOptions()
  }, [parsed.success, cards])

  if (!parsed.success) return null

  if (cards.length === 0 && parsed.data.executedTools.length === 0) return null

  return (
    <div className="space-y-2.5 mt-3">
      {cards.map((card, index) =>
        renderCard(card, index, {
          onSuggestedPrompt,
          onExecuteToolRequests,
          categories,
          accounts,
        })
      )}

      {parsed.data.executedTools.length > 0 && (
        <Card className="gap-3 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Actions Executed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="space-y-2">
              {parsed.data.executedTools.map((item, index) => (
                <div key={`tool-${index}`} className="text-xs rounded-md border p-2 flex items-start gap-2">
                  {item.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium flex items-center gap-1">
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
