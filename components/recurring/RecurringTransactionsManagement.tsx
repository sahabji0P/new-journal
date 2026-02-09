"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { RecurringTransaction } from "@/lib/types"
import { Edit, Plus, Repeat, Trash2, AlertCircle, Check, History } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const DEFAULT_RECURRING_FORM = {
  description: "",
  amount: "",
  category: "",
  type: "expense" as "income" | "expense",
  accountId: "",
  frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
  startDate: "",
  endDate: "",
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
  const [highlightedRecurringId, setHighlightedRecurringId] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

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
    if (!formData.description || !formData.amount || !formData.accountId || !formData.startDate) return

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

    addRecurringTransaction({
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      autoCreate: formData.autoCreate,
      reminderDays: formData.reminderDays ? Number.parseInt(formData.reminderDays) : undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditRecurring = () => {
    if (!selectedRecurring || !formData.description || !formData.amount || !formData.accountId) return

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
      endDate: formData.endDate || undefined,
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
      endDate: recurring.endDate || "",
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

  const jumpToRecurringRule = (recurringId: string) => {
    const existingRule = recurringTransactions.find(item => item.id === recurringId)
    if (!existingRule) return

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current)
    }

    setHighlightedRecurringId(recurringId)
    const element = document.getElementById(`recurring-rule-${recurringId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      if (element instanceof HTMLElement) {
        element.focus()
      }
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedRecurringId(current => (current === recurringId ? null : current))
    }, 2200)
  }

  const activeRecurring = recurringTransactions.filter(r => r.isActive)
  const inactiveRecurring = recurringTransactions.filter(r => !r.isActive)
  const upcomingDue = recurringTransactions
    .filter(r => r.isActive && getDaysUntilDue(r.nextDueDate) <= 7 && getDaysUntilDue(r.nextDueDate) >= 0)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  const recurringHistory = transactions
    .filter(transaction => Boolean(transaction.recurringId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Recurring Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>Automate your regular income and expenses</CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Recurring
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 font-mono">
                No recurring transactions yet. Add your first recurring transaction!
              </p>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Recurring Transaction
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringTransactions.map(recurring => {
                const daysUntil = getDaysUntilDue(recurring.nextDueDate)
                const isDueSoon = daysUntil <= 3 && daysUntil >= 0

                return (
                  <div
                    key={recurring.id}
                    id={`recurring-rule-${recurring.id}`}
                    tabIndex={-1}
                    className={`p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors ${
                      !recurring.isActive ? "opacity-60" : ""
                    } ${
                      highlightedRecurringId === recurring.id ? "ring-2 ring-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            recurring.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold font-mono">{recurring.description}</p>
                            {!recurring.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-500 rounded font-mono">
                                Inactive
                              </span>
                            )}
                            {recurring.autoCreate && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded font-mono">
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground font-mono">
                            <span>{recurring.category}</span>
                            <span>•</span>
                            <span>{getFrequencyLabel(recurring.frequency)}</span>
                            <span>•</span>
                            <span>{recurring.accountName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openQuickCompleteDialog(recurring)}
                          title="Mark as paid"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(recurring)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(recurring)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">Amount</p>
                        <p className={`font-bold font-mono ${recurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(recurring.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">Next Due</p>
                        <p className={`font-mono text-sm ${isDueSoon ? "text-amber-600 font-semibold" : ""}`}>
                          {formatDate(recurring.nextDueDate)}
                          {isDueSoon && ` (${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `${daysUntil} days`})`}
                        </p>
                      </div>
                    </div>

                    {recurring.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground font-mono">{recurring.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Recurring History
          </CardTitle>
          <CardDescription>All transactions created from recurring rules.</CardDescription>
        </CardHeader>
        <CardContent>
          {recurringHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No recurring transactions have been created yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium">Account</th>
                    <th className="px-3 py-2 text-left font-medium">Amount</th>
                    <th className="px-3 py-2 text-left font-medium">Rule</th>
                    <th className="px-3 py-2 text-left font-medium">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {recurringHistory.map(transaction => {
                    const linkedRule = transaction.recurringId
                      ? recurringTransactions.find(item => item.id === transaction.recurringId)
                      : null

                    return (
                      <tr key={transaction.id} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(transaction.date)}</td>
                        <td className="px-3 py-2 font-medium">{transaction.description}</td>
                        <td className="px-3 py-2">{transaction.category}</td>
                        <td className="px-3 py-2 text-muted-foreground">{transaction.accountName}</td>
                        <td
                          className={`px-3 py-2 font-semibold ${
                            transaction.type === "income" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-3 py-2">
                          {linkedRule ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => jumpToRecurringRule(linkedRule.id)}
                            >
                              Open rule
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Deleted rule</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {transaction.tags?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {transaction.tags.map(tag => (
                                <span
                                  key={`${transaction.id}-${tag}`}
                                  className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Add Recurring Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
            <DialogDescription>Create a new recurring income or expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="add-description">Description</FieldLabel>
              <Input
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Netflix Subscription, Salary, Rent"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="add-amount">Amount</FieldLabel>
                <Input
                  id="add-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>

              <div>
                <FieldLabel htmlFor="add-type">Type</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="add-type" className="font-mono">
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
                <FieldLabel htmlFor="add-account">Account</FieldLabel>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="add-account" className="font-mono">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel htmlFor="add-category">Category</FieldLabel>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="add-category" className="font-mono">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="add-frequency">Frequency</FieldLabel>
              <Select
                value={formData.frequency}
                onValueChange={(value: typeof formData.frequency) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="add-frequency" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="add-start-date">Start Date</FieldLabel>
                <Input
                  id="add-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <FieldLabel htmlFor="add-end-date">End Date (optional)</FieldLabel>
                <Input
                  id="add-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <FieldLabel htmlFor="add-active" className="cursor-pointer">
                    Active
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this recurring transaction
                  </p>
                </div>
                <Switch
                  id="add-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <FieldLabel htmlFor="add-auto-create" className="cursor-pointer">
                    Auto-create Transactions
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Automatically create transactions on due date
                  </p>
                </div>
                <Switch
                  id="add-auto-create"
                  checked={formData.autoCreate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreate: checked })}
                />
              </div>

              {!formData.autoCreate && (
                <div>
                  <FieldLabel htmlFor="add-reminder-days">Reminder Days</FieldLabel>
                  <Input
                    id="add-reminder-days"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                    placeholder="3"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get reminded this many days before the due date
                  </p>
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="add-notes">Notes (optional)</FieldLabel>
              <Input
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details"
                className="font-mono"
              />
            </div>

            <div>
              <FieldLabel htmlFor="add-tags">Tags (comma-separated, optional)</FieldLabel>
              <Input
                id="add-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., subscription, essential, flexible"
                className="font-mono"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddRecurring}>Add Recurring Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Transaction Dialog - Similar to Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recurring Transaction</DialogTitle>
            <DialogDescription>Update recurring transaction details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Similar form fields as Add Dialog */}
            <div>
              <FieldLabel htmlFor="edit-description">Description</FieldLabel>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="edit-amount">Amount</FieldLabel>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <FieldLabel htmlFor="edit-type">Type</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="edit-type" className="font-mono">
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
                <FieldLabel htmlFor="edit-account">Account</FieldLabel>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="edit-account" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel htmlFor="edit-category">Category</FieldLabel>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit-category" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="edit-frequency">Frequency</FieldLabel>
              <Select
                value={formData.frequency}
                onValueChange={(value: typeof formData.frequency) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="edit-frequency" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="edit-start-date">Start Date</FieldLabel>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <FieldLabel htmlFor="edit-end-date">End Date (optional)</FieldLabel>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <FieldLabel htmlFor="edit-active" className="cursor-pointer">
                    Active
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this recurring transaction
                  </p>
                </div>
                <Switch
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <FieldLabel htmlFor="edit-auto-create" className="cursor-pointer">
                    Auto-create Transactions
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Automatically create transactions on due date
                  </p>
                </div>
                <Switch
                  id="edit-auto-create"
                  checked={formData.autoCreate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreate: checked })}
                />
              </div>

              {!formData.autoCreate && (
                <div>
                  <FieldLabel htmlFor="edit-reminder-days">Reminder Days</FieldLabel>
                  <Input
                    id="edit-reminder-days"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="edit-notes">Notes (optional)</FieldLabel>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="font-mono"
              />
            </div>

            <div>
              <FieldLabel htmlFor="edit-tags">Tags (comma-separated, optional)</FieldLabel>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => handleEditDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditRecurring}>Save Changes</Button>
            </div>
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
