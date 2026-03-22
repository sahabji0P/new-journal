"use client"

import { useApp } from "@/contexts/AppContext"
import { toast } from "@/lib/toast"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  ChevronRight,
  CreditCard,
  Download,
  FilePlus2,
  House,
  Repeat2,
  ReceiptText,
  ShoppingBag,
  Tag,
  TriangleAlert,
  Trash2,
  Utensils,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ReceiptViewer } from "../receipts/ReceiptViewer"
import { SplitViewer } from "../splits/SplitViewer"
import { TransactionImageExportDialog } from "./TransactionImageExportDialog"
import { TransactionFormModern } from "./TransactionFormModern"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { iconForTransaction, transactionTimeLabel } from "./transaction-utils"

gsap.registerPlugin(useGSAP)

type TransactionDetailProps = {
  transaction: Transaction | null
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose?: () => void
  isMobile?: boolean
  onAccountClick?: (accountId: string) => void
  onCategoryClick?: (category: string) => void
}

function iconForCategory(categoryIcon?: string): LucideIcon | null {
  const normalized = categoryIcon?.trim().toLowerCase()
  if (!normalized) return null

  if (normalized === "shopping-bag") return ShoppingBag
  if (normalized === "utensils") return Utensils
  if (normalized === "car") return CarFront
  if (normalized === "home") return House
  if (normalized === "briefcase") return BriefcaseBusiness
  if (normalized === "banknote") return Banknote
  if (normalized === "tag") return Tag

  return null
}

function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
}

function relativeDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const now = Date.now()
  const delta = date.getTime() - now
  const abs = Math.abs(delta)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day

  if (abs < hour) {
    const minutes = Math.max(1, Math.round(abs / minute))
    return delta < 0 ? `${minutes} min ago` : `in ${minutes} min`
  }

  if (abs < day) {
    const hours = Math.max(1, Math.round(abs / hour))
    return delta < 0 ? `${hours} hr ago` : `in ${hours} hr`
  }

  if (abs < month) {
    const days = Math.max(1, Math.round(abs / day))
    return delta < 0 ? `${days} day${days === 1 ? "" : "s"} ago` : `in ${days} day${days === 1 ? "" : "s"}`
  }

  const months = Math.max(1, Math.round(abs / month))
  return delta < 0 ? `${months} month${months === 1 ? "" : "s"} ago` : `in ${months} month${months === 1 ? "" : "s"}`
}

function splitColor(index: number, total: number): string {
  const safeTotal = Math.max(total, 1)
  const hue = Math.round((index / safeTotal) * 320 + 20)
  return `hsl(${hue} 72% 56%)`
}

