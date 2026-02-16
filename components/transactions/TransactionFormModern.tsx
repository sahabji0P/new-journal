"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useApp } from "@/contexts/AppContext"
import type { Transaction, ExpenseSplit } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog"
import { SplitExpenseForm } from "../splits/SplitExpenseForm"
import { Upload, X, Image as ImageIcon, AlertTriangle } from "lucide-react"
import { toast } from "@/lib/toast"
import Image from "next/image"

type TransactionFormModernProps = {
  mode?: "add" | "edit"
  initial?: Transaction
  prefill?: Partial<Transaction>
  onSubmit?: () => void
  onCancel?: () => void
}

function toDateTimeLocal(dateValue?: string): string {
  const parsed = dateValue ? new Date(dateValue) : new Date()
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}T${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}`
}

const CATEGORY_ICON_OPTIONS = [
  "tag",
  "shopping-bag",
  "utensils",
  "car",
  "home",
  "briefcase",
  "banknote",
]

const ADD_CATEGORY_OPTION = "__add_category__"

export function TransactionFormModern({
  mode = "add",
  initial,
  prefill,
  onSubmit,
  onCancel,
}: TransactionFormModernProps) {
  const {
    accounts,
    categories,
    budgets,
    parties,
    transactions,
    addTransaction,
    updateTransaction,
    addCategory,
    addTemplate,
    addReceipt,
    formatCurrency,
  } = useApp()
  const isMobile = useIsMobile()

  const seed = mode === "edit" ? initial : prefill

  const [type, setType] = useState<"income" | "expense">(seed?.type ?? "expense")
  const [amountStr, setAmountStr] = useState<string>(
    seed?.amount != null ? Math.abs(seed.amount).toString() : ""
  )
  const [accountId, setAccountId] = useState<string>(seed?.accountId?.toString() ?? "")
  const [categoryId, setCategoryId] = useState<string>(seed?.category ?? "")
  const [budgetId, setBudgetId] = useState<string>(seed?.budgetId ?? "")
  const [description, setDescription] = useState<string>(seed?.description ?? "")
  const [party, setParty] = useState<string>(seed?.party ?? "")
  const [note, setNote] = useState<string>(seed?.notes ?? "")
  const [tags, setTags] = useState<string>(seed?.tags?.join(", ") ?? "")
  const [showPartySuggestions, setShowPartySuggestions] = useState(false)
  const [splits, setSplits] = useState<ExpenseSplit[] | undefined>(seed?.splits)
  const [dtLocal, setDtLocal] = useState<string>(() => toDateTimeLocal(seed?.date))
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showCategoryCreator, setShowCategoryCreator] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#64748b")
  const [newCategoryIcon, setNewCategoryIcon] = useState("tag")
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Budget warning state
  const [showBudgetWarning, setShowBudgetWarning] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const initialSnapshotRef = useRef<string>("")

  useEffect(() => {
    const nextSeed = mode === "edit" ? initial : prefill
    setType(nextSeed?.type ?? "expense")
    setAmountStr(nextSeed?.amount != null ? Math.abs(nextSeed.amount).toString() : "")
    setAccountId(nextSeed?.accountId?.toString() ?? "")
    setCategoryId(nextSeed?.category ?? "")
    setBudgetId(nextSeed?.budgetId ?? "")
    setDescription(nextSeed?.description ?? "")
    setParty(nextSeed?.party ?? "")
    setNote(nextSeed?.notes ?? "")
    setTags(nextSeed?.tags?.join(", ") ?? "")
    setSplits(nextSeed?.splits)
    setDtLocal(toDateTimeLocal(nextSeed?.date))
    setSelectedTemplateId(nextSeed?.templateId ?? "")
    setSaveAsTemplate(false)
    setTemplateName(nextSeed?.description ?? "")
    setShowCategoryCreator(false)
    setNewCategoryName("")
    setNewCategoryColor("#64748b")
    setNewCategoryIcon("tag")
    setPendingSubmit(false)
    initialSnapshotRef.current = JSON.stringify({
      type: nextSeed?.type ?? "expense",
      amountStr: nextSeed?.amount != null ? Math.abs(nextSeed.amount).toString() : "",
      accountId: nextSeed?.accountId?.toString() ?? "",
      categoryId: nextSeed?.category ?? "",
      budgetId: nextSeed?.budgetId ?? "",
      description: nextSeed?.description ?? "",
      party: nextSeed?.party ?? "",
      note: nextSeed?.notes ?? "",
      tags: nextSeed?.tags?.join(", ") ?? "",
      dtLocal: toDateTimeLocal(nextSeed?.date),
      saveAsTemplate: false,
      templateName: nextSeed?.description ?? "",
      newCategoryName: "",
      newCategoryColor: "#64748b",
      newCategoryIcon: "tag",
      receiptName: "",
    })
  }, [mode, initial, prefill])

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = JSON.stringify({
      type,
      amountStr,
      accountId,
      categoryId,
      budgetId,
      description,
      party,
      note,
      tags,
      dtLocal,
      saveAsTemplate,
      templateName,
      newCategoryName,
      newCategoryColor,
      newCategoryIcon,
      receiptName: receiptFile?.name ?? "",
    })

    return initialSnapshotRef.current !== "" && currentSnapshot !== initialSnapshotRef.current
  }, [
    type,
    amountStr,
    accountId,
    categoryId,
    budgetId,
    description,
    party,
    note,
    tags,
    dtLocal,
    saveAsTemplate,
    templateName,
    newCategoryName,
    newCategoryColor,
    newCategoryIcon,
    receiptFile,
  ])

  const handleAttemptCancel = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("You have unsaved changes. Press OK to discard them or Cancel to stay on this form.")
    ) {
      return
    }

    onCancel?.()
  }

  const amount = useMemo(() => {
    const n = Number(amountStr)
    return isFinite(n) ? Math.abs(n) : 0
  }, [amountStr])

  const currentBalance = useMemo(() => {
    if (!accountId) return 0
    const account = accounts.find((a) => a.id === accountId)
    return account?.balance || 0
  }, [accountId, accounts])

  const afterBalance = useMemo(() => {
    return type === "income" ? currentBalance + amount : currentBalance - amount
  }, [currentBalance, type, amount])

  const selectedBudget = useMemo(() => {
    if (!budgetId) return null
    return budgets.find((b) => b.id === budgetId)
  }, [budgetId, budgets])

  const budgetUsed = useMemo(() => {
    return selectedBudget?.totalSpent || 0
  }, [selectedBudget])

  const budgetLimit = useMemo(() => {
    return selectedBudget?.totalAllocated || 0
  }, [selectedBudget])

  const afterBudgetUsed = useMemo(() => {
    return type === "expense" ? budgetUsed + amount : budgetUsed
  }, [budgetUsed, amount, type])

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === type || c.type === "both")
  }, [categories, type])

  const partySuggestions = useMemo(() => {
    const q = party.trim().toLowerCase()
    if (!q) return parties.slice(0, 8)
    return parties.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [party, parties])

  const popularCategorySuggestions = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    transactions
      .filter(transaction => transaction.type === type)
      .forEach(transaction => {
        categoryCounts.set(transaction.category, (categoryCounts.get(transaction.category) || 0) + 1)
      })

    return [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter(name => filteredCategories.some(category => category.name === name))
      .slice(0, 4)
  }, [transactions, type, filteredCategories])

  const duplicateCategory = useMemo(() => {
    const normalized = newCategoryName.trim().toLowerCase()
    if (!normalized) return undefined
    return categories.find(category => category.name.toLowerCase() === normalized)
  }, [categories, newCategoryName])

  // Auto-detect budget from category
  const autoBudget = useMemo(() => {
    if (!categoryId || type !== "expense") return null

    for (const budget of budgets) {
      const subBudget = budget.subBudgets.find(sb => sb.category === categoryId)
      if (subBudget) {
        return {
          budget,
          subBudget,
          wouldExceed: (subBudget.spent + amount) > subBudget.allocated,
          exceededBy: Math.max(0, (subBudget.spent + amount) - subBudget.allocated),
          newTotal: subBudget.spent + amount,
        }
      }
    }
    return null
  }, [categoryId, type, budgets, amount])

  const handleCreateCategory = async () => {
    const normalizedName = newCategoryName.trim()
    if (!normalizedName) return

    if (duplicateCategory) {
      setCategoryId(duplicateCategory.name)
      setShowCategoryCreator(false)
      setNewCategoryName("")
      return
    }

    setIsCreatingCategory(true)
    try {
      await addCategory({
        name: normalizedName,
        type,
        color: newCategoryColor,
        icon: newCategoryIcon,
        isDefault: false,
      })
      setCategoryId(normalizedName)
      setShowCategoryCreator(false)
      setNewCategoryName("")
      setNewCategoryColor("#64748b")
      setNewCategoryIcon("tag")
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const canSubmit = !!accountId && !!categoryId && amount > 0 && dtLocal && description.trim()

  const handleCategorySelect = (value: string) => {
    if (value === ADD_CATEGORY_OPTION) {
      setShowCategoryCreator(true)
      return
    }

    setCategoryId(value)
    if (value) {
      setShowCategoryCreator(false)
    }
  }

  const handleReceiptSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.warning("Please upload an image file")
      return
    }

    // Check file size (max 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      toast.warning("Image size must be less than 2MB")
      return
    }

    setReceiptFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setReceiptPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleReceiptRemove = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleBudgetWarningConfirm = () => {
    setShowBudgetWarning(false)
    setPendingSubmit(true)
    // Trigger form submission
    const form = document.querySelector("form")
    if (form) {
      form.requestSubmit()
    }
  }

  const handleBudgetWarningCancel = () => {
    setShowBudgetWarning(false)
    setPendingSubmit(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    // Check if budget would be exceeded and user hasn't confirmed yet
    if (autoBudget?.wouldExceed && !pendingSubmit) {
      setShowBudgetWarning(true)
      return
    }

    // Reset pending state after confirmation
    setPendingSubmit(false)

    const account = accounts.find((a) => a.id === accountId)
    if (!account) return

    const finalAmount = type === "expense" ? -Math.abs(amount) : Math.abs(amount)
    const tagArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t)

    if (mode === "edit" && initial) {
      updateTransaction(initial.id, {
        description,
        amount: finalAmount,
        date: new Date(dtLocal).toISOString().split("T")[0],
        category: categoryId,
        type,
        accountId: account.id,
        accountName: account.name,
        party: party.trim() || undefined,
        notes: note.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
        splits: splits,
      })
    } else {
      const newTransaction = addTransaction({
        description,
        amount: finalAmount,
        date: new Date(dtLocal).toISOString().split("T")[0],
        category: categoryId,
        type,
        accountId: account.id,
        accountName: account.name,
        party: party.trim() || undefined,
        notes: note.trim() || undefined,
        tags: tagArray.length > 0 ? tagArray : undefined,
        splits: splits,
        templateId: selectedTemplateId || undefined,
      })

      // Add receipt if one was uploaded
      if (receiptFile && receiptPreview && newTransaction) {
        addReceipt({
          transactionId: newTransaction.id,
          imageData: receiptPreview,
          fileName: receiptFile.name,
          fileSize: receiptFile.size,
          uploadDate: new Date().toISOString(),
        })
        toast.success("Receipt attached successfully")
      }

      if (saveAsTemplate) {
        const derivedTemplateName = templateName.trim() || description.trim()
        if (derivedTemplateName) {
          void addTemplate({
            name: derivedTemplateName,
            description: description.trim(),
            amount: Math.abs(finalAmount),
            type,
            category: categoryId,
            accountId: account.id,
            party: party.trim() || undefined,
            tags: tagArray.length > 0 ? tagArray : undefined,
            notes: note.trim() || undefined,
            isActive: true,
          })
        }
      }
    }

    onSubmit?.()
  }

  return (
    <div className="w-full flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-xl border bg-card p-4 md:p-5 shadow-sm"
      >
        <div className="max-h-[80vh] overflow-y-auto pr-1 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="inline-flex rounded-lg border p-1 w-fit">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-md px-4 py-2 text-sm transition-colors ${
                  type === "expense" ? "bg-red-600 text-white" : "text-red-600 hover:bg-red-50"
                }`}
                aria-pressed={type === "expense"}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-md px-4 py-2 text-sm transition-colors ${
                  type === "income" ? "bg-emerald-600 text-white" : "text-emerald-600 hover:bg-emerald-50"
                }`}
                aria-pressed={type === "income"}
              >
                Income
              </button>
            </div>

            <div className="w-full md:w-56 rounded-lg border px-3 py-2">
              <label className="block text-xs text-muted-foreground">Amount</label>
              <input
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-2xl font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-muted-foreground">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grocery shopping"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2.5 text-base"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">Date & Time</label>
              <input
                type="datetime-local"
                value={dtLocal}
                onChange={(e) => setDtLocal(e.target.value)}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {accountId && (
                <div className="mt-1 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Balance</span>
                    <span>{formatCurrency(currentBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">After</span>
                    <span className={afterBalance < 0 ? "text-red-600" : "text-emerald-600"}>
                      {formatCurrency(afterBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-muted-foreground">Category</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value={ADD_CATEGORY_OPTION}>+ Add category...</option>
              </select>
              {popularCategorySuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {popularCategorySuggestions.map(categoryName => (
                    <Button
                      key={`popular-category-${categoryName}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCategoryId(categoryName)}
                    >
                      {categoryName}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs text-muted-foreground">Party / Payee</label>
              <input
                type="text"
                value={party}
                onChange={(e) => {
                  setParty(e.target.value)
                  setShowPartySuggestions(true)
                }}
                onFocus={() => setShowPartySuggestions(true)}
                onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
                placeholder="e.g., Amazon, Netflix"
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              />
              {showPartySuggestions && partySuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded border bg-popover shadow-lg">
                  {partySuggestions.map((p) => (
                    <div
                      key={p.id}
                      className="cursor-pointer px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setParty(p.name)
                        setShowPartySuggestions(false)
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {showCategoryCreator && (
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={`New ${type} category`}
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Color
                    <input
                      type="color"
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="mt-1 h-9 w-full rounded border bg-transparent p-1"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Icon
                    <select
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                    >
                      {CATEGORY_ICON_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {duplicateCategory && (
                  <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                    Category already exists: <span className="font-semibold">{duplicateCategory.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                  >
                    {duplicateCategory ? "Use Existing" : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCategoryCreator(false)
                      setNewCategoryName("")
                      setNewCategoryColor("#64748b")
                      setNewCategoryIcon("tag")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {autoBudget && (
              <div
                className={`rounded border p-2 text-xs ${
                  autoBudget.wouldExceed ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <p className="font-semibold">Budget: {autoBudget.budget.name}</p>
                <p className="mt-1">
                  {autoBudget.subBudget.category}: {formatCurrency(autoBudget.subBudget.spent)} / {formatCurrency(autoBudget.subBudget.allocated)}
                </p>
                {autoBudget.wouldExceed && (
                  <p className="mt-1 text-red-600 font-semibold">
                    This transaction will exceed budget by {formatCurrency(autoBudget.exceededBy)}
                  </p>
                )}
              </div>
            )}
          </div>

          {type === "expense" && budgets.length > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground">Budget (Optional)</label>
              <select
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">No specific budget</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {budgetId && selectedBudget && (
                <div className="mt-2 rounded-md border p-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="text-muted-foreground uppercase tracking-wide">Budget</div>
                    <div className="text-muted-foreground uppercase tracking-wide">{selectedBudget.type}</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">Used</div>
                    <div>
                      {formatCurrency(budgetUsed)} / {formatCurrency(budgetLimit)}
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        budgetLimit > 0 && afterBudgetUsed > budgetLimit ? "bg-red-600" : "bg-emerald-600"
                      }`}
                      style={{
                        width: `${budgetLimit > 0 ? Math.min(100, Math.round((afterBudgetUsed / budgetLimit) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">After</div>
                    <div className={afterBudgetUsed > budgetLimit ? "text-red-600" : "text-emerald-600"}>
                      {formatCurrency(afterBudgetUsed)} / {formatCurrency(budgetLimit)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === "expense" && amount > 0 && (
            <SplitExpenseForm
              totalAmount={amount}
              onSplitsChange={setSplits}
              initialSplits={splits}
            />
          )}

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Optional Details {receiptFile && "• receipt attached"}
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground">Note</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded border bg-transparent px-3 py-2 text-sm"
                    placeholder="Optional notes..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="comma-separated"
                    className="mt-1 w-full rounded border bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {receiptPreview ? (
                <div className="relative">
                  <div className="relative h-40 w-full rounded border overflow-hidden">
                    <Image
                      src={receiptPreview}
                      alt="Receipt preview"
                      fill
                      sizes="100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleReceiptRemove}
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {receiptFile?.name} • {((receiptFile?.size || 0) / 1024).toFixed(1)}KB
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleReceiptSelect(file)
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Max 2MB • JPG, PNG, GIF</p>
                </div>
              )}
            </div>
          </details>

          {mode === "add" && (
            <div className="rounded-md border p-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                />
                Save this as template
              </label>
              {saveAsTemplate && (
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="mt-2 w-full rounded border bg-transparent px-3 py-2 text-sm"
                />
              )}
            </div>
          )}

          <div
            className={`flex items-center justify-end gap-2 ${
              isMobile ? "sticky bottom-0 z-20 border-t bg-card/95 backdrop-blur px-1 py-3 -mx-1" : ""
            }`}
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleAttemptCancel}
              className="px-3 py-2 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={`px-3 py-2 text-sm ${
                canSubmit
                  ? "bg-foreground text-background hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {mode === "edit" ? "Save Changes" : "Add Transaction"}
            </Button>
          </div>
        </div>
      </form>

      {/* Budget Warning Confirmation Dialog */}
      <Dialog open={showBudgetWarning} onOpenChange={setShowBudgetWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Budget Exceeded
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              This transaction will cause you to exceed your budget
            </DialogDescription>
          </DialogHeader>

          {autoBudget && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm font-mono mb-2">
                  <span className="font-semibold">Budget:</span> {autoBudget.budget.name}
                </p>
                <p className="text-sm font-mono mb-2">
                  <span className="font-semibold">Category:</span> {autoBudget.subBudget.category}
                </p>
                <div className="space-y-1 text-sm font-mono">
                  <div className="flex justify-between">
                    <span>Current spending:</span>
                    <span>{formatCurrency(autoBudget.subBudget.spent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget limit:</span>
                    <span>{formatCurrency(autoBudget.subBudget.allocated)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This transaction:</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="border-t pt-1 mt-1" />
                  <div className="flex justify-between font-semibold">
                    <span>New total:</span>
                    <span className="text-red-600">{formatCurrency(autoBudget.newTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Over budget by:</span>
                    <span>{formatCurrency(autoBudget.exceededBy)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-mono text-muted-foreground">
                Do you want to proceed with this transaction anyway?
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBudgetWarningCancel}
              className="font-mono"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBudgetWarningConfirm}
              className="font-mono bg-red-600 hover:bg-red-700 text-white"
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
