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
  Copy,
  CreditCard,
  House,
  Pencil,
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
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

gsap.registerPlugin(useGSAP)

type TransactionDetailProps = {
  transaction: Transaction | null
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose?: () => void
  isMobile?: boolean
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

export function TransactionDetail({
  transaction,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  isMobile = false,
}: TransactionDetailProps) {
  const {
    accounts,
    categories,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addTemplate,
    addSettlement,
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

  const handleDuplicate = () => {
    const selectedAccount = accounts.find(item => item.id === transaction.accountId)
    if (!selectedAccount) return

    addTransaction({
      description: `${transaction.description} (copy)`,
      amount: transaction.amount,
      date: new Date().toISOString().split("T")[0],
      category: transaction.category,
      type: transaction.type,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      party: transaction.party,
      notes: transaction.notes,
      tags: transaction.tags,
    })
  }

  const handleSaveAsTemplate = () => {
    addTemplate({
      name: transaction.description,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      party: transaction.party,
      tags: transaction.tags,
      accountId: transaction.accountId,
      notes: transaction.notes,
      icon: "Receipt",
      color: isIncome ? "green" : "red",
    })
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
          isMobile && "border-[#222833] bg-[#07090d]"
        )}
      >
        <div data-detail-animate="true" className="mb-4 flex items-center justify-between">
          <p className={cn("text-xs uppercase tracking-[0.2em] text-muted-foreground", isMobile && "text-slate-400")}>
            Edit Transaction
          </p>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div data-detail-animate="true">
            <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
              Description
            </label>
            <Input
              value={formData.description}
              onChange={event => setFormData({ ...formData, description: event.target.value })}
              className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
            />
          </div>

          <div data-detail-animate="true" className="grid grid-cols-2 gap-2">
            <div>
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
                Amount
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={event => setFormData({ ...formData, amount: event.target.value })}
                className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
              />
            </div>

            <div>
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
                Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}>
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
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
                Date
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={event => setFormData({ ...formData, date: event.target.value })}
                className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
              />
            </div>

            <div>
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
                Account
              </label>
              <Select value={formData.accountId} onValueChange={value => setFormData({ ...formData, accountId: value })}>
                <SelectTrigger className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}>
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
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>
                Category
              </label>
              <Select value={formData.category} onValueChange={value => setFormData({ ...formData, category: value })}>
                <SelectTrigger className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}>
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
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>Party</label>
              <Input
                value={formData.party}
                onChange={event => setFormData({ ...formData, party: event.target.value })}
                className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
              />
            </div>

            <div>
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>Notes</label>
              <Input
                value={formData.notes}
                onChange={event => setFormData({ ...formData, notes: event.target.value })}
                className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
              />
            </div>

            <div>
              <label className={cn("mb-1 block text-xs text-muted-foreground", isMobile && "text-slate-400")}>Tags</label>
              <Input
                value={formData.tags}
                onChange={event => setFormData({ ...formData, tags: event.target.value })}
                className={cn("rounded-xl", isMobile && "border-[#2a3342] bg-[#111520] text-slate-100")}
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
        "rounded-3xl border border-border/70 bg-card/95 p-4 md:max-h-[82vh] md:overflow-y-auto",
        isMobile && "rounded-none border-x-0 border-y-0 bg-[#07090d] px-4 pb-5 pt-3"
      )}
    >
      <div data-detail-animate="true" className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-full", isMobile && "text-slate-300 hover:bg-[#111520]")}
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

        <div className={cn(
          "inline-flex items-center rounded-xl border p-1",
          isMobile ? "border-[#2a3342] bg-[#111520]" : "border-border/70 bg-muted/20"
        )}>
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

      <div
        data-detail-animate="true"
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5",
          isMobile ? "border-[#2a3342] bg-[#171c24]" : "border-border/70 bg-gradient-to-br from-card via-card to-muted/20"
        )}
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
            "inline-flex h-16 w-16 items-center justify-center rounded-full",
            isIncome ? "bg-emerald-500/15 text-emerald-400" : "bg-[#1f355f] text-[#55a2ff]"
          )}>
            <TransactionIcon className="h-7 w-7" />
          </span>

          <p className={cn(
            "mt-3 text-4xl font-semibold",
            isIncome ? "text-emerald-400" : isMobile ? "text-slate-100" : "text-red-500"
          )}>
            {formatCurrency(transaction.amount)}
          </p>
          <p className={cn("mt-1 text-sm", isMobile ? "text-slate-400" : "text-muted-foreground")}>
            {formatDate(transaction.date)}
          </p>
          <span className={cn(
            "mt-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            isIncome
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          )}>
            {transaction.type}
          </span>
        </div>
      </div>

      <div
        data-detail-animate="true"
        className={cn(
          "mt-3 rounded-3xl border p-4",
          isMobile ? "border-[#2a3342] bg-[#171c24]" : "border-border/70 bg-muted/10"
        )}
      >
        <p className={cn("text-[11px] uppercase tracking-[0.18em]", isMobile ? "text-slate-400" : "text-muted-foreground")}>
          Source & Category
        </p>

        <div className="mt-3 space-y-2">
          <SourceRow
            icon={CreditCard}
            label={account?.name || "Unknown account"}
            hint={transaction.accountId ? `••••${transaction.accountId.slice(-4)}` : "Account"}
            mobile={isMobile}
          />
          <div className={cn(isMobile ? "border-t border-[#2a3342]" : "border-t border-border/70")} />
          <SourceRow
            icon={Tag}
            label={transaction.category}
            hint={transaction.party || "General"}
            mobile={isMobile}
            iconAccent
          />
        </div>
      </div>

      <div
        data-detail-animate="true"
        className={cn(
          "mt-3 rounded-3xl border p-4",
          isMobile ? "border-[#2a3342] bg-[#171c24]" : "border-border/70 bg-muted/10"
        )}
      >
        <div className="flex items-center justify-between">
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", isMobile ? "text-slate-400" : "text-muted-foreground")}>
            Notes
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "text-xs font-medium",
              isMobile ? "text-amber-400" : "text-primary"
            )}
          >
            Edit
          </button>
        </div>

        <p className={cn("mt-2 text-sm leading-relaxed", isMobile ? "text-slate-200" : "text-foreground/90")}>
          {transaction.notes || "No notes added for this transaction."}
        </p>

        {transaction.tags && transaction.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {transaction.tags.map(tag => (
              <span
                key={`${transaction.id}-${tag}`}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px]",
                  isMobile ? "bg-[#212938] text-slate-300" : "bg-muted text-muted-foreground"
                )}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {transaction.party && (
          <div className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]",
            isMobile ? "bg-[#212938] text-slate-300" : "bg-muted text-muted-foreground"
          )}>
            <User className="h-3.5 w-3.5" />
            {transaction.party}
          </div>
        )}
      </div>

      <div
        data-detail-animate="true"
        className={cn(
          "mt-3 rounded-3xl border p-4",
          isMobile ? "border-[#2a3342] bg-[#171c24]" : "border-border/70 bg-muted/10"
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className={cn("text-[11px] uppercase tracking-[0.18em]", isMobile ? "text-slate-400" : "text-muted-foreground")}>
            Category History
          </p>
          <span className={cn("text-xs", isMobile ? "text-amber-400" : "text-primary")}>
            View All
          </span>
        </div>

        {relatedByCategory.length === 0 ? (
          <p className={cn("text-xs", isMobile ? "text-slate-400" : "text-muted-foreground")}>
            No related transactions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {relatedByCategory.map(item => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2",
                  isMobile ? "border-[#2a3342] bg-[#111520]" : "border-border/60 bg-card/80"
                )}
              >
                <div>
                  <p className={cn("text-sm font-medium", isMobile && "text-slate-100")}>{item.description}</p>
                  <p className={cn("text-[11px]", isMobile ? "text-slate-400" : "text-muted-foreground")}>
                    {formatDate(item.date)}
                  </p>
                </div>
                <p className={cn(
                  "text-sm font-semibold",
                  item.type === "income" ? "text-emerald-400" : isMobile ? "text-slate-200" : "text-red-500"
                )}>
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className={cn("mt-2 text-[11px]", isMobile ? "text-slate-400" : "text-muted-foreground")}>
          {categoryStats?.count || 0} total •
          <span className="ml-1 text-red-400">{formatCurrency(-(categoryStats?.expense || 0))}</span>
          <span className="ml-1 text-emerald-400">{formatCurrency(categoryStats?.income || 0)}</span>
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

      <div data-detail-animate="true" className="mt-4 grid grid-cols-2 gap-2.5">
        <ActionButton label="Edit" icon={Pencil} iconClassName="text-blue-500" onClick={() => setEditing(true)} mobile={isMobile} />
        <ActionButton label="Duplicate" icon={Copy} iconClassName="text-violet-500" onClick={handleDuplicate} mobile={isMobile} />
        <ActionButton label="Template" icon={ReceiptText} iconClassName="text-amber-500" onClick={handleSaveAsTemplate} mobile={isMobile} />
        <ActionButton label="Delete" icon={Trash2} iconClassName="text-red-500" onClick={handleDelete} mobile={isMobile} />
      </div>

      {!isMobile && (
        <div data-detail-animate="true" className="mt-3 rounded-xl border border-border/70 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Use arrows to navigate adjacent transactions.</span>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceRow({
  icon: Icon,
  label,
  hint,
  mobile,
  iconAccent = false,
}: {
  icon: LucideIcon
  label: string
  hint: string
  mobile: boolean
  iconAccent?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg",
          iconAccent
            ? mobile ? "bg-amber-500/20 text-amber-400" : "bg-primary/15 text-primary"
            : mobile ? "bg-[#212938] text-slate-300" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className={cn("text-sm font-medium", mobile && "text-slate-100")}>{label}</p>
          <p className={cn("text-xs", mobile ? "text-slate-400" : "text-muted-foreground")}>{hint}</p>
        </div>
      </div>
      <ChevronRight className={cn("h-4 w-4", mobile ? "text-slate-500" : "text-muted-foreground")} />
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  iconClassName,
  onClick,
  mobile,
}: {
  label: string
  icon: LucideIcon
  iconClassName?: string
  onClick: () => void
  mobile: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-auto flex-col rounded-xl py-3 text-xs",
        mobile ? "border-[#2a3342] bg-[#171c24] text-slate-200" : "border-border/70 bg-card/70"
      )}
    >
      <Icon className={cn("mb-1.5 h-4 w-4", iconClassName)} />
      {label}
    </Button>
  )
}