export function TransactionDetail({
  transaction,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  isMobile = false,
  onAccountClick,
  onCategoryClick,
}: TransactionDetailProps) {
  const router = useRouter()

  const {
    accounts,
    budgets,
    categories,
    recurringTransactions,
    templates,
    transactions,
    updateTransaction,
    deleteTransaction,
    addTemplate,
    addSettlement,
    getReceiptsByTransaction,
    formatCurrency,
    formatDate,
  } = useApp()

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormSeed, setEditFormSeed] = useState(0)
  const [editFocusSection, setEditFocusSection] = useState<"general" | "split">("general")
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateIncludeAmount, setTemplateIncludeAmount] = useState(true)
  const [templateTags, setTemplateTags] = useState<string[]>([])
  const [templateTagInput, setTemplateTagInput] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImageExportDialogOpen, setIsImageExportDialogOpen] = useState(false)
  const [relatedScope, setRelatedScope] = useState<"category" | "party" | "account">("category")
  const [insightScope, setInsightScope] = useState<"transaction_month" | "last_3_months" | "all_time">("transaction_month")

  const rootRef = useRef<HTMLDivElement>(null)

  const categoryInfo = useMemo(
    () => categories.find(item => transaction && item.name.toLowerCase() === transaction.category.toLowerCase()),
    [categories, transaction]
  )

  const partyHistory = useMemo(() => {
    if (!transaction?.party) return null

    const normalizedParty = transaction.party.trim().toLowerCase()
    if (!normalizedParty) return null

    const partyTransactions = transactions.filter(item => item.party?.trim().toLowerCase() === normalizedParty)
    const expenseTransactions = partyTransactions.filter(item => item.type === "expense")
    const total = expenseTransactions.reduce((sum, item) => sum + Math.abs(item.amount), 0)
    return {
      count: expenseTransactions.length,
      total,
    }
  }, [transaction, transactions])

  const duplicateMatches = useMemo(() => {
    if (!transaction?.party) return []

    const transactionDate = new Date(transaction.date)
    if (Number.isNaN(transactionDate.getTime())) return []

    const year = transactionDate.getFullYear()
    const month = transactionDate.getMonth()
    const day = transactionDate.getDate()
    const normalizedParty = transaction.party.trim().toLowerCase()
    const transactionAbsAmount = Math.abs(transaction.amount)

    return transactions.filter(item => {
      if (item.id === transaction.id) return false
      if (!item.party || item.party.trim().toLowerCase() !== normalizedParty) return false

      const itemDate = new Date(item.date)
      if (
        itemDate.getFullYear() !== year ||
        itemDate.getMonth() !== month ||
        itemDate.getDate() !== day
      ) {
        return false
      }

      return Math.abs(Math.abs(item.amount) - transactionAbsAmount) < 0.01
    })
  }, [transaction, transactions])

  const relatedTransactions = useMemo(() => {
    if (!transaction) return []

    return transactions
      .filter(item => {
        if (item.id === transaction.id) return false
        if (relatedScope === "category") return item.category === transaction.category
        if (relatedScope === "account") return item.accountId === transaction.accountId
        return Boolean(transaction.party && item.party && item.party.toLowerCase() === transaction.party.toLowerCase())
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
  }, [relatedScope, transaction, transactions])

  const categoryScopedStats = useMemo(() => {
    if (!transaction?.category) return null

    const now = new Date()
    const txDate = new Date(transaction.date)
    const monthStart = new Date(txDate.getFullYear(), txDate.getMonth(), 1)
    const monthEnd = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0, 23, 59, 59, 999)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const inScope = (value: Transaction) => {
      const itemDate = new Date(value.date)
      if (insightScope === "all_time") return true
      if (insightScope === "last_3_months") return itemDate >= threeMonthsAgo && itemDate <= now
      return itemDate >= monthStart && itemDate <= monthEnd
    }

    const categoryTransactions = transactions.filter(item => item.category === transaction.category && inScope(item))
    const incomeTransactions = categoryTransactions.filter(item => item.type === "income")
    const expenseTransactions = categoryTransactions.filter(item => item.type === "expense")
    const totalIncome = incomeTransactions.reduce((sum, item) => sum + item.amount, 0)
    const totalExpense = Math.abs(expenseTransactions.reduce((sum, item) => sum + item.amount, 0))
    const avgIncome = incomeTransactions.length > 0 ? totalIncome / incomeTransactions.length : 0
    const avgExpense = expenseTransactions.length > 0 ? totalExpense / expenseTransactions.length : 0

    const scopeLabel = insightScope === "all_time"
      ? "All time"
      : insightScope === "last_3_months"
        ? "Last 3 months"
        : txDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })

    return {
      count: categoryTransactions.length,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      income: totalIncome,
      expense: totalExpense,
      avgIncome,
      avgExpense,
      scopeLabel,
    }
  }, [insightScope, transaction, transactions])

  const categoryTrendBars = useMemo(() => {
    if (!transaction?.category) return []

    const targetDate = new Date(transaction.date)
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    const weeklyValues = [0, 0, 0, 0]

    transactions
      .filter(item => item.category === transaction.category)
      .forEach(item => {
        if (item.id === transaction.id) return
        const itemDate = new Date(item.date)
        if (itemDate.getMonth() !== targetMonth || itemDate.getFullYear() !== targetYear) return
        const weekIndex = Math.min(Math.floor((itemDate.getDate() - 1) / 7), 3)
        weeklyValues[weekIndex] += Math.abs(item.amount)
      })

    const values = [...weeklyValues, Math.abs(transaction.amount)]
    const maxValue = Math.max(...values, 1)
    const labels = ["W1", "W2", "W3", "W4", "Now"]

    return values.map((value, index) => ({
      label: labels[index],
      isCurrent: index === values.length - 1,
      value,
      heightPercent: value === 0 ? 8 : Math.max(18, Math.round((value / maxValue) * 100)),
    }))
  }, [transaction, transactions])

  useEffect(() => {
    if (!transaction) return
    setIsEditDialogOpen(false)
    setEditFormSeed(0)
    setEditFocusSection("general")
    setIsTemplateDialogOpen(false)
    setTemplateName(transaction.description)
    setTemplateIncludeAmount(true)
    setTemplateTags(transaction.tags || [])
    setTemplateTagInput("")
    setIsDeleteDialogOpen(false)
    setIsImageExportDialogOpen(false)
    setRelatedScope("category")
    setInsightScope("transaction_month")
  }, [transaction])

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) return

    const nodes = rootRef.current?.querySelectorAll("[data-detail-animate='true']")
    if (!nodes || nodes.length === 0) return

    gsap.fromTo(
      nodes,
      { y: 12, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        stagger: 0.04,
        ease: "power2.out",
      }
    )
  }, { scope: rootRef, dependencies: [transaction?.id, isEditDialogOpen, isMobile] })

  if (!transaction) {
    return (
      <Card className="rounded-3xl border-border/70 bg-card/90 p-6">
        <p className="text-sm text-muted-foreground">Select a transaction to see details.</p>
      </Card>
    )
  }

  const account = accounts.find(item => item.id === transaction.accountId)
  const receipts = getReceiptsByTransaction(transaction.id)
  const receiptCount = receipts.length
  const recurringSource = transaction.recurringId
    ? recurringTransactions.find(item => item.id === transaction.recurringId)
    : null
  const templateSource = transaction.templateId
    ? templates.find(item => item.id === transaction.templateId)
    : null
  const budgetContext = transaction.budgetId
    ? budgets.find(item => item.id === transaction.budgetId)
    : budgets.find(item => item.subBudgets.some(subBudget => subBudget.category === transaction.category))
  const budgetSubContext = budgetContext?.subBudgets.find(item => item.category === transaction.category)
  const budgetAllocated = budgetSubContext?.allocated ?? budgetContext?.totalAllocated ?? 0
  const budgetSpent = budgetSubContext?.spent ?? budgetContext?.totalSpent ?? 0
  const budgetProgress = budgetAllocated > 0 ? Math.round((budgetSpent / budgetAllocated) * 100) : 0
  const accountBalanceAfter = account?.balance
  const accountBalanceBefore = account ? account.balance - transaction.amount : null
  const transactionRelativeTime = relativeDateLabel(transaction.date)
  const TransactionIcon = iconForCategory(categoryInfo?.icon) || iconForTransaction(transaction)
  const isIncome = transaction.type === "income"
  const transactionDateTime = new Date(transaction.date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const openEditDialog = (section: "general" | "split" = "general") => {
    setEditFocusSection(section)
    setEditFormSeed(previous => previous + 1)
    setIsEditDialogOpen(true)
  }

  const handleDelete = () => {
    deleteTransaction(transaction.id)
    if (isMobile && onClose) {
      onClose()
    }
  }

  const handleAddTemplateTag = () => {
    const normalizedTag = normalizeTag(templateTagInput)
    if (!normalizedTag) return
    if (templateTags.includes(normalizedTag)) {
      setTemplateTagInput("")
      return
    }

    setTemplateTags(prev => [...prev, normalizedTag])
    setTemplateTagInput("")
  }

  const handleOpenTemplateDialog = () => {
    setTemplateName(transaction.description)
    setTemplateIncludeAmount(true)
    setTemplateTags(transaction.tags || [])
    setTemplateTagInput("")
    setIsTemplateDialogOpen(true)
  }

  const handleSaveAsTemplate = () => {
    const cleanedName = templateName.trim()
    if (!cleanedName) {
      toast.error("Template name is required")
      return
    }

    addTemplate({
      name: cleanedName,
      description: transaction.description,
      amount: templateIncludeAmount ? Math.abs(transaction.amount) : 0,
      category: transaction.category,
      type: transaction.type,
      party: transaction.party,
      tags: templateTags.length > 0 ? templateTags : undefined,
      accountId: transaction.accountId,
      notes: transaction.notes,
      icon: "Receipt",
      color: isIncome ? "green" : "red",
    })
    setIsTemplateDialogOpen(false)
  }

  const handleMarkSplitPaid = (splitId: string, isPaid: boolean) => {
    if (!transaction.splits) return

    const updatedSplits = transaction.splits.map(split =>
      split.id === splitId
        ? { ...split, isPaid, paidDate: isPaid ? new Date().toISOString() : undefined }
        : split
    )

    if (!account) return

    updateTransaction(transaction.id, {
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      accountId: account.id,
      accountName: account.name,
      party: transaction.party,
      notes: transaction.notes,
      tags: transaction.tags,
      splits: updatedSplits,
    })
  }

  const handleCreateSettlements = () => {
    if (!transaction.splits) return

    const unpaidSplits = transaction.splits.filter(split => !split.isPaid)
    if (unpaidSplits.length === 0) return

    unpaidSplits.forEach(split => {
      addSettlement({
        party: split.personName,
        amount: split.amount,
        type: "owed_to_me",
        reason: `Settlement from split bill: ${transaction.description}`,
        isSettled: false,
      })
    })

    toast.success(`Created ${unpaidSplits.length} settlement(s)`, {
      description: transaction.description,
    })
  }

  const accountTypeLabel = account ? `${account.type[0].toUpperCase()}${account.type.slice(1)} account` : "Account"
  const categoryNetTotal = transaction.type === "income"
    ? categoryScopedStats?.income || 0
    : -(categoryScopedStats?.expense || 0)
  const scopeAverageAmount = isIncome
    ? categoryScopedStats?.avgIncome || 0
    : categoryScopedStats?.avgExpense || 0
  const scopeComparableCount = isIncome
    ? categoryScopedStats?.incomeCount || 0
    : categoryScopedStats?.expenseCount || 0
  const categoryDeltaPercent = scopeAverageAmount > 0
    ? Math.round(((Math.abs(transaction.amount) - scopeAverageAmount) / scopeAverageAmount) * 100)
    : 0
  const categoryDeltaLabel = scopeComparableCount <= 1
    ? "Not enough history for comparison"
    : `${categoryDeltaPercent >= 0 ? "+" : ""}${categoryDeltaPercent}% vs ${isIncome ? "income" : "expense"} average`
  const relatedScopeLabel = relatedScope === "category"
    ? `Related in ${transaction.category}`
    : relatedScope === "party"
      ? `Related with ${transaction.party || "party"}`
      : `Related in ${account?.name || "account"}`
  const splitBaseAmount = Math.max(Math.abs(transaction.amount), 1)

  const detailDialogs = (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[95vh] overflow-y-auto p-2 sm:max-w-4xl sm:p-3">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>Update transaction details, including split allocations.</DialogDescription>
          </DialogHeader>
          <TransactionFormModern
            key={`detail-edit-${transaction.id}-${editFormSeed}`}
            mode="edit"
            initial={transaction}
            focusSection={editFocusSection}
            onSubmit={() => setIsEditDialogOpen(false)}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <TransactionImageExportDialog
        open={isImageExportDialogOpen}
        onOpenChange={setIsImageExportDialogOpen}
        transaction={transaction}
        accountName={account?.name || transaction.accountName || "Unknown account"}
        receiptCount={receiptCount}
        formatCurrency={formatCurrency}
      />

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for this transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="template-name">
                Template Name
              </label>
              <Input
                id="template-name"
                value={templateName}
                onChange={event => setTemplateName(event.target.value)}
                placeholder="e.g. Weekly Grocery Run"
                className="rounded-xl"
              />
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Include Amount</p>
                  <p className="text-xs text-muted-foreground">
                    {templateIncludeAmount
                      ? `Template saves ${formatCurrency(Math.abs(transaction.amount))}`
                      : "Template amount will default to 0"}
                  </p>
                </div>
                <Switch checked={templateIncludeAmount} onCheckedChange={setTemplateIncludeAmount} />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="template-tag-input">
                Associate Tags
              </label>
              <div className="mb-2 flex flex-wrap gap-2">
                {templateTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTemplateTags(prev => prev.filter(item => item !== tag))}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    #{tag}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="template-tag-input"
                  value={templateTagInput}
                  onChange={event => setTemplateTagInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleAddTemplateTag()
                    }
                  }}
                  placeholder="Add a tag"
                  className="rounded-xl"
                />
                <Button type="button" variant="outline" className="rounded-xl" onClick={handleAddTemplateTag}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} className="rounded-xl">
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                handleDelete()
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  if (!isMobile) {
    return (
      <div
        ref={rootRef}
        className="relative flex max-h-[92vh] flex-col overflow-hidden bg-card text-card-foreground"
      >
        <header data-detail-animate="true" className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
              <ReceiptText className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Transaction Details</p>
              <p className="text-xs text-muted-foreground/80">ID #{transaction.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-border/70 bg-muted/30 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous transaction"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next transaction"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {onClose && (
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="gap-2 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <span className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  Esc
                </span>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-8 p-6 lg:p-8">
            <section data-detail-animate="true" className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={cn(
                  "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
                  isIncome ? "bg-emerald-500/20 text-emerald-500" : "bg-primary/20 text-primary"
                )}>
                  <TransactionIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h1 className={cn(
                    "text-3xl font-bold tracking-tight",
                    isIncome ? "text-emerald-500" : "text-foreground"
                  )}>
                    {formatCurrency(transaction.amount)}
                  </h1>
                  <p className="text-lg font-medium text-foreground/90">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {transactionDateTime}
                    {transactionRelativeTime ? ` · ${transactionRelativeTime}` : ""}
                  </p>
                </div>
              </div>

              {(isIncome || transaction.isShared || transaction.recurringId) && (
                <div className="flex flex-wrap gap-1.5 pl-[4.5rem]">
                  <span className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]",
                    isIncome
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-red-500/30 bg-red-500/10 text-red-500"
                  )}>
                    {isIncome ? "Income" : "Expense"}
                  </span>
                  {transaction.isShared && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
                      Split
                    </span>
                  )}
                  {transaction.recurringId && (
                    <button
                      type="button"
                      onClick={() => router.push("/transactions/recurring")}
                      className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Repeat2 className="h-3 w-3" />
                        Recurring
                      </span>
                    </button>
                  )}
                </div>
              )}

              {(recurringSource || templateSource) && (
                <p className="pl-[4.5rem] text-xs text-muted-foreground">
                  {recurringSource ? `Part of recurring rule: ${recurringSource.description}` : ""}
                  {recurringSource && templateSource ? " · " : ""}
                  {templateSource ? `Created from template: ${templateSource.name}` : ""}
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-border/40 pt-4">
                <Button
                  type="button"
                  onClick={() => openEditDialog("general")}
                  className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Edit Details
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={() => openEditDialog("split")} disabled={isIncome}>
                  <ArrowLeftRight className="h-4 w-4" />
                  Split
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={handleOpenTemplateDialog}>
                  <ReceiptText className="h-4 w-4" />
                  Template
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={() => setIsImageExportDialogOpen(true)}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-red-500 hover:text-red-500"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  aria-label="Delete transaction"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </section>

            {duplicateMatches.length > 0 && (
              <section data-detail-animate="true" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-500">
                  <TriangleAlert className="h-4 w-4" />
                  Potential duplicate
                </p>
                <p className="mt-1 text-xs text-amber-500/90">
                  Found {duplicateMatches.length} transaction{duplicateMatches.length === 1 ? "" : "s"} with the same
                  amount, party, and date.
                </p>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-7">
                <div data-detail-animate="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-xl border border-border/70 bg-muted/30 p-5 text-left transition-colors hover:border-primary/45"
                    onClick={onAccountClick ? () => onAccountClick(transaction.accountId) : undefined}
                    disabled={!onAccountClick}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account</p>
                      <CreditCard className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">{account?.name || "Unknown account"}</p>
                    <p className="text-sm text-muted-foreground">{accountTypeLabel}</p>
                    {accountBalanceAfter != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Balance: {formatCurrency(accountBalanceAfter)} (was {formatCurrency(accountBalanceBefore || 0)})
                      </p>
                    )}
                  </button>

                  <div className="rounded-xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Date & Time</p>
                      <ArrowLeftRight className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">{formatDate(transaction.date)}</p>
                    <p className="text-sm text-muted-foreground">{transactionTimeLabel(transaction.date)}</p>
                  </div>
                </div>

                <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
                    <div className="mt-2 rounded-lg border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground/90">
                      {transaction.notes || "No notes added for this transaction."}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {transaction.tags && transaction.tags.length > 0 ? (
                        transaction.tags.map(tag => (
                          <span
                            key={`${transaction.id}-${tag}`}
                            className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No tags added.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-left transition-colors hover:border-primary/45"
                      onClick={onCategoryClick ? () => onCategoryClick(transaction.category) : undefined}
                      disabled={!onCategoryClick}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Category</p>
                      <p className="text-sm font-medium text-foreground">{transaction.category}</p>
                    </button>
                    <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Party</p>
                      <p className="text-sm font-medium text-foreground">{transaction.party || "Not specified"}</p>
                    </div>
                  </div>
                </section>

                {transaction.splits && transaction.splits.length > 0 && (
                  <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Split Breakdown</p>
                    </div>

                    <>
                      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-background">
                        {transaction.splits.map((split, index) => (
                          <div
                            key={split.id}
                            className="h-full"
                            style={{
                              width: `${Math.max(8, (Math.abs(split.amount) / splitBaseAmount) * 100)}%`,
                              backgroundColor: splitColor(index, transaction.splits?.length || 1),
                            }}
                          />
                        ))}
                      </div>

                      <div className="space-y-2">
                        {transaction.splits.map((split, index) => {
                          const percent = (Math.abs(split.amount) / splitBaseAmount) * 100
                          return (
                            <div key={split.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: splitColor(index, transaction.splits?.length || 1) }}
                                />
                                <span className="text-foreground">{split.personName}</span>
                              </div>
                              <span className="font-mono text-muted-foreground">
                                {formatCurrency(-Math.abs(split.amount))} ({Math.round(percent)}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="mt-4 rounded-lg border border-border/60 bg-background/70 p-3">
                        <SplitViewer
                          splits={transaction.splits}
                          totalAmount={Math.abs(transaction.amount)}
                          onMarkPaid={handleMarkSplitPaid}
                          onCreateSettlements={handleCreateSettlements}
                          readonly={false}
                        />
                      </div>
                    </>
                  </section>
                )}
              </div>

              <div className="space-y-6 lg:col-span-5">
                <section data-detail-animate="true" className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-muted/50 via-muted/25 to-card p-5">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4.5 w-4.5 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Category Insight</h3>
                      </div>
                      <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
                        <button
                          type="button"
                          onClick={() => setInsightScope("transaction_month")}
                          className={cn(
                            "rounded px-2 py-1 text-[10px] font-medium",
                            insightScope === "transaction_month" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                          )}
                        >
                          Month
                        </button>
                        <button
                          type="button"
                          onClick={() => setInsightScope("last_3_months")}
                          className={cn(
                            "rounded px-2 py-1 text-[10px] font-medium",
                            insightScope === "last_3_months" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                          )}
                        >
                          3M
                        </button>
                        <button
                          type="button"
                          onClick={() => setInsightScope("all_time")}
                          className={cn(
                            "rounded px-2 py-1 text-[10px] font-medium",
                            insightScope === "all_time" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                          )}
                        >
                          All
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(categoryNetTotal)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      In <span className="font-medium text-foreground">{categoryScopedStats?.scopeLabel || "selected scope"}</span> for{" "}
                      <span className="font-medium text-foreground">{transaction.category}</span>.
                    </p>
                    <p className={cn(
                      "mt-1 text-xs font-medium",
                      scopeComparableCount <= 1 && "text-muted-foreground",
                      scopeComparableCount > 1 && categoryDeltaPercent > 0 && "text-red-500",
                      scopeComparableCount > 1 && categoryDeltaPercent < 0 && "text-emerald-500",
                      scopeComparableCount > 1 && categoryDeltaPercent === 0 && "text-muted-foreground"
                    )}>
                      {categoryDeltaLabel}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      W1-W4 are weekly totals in {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}; NOW is this transaction amount.
                    </p>

                    <div className="mt-4">
                      <div className="flex h-16 items-end justify-between gap-1">
                        {categoryTrendBars.map(item => (
                          <div
                            key={item.label}
                            className={cn(
                              "h-full flex-1 rounded-sm bg-primary/25",
                              item.isCurrent && "bg-primary"
                            )}
                            title={`${item.label}: ${formatCurrency(isIncome ? item.value : -item.value)}`}
                            style={{ height: `${item.heightPercent}%` }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {categoryTrendBars.map(item => (
                          <span key={`${item.label}-label`} className={cn(item.isCurrent && "font-semibold text-primary")}>
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {budgetContext && (
                  <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Budget Impact
                      </h3>
                      <span className="text-xs font-medium text-foreground">{budgetContext.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.min(999, Math.max(0, budgetProgress))}% used • {formatCurrency(Math.max(0, budgetAllocated - budgetSpent))} remaining
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className={cn("h-full", budgetProgress > 100 ? "bg-red-500" : "bg-primary")}
                        style={{ width: `${Math.min(100, Math.max(0, budgetProgress))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatCurrency(budgetSpent)} / {formatCurrency(budgetAllocated)}
                    </p>
                  </section>
                )}

                {partyHistory && (
                  <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Party History
                    </h3>
                    <p className="mt-2 text-sm text-foreground">
                      {partyHistory.count} transaction{partyHistory.count === 1 ? "" : "s"} with {transaction.party}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(-partyHistory.total)} total spent
                    </p>
                  </section>
                )}

                <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {relatedScopeLabel}
                    </h3>
                    <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
                      <button
                        type="button"
                        onClick={() => setRelatedScope("category")}
                        className={cn(
                          "rounded px-2 py-1 text-[10px] font-medium",
                          relatedScope === "category" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                        )}
                      >
                        Category
                      </button>
                      <button
                        type="button"
                        onClick={() => setRelatedScope("party")}
                        disabled={!transaction.party}
                        className={cn(
                          "rounded px-2 py-1 text-[10px] font-medium",
                          relatedScope === "party" ? "bg-primary/20 text-primary" : "text-muted-foreground",
                          !transaction.party && "cursor-not-allowed opacity-40"
                        )}
                      >
                        Party
                      </button>
                      <button
                        type="button"
                        onClick={() => setRelatedScope("account")}
                        className={cn(
                          "rounded px-2 py-1 text-[10px] font-medium",
                          relatedScope === "account" ? "bg-primary/20 text-primary" : "text-muted-foreground"
                        )}
                      >
                        Account
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {relatedTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No related transactions yet.</p>
                    ) : (
                      relatedTransactions.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-background/80 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.description}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDate(item.date)}</p>
                          </div>
                          <p className={cn(
                            "text-sm font-mono font-medium",
                            item.type === "income" ? "text-emerald-500" : "text-foreground"
                          )}>
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {receiptCount > 0 && (
                  <section data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/30 p-5">
                    <ReceiptViewer transactionId={transaction.id} />
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer data-detail-animate="true" className="flex items-center justify-between border-t border-border/70 px-6 py-3 text-[10px] text-muted-foreground">
          <span>
            {transaction.createdAt
              ? `Created: ${formatDate(transaction.createdAt)}`
              : `Recorded on ${formatDate(transaction.date)}`}{" "}
            •{" "}
            {transaction.updatedAt
              ? `Edited: ${formatDate(transaction.updatedAt)}`
              : `Account: ${account?.name || "Unknown account"}`}
          </span>
          <span>Use arrows to navigate</span>
        </footer>

        {detailDialogs}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex flex-col gap-3 bg-card/95 pb-24",
        !isMobile && "rounded-3xl border border-border/70 p-4 md:max-h-[82vh] md:overflow-y-auto",
        isMobile && "bg-background px-4 pb-28 pt-2"
      )}
    >
      <div data-detail-animate="true" className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
              aria-label="Close details"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Transaction Details</p>
            <p className="text-sm font-medium text-foreground">{formatDate(transaction.date)}</p>
          </div>
        </div>

        <div className="inline-flex items-center rounded-xl border border-border/70 bg-muted/20 p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onPrev}
            disabled={!hasPrev}
            aria-label="Previous transaction"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onNext}
            disabled={!hasNext}
            aria-label="Next transaction"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <section
        data-detail-animate="true"
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-muted/20 via-card to-card p-4 sm:p-5"
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-1 w-full",
            isIncome
              ? "bg-gradient-to-r from-emerald-500 to-lime-400"
              : "bg-gradient-to-r from-red-500 to-orange-400"
          )}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn(
              "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              isIncome ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"
            )}>
              <TransactionIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground sm:text-xl">{transaction.description}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {transactionDateTime}
                {transactionRelativeTime ? ` · ${transactionRelativeTime}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {transaction.isShared && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                    Split
                  </span>
                )}
                {transaction.recurringId && (
                  <button
                    type="button"
                    onClick={() => router.push("/transactions/recurring")}
                    className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Recurring
                  </button>
                )}
                {templateSource && (
                  <button
                    type="button"
                    onClick={() => router.push("/transactions/templates")}
                    className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Template
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={cn("sm:text-right", isMobile && "pl-[3.5rem]")}>
            <p className={cn(
              "text-3xl font-bold tracking-tight sm:text-[2.1rem]",
              isIncome ? "text-emerald-500" : "text-foreground"
            )}>
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs text-muted-foreground">Net impact</p>
          </div>
        </div>
      </section>

      <div data-detail-animate="true" className="mt-1 flex justify-end gap-2">
        <TopActionButton
          icon={ArrowLeftRight}
          label="Split transaction"
          onClick={() => openEditDialog("split")}
          disabled={isIncome}
        />
        <TopActionButton
          icon={Download}
          label="Download receipt image"
          onClick={() => setIsImageExportDialogOpen(true)}
        />
        <TopActionButton
          icon={ReceiptText}
          label="Create template"
          onClick={handleOpenTemplateDialog}
        />
        <TopActionButton
          icon={Trash2}
          label="Delete transaction"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-red-500 hover:text-red-500"
        />
      </div>

      <div data-detail-animate="true" className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-3xl border border-border/70 bg-muted/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Source & Classification</p>

          <div className="mt-3 space-y-2">
            <SourceRow
              icon={CreditCard}
              label={account?.name || "Unknown account"}
              hint={
                accountBalanceAfter != null
                  ? `${accountTypeLabel} • ${formatCurrency(accountBalanceAfter)}`
                  : accountTypeLabel
              }
              iconAccent={false}
              onClick={onAccountClick ? () => onAccountClick(transaction.accountId) : undefined}
            />
            <div className="border-t border-border/70" />
            <SourceRow
              icon={Tag}
              label={transaction.category}
              hint="Filter by category"
              iconAccent
              onClick={onCategoryClick ? () => onCategoryClick(transaction.category) : undefined}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetaChip
              icon={ReceiptText}
              label="Receipts"
              value={receiptCount > 0 ? `${receiptCount} file${receiptCount === 1 ? "" : "s"}` : "No files"}
            />
            <MetaChip
              icon={CreditCard}
              label="Balance Before"
              value={accountBalanceBefore != null ? formatCurrency(accountBalanceBefore) : "N/A"}
            />
            {transaction.recurringId && (
              <MetaChip
                icon={Repeat2}
                label="Recurring"
                value={recurringSource?.description || "Linked rule"}
              />
            )}
            {budgetContext && (
              <MetaChip
                icon={Tag}
                label="Budget"
                value={budgetContext.name}
              />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-muted/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Notes & Tags</p>
          <div className="mt-2 rounded-xl border border-border/70 bg-background/90 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Party</p>
            <p className="mt-1 text-sm font-medium text-foreground">{transaction.party || "Not specified"}</p>
          </div>
          {(recurringSource || templateSource) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {recurringSource ? `Part of recurring rule: ${recurringSource.description}` : ""}
              {recurringSource && templateSource ? " • " : ""}
              {templateSource ? `Created from template: ${templateSource.name}` : ""}
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {transaction.notes || "No notes added for this transaction."}
          </p>

          {transaction.tags && transaction.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {transaction.tags.map(tag => (
                <span
                  key={`${transaction.id}-${tag}`}
                  className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section
        data-detail-animate="true"
        className="rounded-3xl border border-border/70 bg-gradient-to-b from-muted/20 via-card to-card p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Category Insights</p>
          <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
            <button
              type="button"
              onClick={() => setInsightScope("transaction_month")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                insightScope === "transaction_month" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setInsightScope("last_3_months")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                insightScope === "last_3_months" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              3M
            </button>
            <button
              type="button"
              onClick={() => setInsightScope("all_time")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                insightScope === "all_time" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              All
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(categoryNetTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              In {categoryScopedStats?.scopeLabel || "selected scope"} for {transaction.category}
            </p>
            <p className={cn(
              "mt-1 text-xs font-medium",
              scopeComparableCount <= 1 && "text-muted-foreground",
              scopeComparableCount > 1 && categoryDeltaPercent > 0 && "text-red-500",
              scopeComparableCount > 1 && categoryDeltaPercent < 0 && "text-emerald-500",
              scopeComparableCount > 1 && categoryDeltaPercent === 0 && "text-muted-foreground"
            )}>
              {categoryDeltaLabel}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              W1-W4 are weekly totals in {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}; NOW is this transaction amount.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {categoryScopedStats?.count || 0} total
          </div>
        </div>

        <div className="flex h-28 items-end gap-2">
          {categoryTrendBars.map(item => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn(
                "relative w-full overflow-hidden rounded-lg border border-border/70 bg-muted/60",
                item.isCurrent && "bg-primary/20 ring-1 ring-primary/50"
              )}
              title={`${item.label}: ${formatCurrency(isIncome ? item.value : -item.value)}`}
              style={{ height: `${item.heightPercent}%` }}>
                <div
                  className={cn(
                    "absolute bottom-0 w-full rounded-b-lg",
                    item.isCurrent ? "bg-primary" : "bg-muted-foreground/35"
                  )}
                  style={{ height: `${Math.max(25, Math.round(item.heightPercent * 0.75))}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium text-muted-foreground",
                item.isCurrent && "font-semibold text-primary"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section data-detail-animate="true" className="rounded-3xl border border-border/70 bg-muted/10 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{relatedScopeLabel}</p>
          <div className="inline-flex items-center rounded-md border border-border/70 bg-background/70 p-0.5">
            <button
              type="button"
              onClick={() => setRelatedScope("category")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                relatedScope === "category" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              Category
            </button>
            <button
              type="button"
              onClick={() => setRelatedScope("party")}
              disabled={!transaction.party}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                relatedScope === "party" ? "bg-primary/20 text-primary" : "text-muted-foreground",
                !transaction.party && "cursor-not-allowed opacity-40"
              )}
            >
              Party
            </button>
            <button
              type="button"
              onClick={() => setRelatedScope("account")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium",
                relatedScope === "account" ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              Account
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {relatedTransactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No related transactions yet.</p>
          ) : (
            relatedTransactions.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card/80 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(item.date)}</p>
                </div>
                <p className={cn(
                  "text-sm font-semibold",
                  item.type === "income" ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {budgetContext && (
        <section data-detail-animate="true" className="rounded-3xl border border-border/70 bg-muted/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Budget Impact</p>
            <p className="text-xs font-medium text-foreground">{budgetContext.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.min(999, Math.max(0, budgetProgress))}% used • {formatCurrency(Math.max(0, budgetAllocated - budgetSpent))} remaining
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div
              className={cn("h-full", budgetProgress > 100 ? "bg-red-500" : "bg-primary")}
              style={{ width: `${Math.min(100, Math.max(0, budgetProgress))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{formatCurrency(budgetSpent)} / {formatCurrency(budgetAllocated)}</p>
        </section>
      )}

      {partyHistory && (
        <section data-detail-animate="true" className="rounded-3xl border border-border/70 bg-muted/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Party History</p>
          <p className="mt-2 text-sm text-foreground">
            {partyHistory.count} transaction{partyHistory.count === 1 ? "" : "s"} with {transaction.party}
          </p>
          <p className="text-xs text-muted-foreground">{formatCurrency(-partyHistory.total)} total spent</p>
        </section>
      )}

      {duplicateMatches.length > 0 && (
        <section data-detail-animate="true" className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-500">
            <TriangleAlert className="h-4 w-4" />
            Potential duplicate transaction
          </p>
          <p className="mt-1 text-xs text-amber-500/90">
            Found {duplicateMatches.length} similar transaction{duplicateMatches.length === 1 ? "" : "s"} on the same day.
          </p>
        </section>
      )}

      {receiptCount > 0 && (
        <section data-detail-animate="true" className="rounded-3xl border border-border/70 bg-muted/10 p-4">
          <ReceiptViewer transactionId={transaction.id} />
        </section>
      )}

      {transaction.splits && transaction.splits.length > 0 && (
        <div data-detail-animate="true" className="mt-3">
          <SplitViewer
            splits={transaction.splits}
            totalAmount={Math.abs(transaction.amount)}
            onMarkPaid={handleMarkSplitPaid}
            onCreateSettlements={handleCreateSettlements}
            readonly={false}
          />
        </div>
      )}

      <div data-detail-animate="true" className="pointer-events-none sticky bottom-3 mt-5">
        <Button
          type="button"
          onClick={() => openEditDialog("general")}
          className={cn(
            "pointer-events-auto h-11 bg-primary text-black shadow-lg shadow-primary/20 hover:bg-primary/90",
            isMobile ? "w-full rounded-xl" : "ml-auto rounded-full px-5"
          )}
        >
          <FilePlus2 className="h-4.5 w-4.5" />
          Edit Transaction
        </Button>
      </div>

      <div data-detail-animate="true" className="rounded-xl border border-border/70 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
        {transaction.createdAt
          ? `Created: ${formatDate(transaction.createdAt)}`
          : `Recorded on ${formatDate(transaction.date)}`}{" "}
        •{" "}
        {transaction.updatedAt ? `Edited: ${formatDate(transaction.updatedAt)}` : "Not edited"}
      </div>

      {detailDialogs}
    </div>
  )
}

function SourceRow({
  icon: Icon,
  label,
  hint,
  iconAccent = false,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint: string
  iconAccent?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-left",
        onClick ? "hover:bg-muted/40 transition-colors" : "cursor-default"
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg",
          iconAccent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {onClick ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
    </button>
  )
}

function MetaChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/85 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function TopActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
  iconClassName,
}: {
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  className?: string
  iconClassName?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 w-9 rounded-full border-border/70 bg-card/90 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        className
      )}
      aria-label={label}
      title={label}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </Button>
  )
}
