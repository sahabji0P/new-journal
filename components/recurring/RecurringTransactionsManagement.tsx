"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/AppContext"
import { cn } from "@/lib/utils"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { RecurringTransaction, Transaction } from "@/lib/types"
import { Edit, Plus, Repeat, Trash2, AlertCircle, Check, History, Eye, ArrowUpDown } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { TransactionFormModern } from "@/components/transactions/TransactionFormModern"

const DEFAULT_RECURRING_FORM = {
  description: "",
  amount: "",
  category: "",
  type: "expense" as "income" | "expense",
  accountId: "",
  frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
  startDate: new Date().toISOString().split("T")[0],
  isActive: true,
  autoCreate: true,
  reminderDays: "3",
  notes: "",
  tags: "",
}

type QuickCompleteDraft = {
  description: string
  amount: string
  category: string
  type: "income" | "expense"
  accountId: string
  date: string
  notes: string
  tags: string
}

type HistorySortKey = "date" | "description" | "category" | "account" | "amount"
type SortDirection = "asc" | "desc"

const EMPTY_QUICK_COMPLETE_DRAFT: QuickCompleteDraft = {
  description: "",
  amount: "",
  category: "",
  type: "expense",
  accountId: "",
  date: "",
  notes: "",
  tags: "",
}

function normalizeTagsFromText(raw: string): string[] {
  return raw
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean)
}

function withRecurringTag(tags: string[]): string[] {
  if (tags.some(tag => tag.toLowerCase() === "recurring")) return tags
  return [...tags, "recurring"]
}

function normalizeTagSet(tags: string[]): string {
  return [...new Set(tags.map(tag => tag.toLowerCase()))].sort().join("|")
}

type RecurringFormData = typeof DEFAULT_RECURRING_FORM
type RecurringFormProps = {
  formData: RecurringFormData
  setFormData: React.Dispatch<React.SetStateAction<RecurringFormData>>
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string }[]
}

function RecurringTransactionForm({ formData, setFormData, accounts, categories }: RecurringFormProps) {
  const frequencyLabel: Record<string, string> = {
    daily: "day", weekly: "week", biweekly: "2 weeks",
    monthly: "month", quarterly: "quarter", yearly: "year",
  }

  return (
    <div className="space-y-5">
      {/* Type Toggle + Amount */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(["expense", "income"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: t }))}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors",
                formData.type === t
                  ? t === "expense"
                    ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
                    : "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-baseline gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            className="h-14 text-2xl font-bold font-mono border-none bg-muted/30 rounded-xl text-center"
          />
          <span className="shrink-0 text-sm text-muted-foreground font-medium">
            / {frequencyLabel[formData.frequency] || formData.frequency}
          </span>
        </div>
      </div>

      {/* Description */}
      <div>
        <FieldLabel htmlFor="rec-description">Description</FieldLabel>
        <Input
          id="rec-description"
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g. Netflix, Rent, Salary"
          className="mt-1.5 rounded-xl"
        />
      </div>

      {/* Billing Section */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Billing</p>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">First payment</p>
            <p className="text-xs text-muted-foreground">When does this start?</p>
          </div>
          <Input
            type="date"
            value={formData.startDate}
            onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="rounded-xl bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium mb-2">Repeat cycle</p>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, frequency: f }))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  formData.frequency === f
                    ? "bg-primary text-primary-foreground ring-1 ring-primary/50"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {f === "biweekly" ? "Bi-weekly" : f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Payment method</p>
            <p className="text-xs text-muted-foreground">Account to charge</p>
          </div>
          <Select
            value={formData.accountId}
            onValueChange={value => setFormData(prev => ({ ...prev, accountId: value }))}
          >
            <SelectTrigger className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none gap-1.5 focus:ring-0">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Category</p>
            <p className="text-xs text-muted-foreground">Spending category</p>
          </div>
          <Select
            value={formData.category}
            onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger className="w-auto border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none gap-1.5 focus:ring-0">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Settings</p>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Enable this recurring rule</p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Auto-create</p>
            <p className="text-xs text-muted-foreground">Create transaction on due date</p>
          </div>
          <Switch
            checked={formData.autoCreate}
            onCheckedChange={checked => setFormData(prev => ({ ...prev, autoCreate: checked }))}
          />
        </div>

        {!formData.autoCreate && (
          <div className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Remind before</p>
              <p className="text-xs text-muted-foreground">Days before due date</p>
            </div>
            <Input
              type="number"
              min="0"
              max="30"
              value={formData.reminderDays}
              onChange={e => setFormData(prev => ({ ...prev, reminderDays: e.target.value }))}
              className="w-16 border-none bg-transparent text-right text-sm font-medium p-0 h-auto shadow-none focus-visible:ring-0"
            />
          </div>
        )}
      </div>

      {/* Notes & Tags */}
      <div className="space-y-3">
        <div>
          <FieldLabel htmlFor="rec-notes">Notes (optional)</FieldLabel>
          <Input
            id="rec-notes"
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional details"
            className="mt-1.5 rounded-xl"
          />
        </div>
        <div>
          <FieldLabel htmlFor="rec-tags">Tags (optional)</FieldLabel>
          <Input
            id="rec-tags"
            value={formData.tags}
            onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            placeholder="comma-separated, e.g. subscription, essential"
            className="mt-1.5 rounded-xl"
          />
        </div>
      </div>
    </div>
  )
}

