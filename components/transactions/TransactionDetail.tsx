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
  BriefcaseBusiness,
  CarFront,
  ChevronRight,
  CreditCard,
  Download,
  FilePlus2,
  House,
  ReceiptText,
  Save,
  ShoppingBag,
  Tag,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { SplitViewer } from "../splits/SplitViewer"
import { TransactionImageExportDialog } from "./TransactionImageExportDialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"

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

function iconForTransaction(transaction: Transaction) {
  const value = `${transaction.category} ${transaction.description}`.toLowerCase()

  if (value.includes("grocery") || value.includes("market") || value.includes("shop")) {
    return ShoppingBag
  }

  if (value.includes("car") || value.includes("fuel") || value.includes("transport") || value.includes("uber")) {
    return CarFront
  }

  if (value.includes("home") || value.includes("rent") || value.includes("house")) {
    return House
  }

  if (value.includes("salary") || value.includes("income") || value.includes("payroll")) {
    return BriefcaseBusiness
  }

  if (value.includes("card") || value.includes("credit") || value.includes("bank")) {
    return CreditCard
  }

  return Wallet
}

function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
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
  const {
    accounts,
    categories,
    transactions,
    updateTransaction,
    deleteTransaction,
    addTemplate,
    addSettlement,
    getReceiptsByTransaction,
    formatCurrency,
    formatDate,
  } = useApp()

  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: "",
    category: "",
    type: "expense" as "income" | "expense",
    accountId: "",
    party: "",
    notes: "",
    tags: "",
  })
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateIncludeAmount, setTemplateIncludeAmount] = useState(true)
  const [templateTags, setTemplateTags] = useState<string[]>([])
  const [templateTagInput, setTemplateTagInput] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImageExportDialogOpen, setIsImageExportDialogOpen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)

  const relatedByCategory = useMemo(() => {
    if (!transaction?.category) return []
    return transactions
      .filter(item => item.category === transaction.category && item.id !== transaction.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
  }, [transaction, transactions])

  const categoryStats = useMemo(() => {
    if (!transaction?.category) return null

    const categoryTransactions = transactions.filter(item => item.category === transaction.category)
    const totalIncome = categoryTransactions
      .filter(item => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0)
    const totalExpense = Math.abs(
      categoryTransactions
        .filter(item => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0)
    )

    return {
      count: categoryTransactions.length,
      income: totalIncome,
      expense: totalExpense,
    }
  }, [transaction, transactions])

  const categoryTrendBars = useMemo(() => {
    if (!transaction?.category) return []

    const targetDate = new Date(transaction.date)
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()
    const weeklyValues = [0, 0, 0, 0]

    transactions
      .filter(item => item.category === transaction.category)
      .forEach(item => {
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
      heightPercent: Math.max(16, Math.round((value / maxValue) * 100)),
    }))
  }, [transaction, transactions])

  useEffect(() => {
    if (!transaction) return

    setFormData({
      description: transaction.description,
      amount: Math.abs(transaction.amount).toString(),
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      accountId: transaction.accountId,
      party: transaction.party || "",
      notes: transaction.notes || "",
      tags: transaction.tags?.join(", ") || "",
    })

    setEditing(false)
    setIsTemplateDialogOpen(false)
    setTemplateName(transaction.description)
    setTemplateIncludeAmount(true)
    setTemplateTags(transaction.tags || [])
    setTemplateTagInput("")
    setIsDeleteDialogOpen(false)
    setIsImageExportDialogOpen(false)
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
  }, { scope: rootRef, dependencies: [transaction?.id, editing, isMobile] })

  if (!transaction) {
    return (
      <Card className="rounded-3xl border-border/70 bg-card/90 p-6">
        <p className="text-sm text-muted-foreground">Select a transaction to see details.</p>
      </Card>
    )
  }

  const account = accounts.find(item => item.id === transaction.accountId)
  const TransactionIcon = iconForTransaction(transaction)
  const isIncome = transaction.type === "income"
  const receiptCount = getReceiptsByTransaction(transaction.id).length
  const transactionDateTime = new Date(transaction.date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })

  const handleSave = () => {
    const selectedAccount = accounts.find(item => item.id === formData.accountId)
    if (!selectedAccount) return

    const parsedAmount = Number.parseFloat(formData.amount)
    if (!Number.isFinite(parsedAmount)) return

    const finalAmount = formData.type === "expense"
      ? -Math.abs(parsedAmount)
      : Math.abs(parsedAmount)

    const tagArray = formData.tags
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean)

    updateTransaction(transaction.id, {
      description: formData.description,
      amount: finalAmount,
      date: formData.date,
      category: formData.category,
      type: formData.type,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      party: formData.party.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    setEditing(false)
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

  if (editing) {
    return (
      <div
        ref={rootRef}
        className={cn(
          "rounded-3xl border border-border/70 bg-card/95 p-4 md:max-h-[82vh] md:overflow-y-auto",
          isMobile && "rounded-none border-x-0 border-y-0 bg-background"
        )}
      >
        <div data-detail-animate="true" className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Edit Transaction</p>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div data-detail-animate="true">
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <Input
              value={formData.description}
              onChange={event => setFormData({ ...formData, description: event.target.value })}
              className="rounded-xl"
            />
          </div>

          <div data-detail-animate="true" className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={event => setFormData({ ...formData, amount: event.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Type</label>
              <Select
                value={formData.type}
                onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div data-detail-animate="true" className="grid grid-cols-1 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={event => setFormData({ ...formData, date: event.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Account</label>
              <Select value={formData.accountId} onValueChange={value => setFormData({ ...formData, accountId: value })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Category</label>
              <Select value={formData.category} onValueChange={value => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(item => (
                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Party</label>
              <Input
                value={formData.party}
                onChange={event => setFormData({ ...formData, party: event.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
              <Input
                value={formData.notes}
                onChange={event => setFormData({ ...formData, notes: event.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tags</label>
              <Input
                value={formData.tags}
                onChange={event => setFormData({ ...formData, tags: event.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        <div data-detail-animate="true" className="mt-4 flex gap-2">
          <Button onClick={handleSave} className="flex-1 rounded-xl">
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 rounded-xl">
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative rounded-3xl border border-border/70 bg-card/95 p-4 pb-24 md:max-h-[82vh] md:overflow-y-auto",
        isMobile && "rounded-none border-x-0 border-y-0 bg-background px-4 pb-24 pt-3"
      )}
    >
      <div data-detail-animate="true" className="mb-2 flex items-center justify-between">
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
          {!isMobile && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Transaction Details</p>
          )}
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

      <div data-detail-animate="true" className="mb-3 flex justify-end gap-2">
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

      <div
        data-detail-animate="true"
        className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-muted/20 via-card to-card p-5"
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-1 w-full",
            isIncome
              ? "bg-gradient-to-r from-emerald-500 to-lime-400"
              : "bg-gradient-to-r from-red-500 to-orange-400"
          )}
        />
        <div className="flex flex-col items-center text-center">
          <span className={cn(
            "inline-flex h-16 w-16 items-center justify-center rounded-2xl",
            isIncome ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"
          )}>
            <TransactionIcon className="h-7 w-7" />
          </span>
          <p className={cn("mt-3 text-4xl font-bold tracking-tight", isIncome ? "text-emerald-500" : "text-foreground")}>
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-1 text-base font-medium">{transaction.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">{transactionDateTime}</p>
        </div>
      </div>

      <div data-detail-animate="true" className="mt-3 rounded-3xl border border-border/70 bg-muted/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Source & Category</p>

        <div className="mt-3 space-y-2">
          <SourceRow
            icon={CreditCard}
            label={account?.name || "Unknown account"}
            hint={account ? `${account.type[0].toUpperCase()}${account.type.slice(1)} account` : "Account"}
            iconAccent={false}
            onClick={onAccountClick ? () => onAccountClick(transaction.accountId) : undefined}
          />
          <div className="border-t border-border/70" />
          <SourceRow
            icon={Tag}
            label={transaction.category}
            hint={transaction.party || "General"}
            iconAccent
            onClick={onCategoryClick ? () => onCategoryClick(transaction.category) : undefined}
          />
        </div>
      </div>

      <div data-detail-animate="true" className="mt-3 rounded-3xl border border-border/70 bg-muted/10 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Description & Notes</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {transaction.notes || "No notes added for this transaction."}
        </p>

        {transaction.tags && transaction.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
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

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {transaction.party && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
              <User className="h-3.5 w-3.5" />
              {transaction.party}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
            <ReceiptText className="h-3.5 w-3.5" />
            {receiptCount} attachment{receiptCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div
        data-detail-animate="true"
        className="mt-3 rounded-3xl border border-border/70 bg-gradient-to-b from-muted/20 via-card to-card p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Category Insights</p>
          <span className="text-xs font-medium text-muted-foreground">
            {categoryStats?.count || 0} total
          </span>
        </div>

        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(transaction.type === "income" ? categoryStats?.income || 0 : -(categoryStats?.expense || 0))}
            </p>
            <p className="text-xs text-muted-foreground">This month in {transaction.category}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {formatCurrency(-(categoryStats?.expense || 0))} expense
          </div>
        </div>

        <div className="flex h-28 items-end gap-2">
          {categoryTrendBars.map(item => (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn(
                "relative w-full overflow-hidden rounded-lg border border-border/70 bg-muted/60",
                item.isCurrent && "bg-primary/20 ring-1 ring-primary/50"
              )}
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

        <div className="mt-4 space-y-2">
          {relatedByCategory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No related transactions yet.</p>
          ) : (
            relatedByCategory.map(item => (
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
      </div>

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

      <div data-detail-animate="true" className="pointer-events-none sticky bottom-3 mt-5 flex justify-end">
        <Button
          type="button"
          onClick={() => setEditing(true)}
          className="pointer-events-auto h-11 rounded-full bg-primary px-5 text-black shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <FilePlus2 className="h-4.5 w-4.5" />
          Edit Transaction
        </Button>
      </div>

      {!isMobile && (
        <div data-detail-animate="true" className="mt-3 rounded-xl border border-border/70 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Use arrows to navigate adjacent transactions.</span>
          </div>
        </div>
      )}

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
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
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
