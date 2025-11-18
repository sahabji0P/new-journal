"use client"

import type React from "react"
import { useMemo, useState, useRef } from "react"
import { useApp } from "@/contexts/AppContext"
import type { Transaction, ExpenseSplit } from "@/lib/types"
import { Button } from "../ui/button"
import { DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { SplitExpenseForm } from "../splits/SplitExpenseForm"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

type TransactionFormModernProps = {
  mode?: "add" | "edit"
  initial?: Transaction
  onSubmit?: () => void
  onCancel?: () => void
}

export function TransactionFormModern({
  mode = "add",
  initial,
  onSubmit,
  onCancel,
}: TransactionFormModernProps) {
  const {
    accounts,
    categories,
    budgets,
    parties,
    addTransaction,
    updateTransaction,
    addReceipt,
    formatCurrency,
  } = useApp()

  const [type, setType] = useState<"income" | "expense">(initial?.type ?? "expense")
  const [amountStr, setAmountStr] = useState<string>(
    initial?.amount != null ? Math.abs(initial.amount).toString() : ""
  )
  const [accountId, setAccountId] = useState<string>(initial?.accountId?.toString() ?? "")
  const [categoryId, setCategoryId] = useState<string>(initial?.category ?? "")
  const [budgetId, setBudgetId] = useState<string>("")
  const [description, setDescription] = useState<string>(initial?.description ?? "")
  const [party, setParty] = useState<string>(initial?.party ?? "")
  const [note, setNote] = useState<string>(initial?.notes ?? "")
  const [tags, setTags] = useState<string>(initial?.tags?.join(", ") ?? "")
  const [showPartySuggestions, setShowPartySuggestions] = useState(false)
  const [splits, setSplits] = useState<ExpenseSplit[] | undefined>(initial?.splits)
  const [dtLocal, setDtLocal] = useState<string>(() => {
    const d = initial?.date ? new Date(initial.date) : new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const amount = useMemo(() => {
    const n = Number(amountStr)
    return isFinite(n) ? Math.abs(n) : 0
  }, [amountStr])

  const currentBalance = useMemo(() => {
    if (!accountId) return 0
    const account = accounts.find((a) => a.id === Number.parseInt(accountId))
    return account?.balance || 0
  }, [accountId, accounts])

  const afterBalance = useMemo(() => {
    return type === "income" ? currentBalance + amount : currentBalance - amount
  }, [currentBalance, type, amount])

  const selectedBudget = useMemo(() => {
    if (!budgetId) return null
    return budgets.find((b) => b.id === Number.parseInt(budgetId))
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

  const canSubmit = !!accountId && !!categoryId && amount > 0 && dtLocal && description.trim()

  const handleReceiptSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Check file size (max 2MB for localStorage)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB")
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const account = accounts.find((a) => a.id === Number.parseInt(accountId))
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
    }

    onSubmit?.()
  }

  return (
    <div className="w-full flex justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-md border bg-card backdrop-blur p-4 md:p-6 shadow-sm"
      >
        <DialogHeader className="mb-4">
          <DialogTitle className="font-mono">
            {mode === "edit" ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {mode === "edit" ? "Update transaction details" : "Enter the details of your transaction"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`px-3 py-2 text-sm font-mono clean-transition ${
                  type === "expense" ? "bg-red-600 text-white" : "bg-transparent text-red-600"
                }`}
                aria-pressed={type === "expense"}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`px-3 py-2 text-sm font-mono clean-transition ${
                  type === "income" ? "bg-emerald-600 text-white" : "bg-transparent text-emerald-600"
                }`}
                aria-pressed={type === "income"}
              >
                Income
              </button>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-mono text-muted-foreground">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery shopping"
              className="mt-1 w-full bg-transparent border-b border-input focus:border-foreground focus:outline-none text-lg font-mono py-2"
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-mono text-muted-foreground">Amount</label>
            <input
              inputMode="decimal"
              type="number"
              step="0.01"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full bg-transparent border-b border-input focus:border-foreground focus:outline-none text-3xl font-mono py-2"
            />
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-mono text-foreground">Add Note</summary>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded border bg-transparent p-2 text-sm font-mono"
              placeholder="Optional notes..."
            />
          </details>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-mono text-foreground">Add Tags</summary>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., vacation, food, health (comma-separated)"
              className="mt-2 w-full rounded border bg-transparent p-2 text-sm font-mono"
            />
          </details>

          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-mono text-foreground">
              Attach Receipt {receiptFile && "✓"}
            </summary>
            <div className="mt-2">
              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full h-40 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleReceiptRemove}
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
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
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Max 2MB • JPG, PNG, GIF
                  </p>
                </div>
              )}
            </div>
          </details>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground">Date & Time</label>
              <input
                type="datetime-local"
                value={dtLocal}
                onChange={(e) => setDtLocal(e.target.value)}
                className="mt-1 w-full rounded border bg-transparent p-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full rounded border bg-transparent p-2 text-sm font-mono"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {accountId && (
                <>
                  <div className="mt-2 flex items-center justify-between text-xs font-mono">
                    <div className="text-muted-foreground">Balance</div>
                    <div className="text-foreground">{formatCurrency(currentBalance)}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="text-muted-foreground">After</div>
                    <div className={afterBalance < 0 ? "text-red-600" : "text-emerald-600"}>
                      {formatCurrency(afterBalance)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-mono text-muted-foreground">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded border bg-transparent p-2 text-sm font-mono"
            >
              <option value="">Select category</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Party/Payee Field with Autocomplete */}
          <div className="mt-4 relative">
            <label className="block text-xs font-mono text-muted-foreground">
              Party/Payee <span className="text-xs opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={party}
              onChange={(e) => {
                setParty(e.target.value)
                setShowPartySuggestions(true)
              }}
              onFocus={() => setShowPartySuggestions(true)}
              onBlur={() => setTimeout(() => setShowPartySuggestions(false), 200)}
              placeholder="e.g., Amazon, Starbucks, Netflix"
              className="mt-1 w-full rounded border bg-transparent p-2 text-sm font-mono"
            />
            {showPartySuggestions && partySuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded border bg-popover shadow-lg">
                {partySuggestions.map((p) => (
                  <div
                    key={p.id}
                    className="cursor-pointer px-3 py-2 text-sm font-mono hover:bg-accent transition-colors"
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

          {type === "expense" && budgets.length > 0 && (
            <div className="mt-4">
              <label className="block text-xs font-mono text-muted-foreground">
                Budget <span className="text-xs opacity-60">(optional)</span>
              </label>
              <select
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
                className="mt-1 w-full rounded border bg-transparent p-2 text-sm font-mono"
              >
                <option value="">No specific budget</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {budgetId && selectedBudget && (
                <div className="mt-2 rounded border p-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="text-muted-foreground uppercase tracking-wide">Budget</div>
                    <div className="text-muted-foreground uppercase tracking-wide">
                      {selectedBudget.type}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-mono">
                    <div className="text-muted-foreground">Used</div>
                    <div className="text-foreground">
                      {formatCurrency(budgetUsed)} / {formatCurrency(budgetLimit)}
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full clean-transition ${
                        budgetLimit > 0 && afterBudgetUsed > budgetLimit ? "bg-red-600" : "bg-emerald-600"
                      }`}
                      style={{
                        width: `${budgetLimit > 0 ? Math.min(100, Math.round((afterBudgetUsed / budgetLimit) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-mono">
                    <div className="text-muted-foreground">After</div>
                    <div
                      className={`${afterBudgetUsed > budgetLimit ? "text-red-600" : "text-emerald-600"}`}
                    >
                      {formatCurrency(afterBudgetUsed)} / {formatCurrency(budgetLimit)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Split Expense Section - Only for expenses */}
          {type === "expense" && amount > 0 && (
            <div className="mt-4">
              <SplitExpenseForm
                totalAmount={amount}
                onSplitsChange={setSplits}
                initialSplits={splits}
              />
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="px-3 py-2 text-sm font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={`px-3 py-2 text-sm font-mono ${
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
    </div>
  )
}