export function RecurringTransactionsManagement() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    addTransaction,
    deleteTransaction,
    transactions,
    accounts,
    categories,
    formatCurrency,
    formatDate,
  } = useApp()

  // Calculate next due date based on frequency
  const calculateNextDueDate = (currentDueDate: string, frequency: string): string => {
    const date = new Date(currentDueDate)
    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + 1)
        break
      case "weekly":
        date.setDate(date.getDate() + 7)
        break
      case "biweekly":
        date.setDate(date.getDate() + 14)
        break
      case "monthly":
        date.setMonth(date.getMonth() + 1)
        break
      case "quarterly":
        date.setMonth(date.getMonth() + 3)
        break
      case "yearly":
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    return date.toISOString().split("T")[0]
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQuickCompleteDialogOpen, setIsQuickCompleteDialogOpen] = useState(false)
  const [isSaveScopeDialogOpen, setIsSaveScopeDialogOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringTransaction | null>(null)
  const [quickCompleteSource, setQuickCompleteSource] = useState<RecurringTransaction | null>(null)
  const [quickCompleteDraft, setQuickCompleteDraft] = useState<QuickCompleteDraft>(EMPTY_QUICK_COMPLETE_DRAFT)
  const [isHistoryEditDialogOpen, setIsHistoryEditDialogOpen] = useState(false)
  const [isHistoryDeleteDialogOpen, setIsHistoryDeleteDialogOpen] = useState(false)
  const [selectedHistoryTransaction, setSelectedHistoryTransaction] = useState<Transaction | null>(null)
  const [historyTransactionFormSeed, setHistoryTransactionFormSeed] = useState(0)
  const [isRuleHistoryDialogOpen, setIsRuleHistoryDialogOpen] = useState(false)
  const [selectedRecurringForHistory, setSelectedRecurringForHistory] = useState<RecurringTransaction | null>(null)
  const [historySortKey, setHistorySortKey] = useState<HistorySortKey>("date")
  const [historySortDirection, setHistorySortDirection] = useState<SortDirection>("desc")

  const [formData, setFormData] = useState(DEFAULT_RECURRING_FORM)
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const editFormGuard = useFormCloseGuard<typeof formData>()

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "biweekly":
        return "Bi-weekly"
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "yearly":
        return "Yearly"
      default:
        return frequency
    }
  }

  const getDaysUntilDue = (nextDueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(nextDueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleAddRecurring = () => {
    if (!formData.description || !formData.amount || !formData.category || !formData.accountId || !formData.startDate) return

    const account = accounts.find(a => a.id === formData.accountId)
    if (!account) return

    const finalAmount =
      formData.type === "expense"
        ? -Math.abs(Number.parseFloat(formData.amount))
        : Math.abs(Number.parseFloat(formData.amount))

    const tagArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t)

    const recurringTags = tagArray.length > 0 ? tagArray : []
    const recurringTagsWithLabel = recurringTags.some(t => t.toLowerCase() === "recurring")
      ? recurringTags
      : [...recurringTags, "recurring"]

    addRecurringTransaction({
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      frequency: formData.frequency,
      startDate: formData.startDate,
      isActive: formData.isActive,
      autoCreate: formData.autoCreate,
      reminderDays: formData.reminderDays ? Number.parseInt(formData.reminderDays) : undefined,
      notes: formData.notes.trim() || undefined,
      tags: recurringTags.length > 0 ? recurringTags : undefined,
    })

    // Auto-create the first transaction for the start date
    addTransaction({
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      date: new Date(formData.startDate).toISOString(),
      notes: formData.notes.trim() || undefined,
      tags: recurringTagsWithLabel,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditRecurring = () => {
    if (!selectedRecurring || !formData.description || !formData.amount || !formData.category || !formData.accountId) return

    const account = accounts.find(a => a.id === formData.accountId)
    if (!account) return

    const finalAmount =
      formData.type === "expense"
        ? -Math.abs(Number.parseFloat(formData.amount))
        : Math.abs(Number.parseFloat(formData.amount))

    const tagArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t)

    updateRecurringTransaction(selectedRecurring.id, {
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      frequency: formData.frequency,
      startDate: formData.startDate,
      isActive: formData.isActive,
      autoCreate: formData.autoCreate,
      reminderDays: formData.reminderDays ? Number.parseInt(formData.reminderDays) : undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    editFormGuard.clearSnapshot()
    resetForm()
    setIsEditDialogOpen(false)
    setSelectedRecurring(null)
  }

  const handleDeleteRecurring = () => {
    if (!selectedRecurring) return

    deleteRecurringTransaction(selectedRecurring.id)
    setIsDeleteDialogOpen(false)
    setSelectedRecurring(null)
  }

  const resetForm = () => {
    setFormData(DEFAULT_RECURRING_FORM)
  }

  const openEditDialog = (recurring: RecurringTransaction) => {
    const editData = {
      description: recurring.description,
      amount: Math.abs(recurring.amount).toString(),
      category: recurring.category,
      type: recurring.type,
      accountId: recurring.accountId.toString(),
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      isActive: recurring.isActive,
      autoCreate: recurring.autoCreate,
      reminderDays: recurring.reminderDays?.toString() || "3",
      notes: recurring.notes || "",
      tags: recurring.tags?.join(", ") || "",
    }
    setSelectedRecurring(recurring)
    setFormData(editData)
    editFormGuard.rememberSnapshot(editData)
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData(DEFAULT_RECURRING_FORM)
    addFormGuard.rememberSnapshot(DEFAULT_RECURRING_FORM)
    setIsAddDialogOpen(true)
  }

  useEffect(() => {
    if (searchParams.get("action") !== "add") return

    setFormData(DEFAULT_RECURRING_FORM)
    addFormGuard.rememberSnapshot(DEFAULT_RECURRING_FORM)
    setIsAddDialogOpen(true)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("action")
    const nextPath = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    router.replace(nextPath, { scroll: false })
  }, [addFormGuard, pathname, router, searchParams])

  const handleAddDialogChange = (open: boolean) => {
    if (open) {
      setIsAddDialogOpen(true)
      return
    }
    if (!addFormGuard.confirmClose(formData)) return
    addFormGuard.clearSnapshot()
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEditDialogChange = (open: boolean) => {
    if (open) {
      setIsEditDialogOpen(true)
      return
    }
    if (!editFormGuard.confirmClose(formData)) return
    editFormGuard.clearSnapshot()
    setIsEditDialogOpen(false)
    setSelectedRecurring(null)
    resetForm()
  }

  const openDeleteDialog = (recurring: RecurringTransaction) => {
    setSelectedRecurring(recurring)
    setIsDeleteDialogOpen(true)
  }

  const openQuickCompleteDialog = (recurring: RecurringTransaction) => {
    setQuickCompleteSource(recurring)
    setQuickCompleteDraft({
      description: recurring.description,
      amount: Math.abs(recurring.amount).toString(),
      category: recurring.category,
      type: recurring.type,
      accountId: recurring.accountId.toString(),
      date: new Date().toISOString().split("T")[0],
      notes: recurring.notes || `Recurring: ${recurring.description}`,
      tags: withRecurringTag(recurring.tags || []).join(", "),
    })
    setIsQuickCompleteDialogOpen(true)
  }

  const isQuickCompleteEdited = () => {
    if (!quickCompleteSource) return false

    const sourceTags = withRecurringTag(quickCompleteSource.tags || [])
    const draftTags = withRecurringTag(normalizeTagsFromText(quickCompleteDraft.tags))
    const sourceAmount = Math.abs(quickCompleteSource.amount)
    const draftAmount = Number.parseFloat(quickCompleteDraft.amount || "0")

    return (
      quickCompleteDraft.description.trim() !== quickCompleteSource.description.trim() ||
      quickCompleteDraft.category.trim() !== quickCompleteSource.category.trim() ||
      quickCompleteDraft.type !== quickCompleteSource.type ||
      quickCompleteDraft.accountId !== quickCompleteSource.accountId ||
      Math.abs(draftAmount - sourceAmount) > 0.0001 ||
      (quickCompleteDraft.notes || "").trim() !== (quickCompleteSource.notes || `Recurring: ${quickCompleteSource.description}`).trim() ||
      normalizeTagSet(sourceTags) !== normalizeTagSet(draftTags)
    )
  }

  const resetQuickCompleteState = () => {
    setIsQuickCompleteDialogOpen(false)
    setIsSaveScopeDialogOpen(false)
    setQuickCompleteSource(null)
    setQuickCompleteDraft(EMPTY_QUICK_COMPLETE_DRAFT)
  }

  const createFromRecurringDraft = (applyEditsToRecurring: boolean) => {
    if (!quickCompleteSource) return
    if (!quickCompleteDraft.description || !quickCompleteDraft.amount || !quickCompleteDraft.accountId || !quickCompleteDraft.category) {
      return
    }

    const account = accounts.find(a => a.id === quickCompleteDraft.accountId)
    if (!account) return

    const parsedAmount = Number.parseFloat(quickCompleteDraft.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    const signedAmount =
      quickCompleteDraft.type === "expense"
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount)

    const tags = withRecurringTag(normalizeTagsFromText(quickCompleteDraft.tags))

    addTransaction({
      description: quickCompleteDraft.description.trim(),
      amount: signedAmount,
      date: quickCompleteDraft.date || new Date().toISOString().split("T")[0],
      category: quickCompleteDraft.category.trim(),
      type: quickCompleteDraft.type,
      accountId: account.id,
      accountName: account.name,
      notes: quickCompleteDraft.notes.trim() || `Recurring: ${quickCompleteDraft.description.trim()}`,
      tags,
      recurringId: quickCompleteSource.id,
    })

    const nextDueDate = calculateNextDueDate(quickCompleteSource.nextDueDate, quickCompleteSource.frequency)
    const recurringUpdatePayload: Partial<RecurringTransaction> = { nextDueDate }

    if (applyEditsToRecurring) {
      recurringUpdatePayload.description = quickCompleteDraft.description.trim()
      recurringUpdatePayload.amount = signedAmount
      recurringUpdatePayload.category = quickCompleteDraft.category.trim()
      recurringUpdatePayload.type = quickCompleteDraft.type
      recurringUpdatePayload.accountId = account.id
      recurringUpdatePayload.accountName = account.name
      recurringUpdatePayload.notes = quickCompleteDraft.notes.trim() || undefined
      recurringUpdatePayload.tags = tags
    }

    updateRecurringTransaction(quickCompleteSource.id, recurringUpdatePayload)
    resetQuickCompleteState()
  }

  const handleQuickCompleteSave = () => {
    if (isQuickCompleteEdited()) {
      setIsSaveScopeDialogOpen(true)
      return
    }
    createFromRecurringDraft(false)
  }

  const openHistoryEditDialog = (transaction: Transaction) => {
    setSelectedHistoryTransaction(transaction)
    setHistoryTransactionFormSeed(previous => previous + 1)
    setIsHistoryEditDialogOpen(true)
  }

  const closeHistoryEditDialog = () => {
    setIsHistoryEditDialogOpen(false)
    setSelectedHistoryTransaction(null)
  }

  const openHistoryDeleteDialog = (transaction: Transaction) => {
    setSelectedHistoryTransaction(transaction)
    setIsHistoryDeleteDialogOpen(true)
  }

  const handleHistoryDelete = () => {
    if (!selectedHistoryTransaction) return
    deleteTransaction(selectedHistoryTransaction.id)
    setIsHistoryDeleteDialogOpen(false)
    setSelectedHistoryTransaction(null)
  }

  const openRuleHistoryDialog = (recurring: RecurringTransaction) => {
    setSelectedRecurringForHistory(recurring)
    setIsRuleHistoryDialogOpen(true)
  }

  const activeRecurring = recurringTransactions.filter(r => r.isActive)
  const inactiveRecurring = recurringTransactions.filter(r => !r.isActive)
  const upcomingDue = recurringTransactions
    .filter(r => r.isActive && getDaysUntilDue(r.nextDueDate) <= 7 && getDaysUntilDue(r.nextDueDate) >= 0)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  const recurringHistoryForSelectedRule = useMemo(() => {
    if (!selectedRecurringForHistory) return []
    return transactions
      .filter(transaction => transaction.recurringId === selectedRecurringForHistory.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedRecurringForHistory, transactions])

  const sortedRecurringHistoryForSelectedRule = useMemo(() => {
    const rows = [...recurringHistoryForSelectedRule]
    rows.sort((a, b) => {
      let comparison = 0
      switch (historySortKey) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case "amount":
          comparison = a.amount - b.amount
          break
        case "description":
          comparison = a.description.localeCompare(b.description)
          break
        case "category":
          comparison = a.category.localeCompare(b.category)
          break
        case "account":
          comparison = (a.accountName || "").localeCompare(b.accountName || "")
          break
      }
      return historySortDirection === "asc" ? comparison : -comparison
    })
    return rows
  }, [historySortDirection, historySortKey, recurringHistoryForSelectedRule])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Recurring</CardDescription>
            <CardTitle className="text-2xl">{recurringTransactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{activeRecurring.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-gray-500">{inactiveRecurring.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Due This Week</CardDescription>
            <CardTitle className="text-2xl text-amber-500">{upcomingDue.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Upcoming Transactions */}
      {upcomingDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Upcoming This Week
            </CardTitle>
            <CardDescription>Recurring transactions due within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDue.map(recurring => {
                const daysUntil = getDaysUntilDue(recurring.nextDueDate)
                return (
                  <div
                    key={recurring.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold font-mono">{recurring.description}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {recurring.category} • {getFrequencyLabel(recurring.frequency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <p className={`font-bold font-mono ${recurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(recurring.amount)}
                        </p>
                        <p className="text-xs text-amber-600 font-mono">
                          {daysUntil === 0 ? "Due today" : daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil} days`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openQuickCompleteDialog(recurring)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Pay
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>Track and manage recurring rules, then open history on demand.</CardDescription>
            </div>
            <Button onClick={openAddDialog} className="w-full gap-2 sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Recurring
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No recurring transactions yet. Add your first recurring transaction.
              </p>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add First Recurring
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recurringTransactions.map(recurring => {
                const daysUntil = getDaysUntilDue(recurring.nextDueDate)
                const isDueSoon = daysUntil <= 3 && daysUntil >= 0
                const dueLabel = daysUntil < 0
                  ? `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"}`
                  : daysUntil === 0
                    ? "Due today"
                    : daysUntil === 1
                      ? "Due tomorrow"
                      : `Due in ${daysUntil} days`

                return (
                  <div
                    key={recurring.id}
                    className={`group rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/30 ${!recurring.isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left: Icon */}
                      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        recurring.type === "income"
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Repeat className="h-4 w-4" />
                      </span>

                      {/* Center: Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{recurring.description}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[recurring.category, recurring.accountName, getFrequencyLabel(recurring.frequency)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {/* Right: Amount */}
                          <p className={`shrink-0 text-sm font-semibold whitespace-nowrap ${
                            recurring.type === "income" ? "text-emerald-500" : "text-foreground"
                          }`}>
                            {formatCurrency(recurring.amount)}
                          </p>
                        </div>

                        {/* Due date + status badges + actions row */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`text-xs ${isDueSoon ? "font-medium text-amber-500" : "text-muted-foreground"}`}>
                            {dueLabel}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {recurring.isActive ? "active" : "inactive"}
                          </span>
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {recurring.autoCreate ? "auto" : "manual"}
                          </span>

                          {/* Actions - pushed right */}
                          <div className="ml-auto flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                              onClick={() => openQuickCompleteDialog(recurring)}
                              title="Create from rule"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openRuleHistoryDialog(recurring)}
                              title="View recurring history"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(recurring)}
                              title="Edit rule"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => openDeleteDialog(recurring)}
                              title="Delete rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isRuleHistoryDialogOpen}
        onOpenChange={(open) => {
          setIsRuleHistoryDialogOpen(open)
          if (!open) setSelectedRecurringForHistory(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Recurring History
            </DialogTitle>
            <DialogDescription>
              {selectedRecurringForHistory
                ? `Transactions created from "${selectedRecurringForHistory.description}".`
                : "Transactions created from this recurring rule."}
            </DialogDescription>
          </DialogHeader>

          {recurringHistoryForSelectedRule.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No transactions have been created from this recurring rule yet.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
                <div className="w-full sm:w-auto">
                  <Select value={historySortKey} onValueChange={(value: HistorySortKey) => setHistorySortKey(value)}>
                    <SelectTrigger className="h-8 w-full sm:w-[180px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Sort by date</SelectItem>
                      <SelectItem value="amount">Sort by amount</SelectItem>
                      <SelectItem value="description">Sort by description</SelectItem>
                      <SelectItem value="category">Sort by category</SelectItem>
                      <SelectItem value="account">Sort by account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setHistorySortDirection(previous => (previous === "asc" ? "desc" : "asc"))}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {historySortDirection === "asc" ? "Ascending" : "Descending"}
                </Button>
              </div>
              <div>
                {sortedRecurringHistoryForSelectedRule.map(transaction => (
                  <div key={transaction.id} className="flex items-center gap-3 rounded-lg py-2.5 px-2 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[transaction.category, transaction.accountName, formatDate(transaction.date)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold whitespace-nowrap ${
                      transaction.type === "income" ? "text-emerald-500" : "text-foreground"
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openHistoryEditDialog(transaction)}
                        title="Edit transaction"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => openHistoryDeleteDialog(transaction)}
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isQuickCompleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetQuickCompleteState()
            return
          }
          setIsQuickCompleteDialogOpen(true)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Before Creating Transaction</DialogTitle>
            <DialogDescription>Edit details if needed, then create this occurrence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="qc-description">Description</FieldLabel>
                <Input
                  id="qc-description"
                  value={quickCompleteDraft.description}
                  onChange={e => setQuickCompleteDraft(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="qc-date">Date</FieldLabel>
                <Input
                  id="qc-date"
                  type="date"
                  value={quickCompleteDraft.date}
                  onChange={e => setQuickCompleteDraft(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="qc-amount">Amount</FieldLabel>
                <Input
                  id="qc-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickCompleteDraft.amount}
                  onChange={e => setQuickCompleteDraft(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel htmlFor="qc-type">Type</FieldLabel>
                <Select
                  value={quickCompleteDraft.type}
                  onValueChange={(value: "income" | "expense") =>
                    setQuickCompleteDraft(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger id="qc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="qc-account">Account</FieldLabel>
                <Select
                  value={quickCompleteDraft.accountId}
                  onValueChange={value => setQuickCompleteDraft(prev => ({ ...prev, accountId: value }))}
                >
                  <SelectTrigger id="qc-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="qc-category">Category</FieldLabel>
                <Select
                  value={quickCompleteDraft.category}
                  onValueChange={value => setQuickCompleteDraft(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="qc-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="qc-tags">Tags</FieldLabel>
              <Input
                id="qc-tags"
                value={quickCompleteDraft.tags}
                onChange={e => setQuickCompleteDraft(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="comma-separated tags"
              />
            </div>

            <div>
              <FieldLabel htmlFor="qc-notes">Notes</FieldLabel>
              <Input
                id="qc-notes"
                value={quickCompleteDraft.notes}
                onChange={e => setQuickCompleteDraft(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetQuickCompleteState}>
                Cancel
              </Button>
              <Button onClick={handleQuickCompleteSave}>Create Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveScopeDialogOpen} onOpenChange={setIsSaveScopeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply edits to recurring rule?</DialogTitle>
            <DialogDescription>
              You changed recurring details. Should this update future occurrences too?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsSaveScopeDialogOpen(false)
                createFromRecurringDraft(false)
              }}
            >
              This transaction only
            </Button>
            <Button
              onClick={() => {
                setIsSaveScopeDialogOpen(false)
                createFromRecurringDraft(true)
              }}
            >
              Update recurring and create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryEditDialogOpen} onOpenChange={setIsHistoryEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update this transaction and save your changes.
            </DialogDescription>
          </DialogHeader>
          {selectedHistoryTransaction && (
            <TransactionFormModern
              key={`recurring-history-edit-${selectedHistoryTransaction.id}-${historyTransactionFormSeed}`}
              mode="edit"
              initial={selectedHistoryTransaction}
              onSubmit={closeHistoryEditDialog}
              onCancel={closeHistoryEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDeleteDialogOpen} onOpenChange={setIsHistoryDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {selectedHistoryTransaction && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{selectedHistoryTransaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedHistoryTransaction.date)} • {selectedHistoryTransaction.category}
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    selectedHistoryTransaction.type === "income" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(selectedHistoryTransaction.amount)}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsHistoryDeleteDialogOpen(false)
                    setSelectedHistoryTransaction(null)
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleHistoryDelete}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Recurring Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
            <DialogDescription>Create a new recurring income or expense</DialogDescription>
          </DialogHeader>
          <RecurringTransactionForm
            formData={formData}
            setFormData={setFormData}
            accounts={accounts}
            categories={categories}
          />

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <Button variant="outline" onClick={() => handleAddDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecurring}>Add Recurring Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recurring Transaction</DialogTitle>
            <DialogDescription>Update recurring transaction details</DialogDescription>
          </DialogHeader>
          <RecurringTransactionForm
            formData={formData}
            setFormData={setFormData}
            accounts={accounts}
            categories={categories}
          />

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <Button variant="outline" onClick={() => handleEditDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRecurring}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRecurring && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedRecurring.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono">{selectedRecurring.description}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedRecurring.category} • {getFrequencyLabel(selectedRecurring.frequency)}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className={`font-medium ${selectedRecurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(selectedRecurring.amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedRecurring(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecurring}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
