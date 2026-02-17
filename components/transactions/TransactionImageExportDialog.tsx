"use client"

import { toPng } from "html-to-image"
import { Download, Eye, Loader2 } from "lucide-react"
import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import type { Transaction } from "@/lib/types"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"

type ReceiptFieldKey =
  | "dateTime"
  | "account"
  | "category"
  | "party"
  | "notes"
  | "tags"
  | "attachments"
  | "reference"

type ReceiptFieldState = Record<ReceiptFieldKey, boolean>

type TransactionImageExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction
  accountName: string
  receiptCount: number
  formatCurrency: (value: number) => string
}

const FIELD_METADATA: Array<{
  key: ReceiptFieldKey
  title: string
  description: string
}> = [
  { key: "dateTime", title: "Date & Time", description: "Include when this transaction happened." },
  { key: "account", title: "Payment Method", description: "Include the source account or card." },
  { key: "category", title: "Category", description: "Include category classification." },
  { key: "party", title: "Counterparty", description: "Include who this transaction was with." },
  { key: "notes", title: "Personal Notes", description: "Include note text from this transaction." },
  { key: "tags", title: "Tags", description: "Include custom tags." },
  { key: "attachments", title: "Attachments", description: "Include attached receipt count." },
  { key: "reference", title: "Reference ID", description: "Include transaction reference." },
]

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function badgeForTransaction(transaction: Transaction) {
  const value = `${transaction.category} ${transaction.description}`.toLowerCase()

  if (value.includes("grocery") || value.includes("food") || value.includes("market")) return "GR"
  if (value.includes("fuel") || value.includes("uber") || value.includes("transport")) return "TR"
  if (value.includes("salary") || value.includes("income")) return "IN"
  if (value.includes("rent") || value.includes("home")) return "HM"
  if (value.includes("card") || value.includes("bank")) return "CR"
  return "TX"
}

function buildInitialSelection({
  transaction,
  accountName,
}: {
  transaction: Transaction
  accountName: string
}): ReceiptFieldState {
  return {
    dateTime: true,
    account: Boolean(accountName.trim()),
    category: Boolean(transaction.category.trim()),
    party: Boolean(transaction.party?.trim()),
    notes: Boolean(transaction.notes?.trim()),
    tags: Boolean(transaction.tags && transaction.tags.length > 0),
    attachments: true,
    reference: true,
  }
}

export function TransactionImageExportDialog({
  open,
  onOpenChange,
  transaction,
  accountName,
  receiptCount,
  formatCurrency,
}: TransactionImageExportDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [isPreviewVisible, setIsPreviewVisible] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedFields, setSelectedFields] = useState<ReceiptFieldState>(() =>
    buildInitialSelection({ transaction, accountName })
  )

  useEffect(() => {
    if (!open) return
    setSelectedFields(buildInitialSelection({ transaction, accountName }))
    setIsPreviewVisible(false)
    setIsDownloading(false)
  }, [open, transaction, accountName])

  const fieldAvailability = useMemo<ReceiptFieldState>(() => ({
    dateTime: true,
    account: Boolean(accountName.trim()),
    category: Boolean(transaction.category.trim()),
    party: Boolean(transaction.party?.trim()),
    notes: Boolean(transaction.notes?.trim()),
    tags: Boolean(transaction.tags && transaction.tags.length > 0),
    attachments: true,
    reference: true,
  }), [accountName, transaction])

  const selectedCount = useMemo(
    () => Object.values(selectedFields).filter(Boolean).length,
    [selectedFields]
  )

  const handlePreview = () => {
    setIsPreviewVisible(true)
  }

  const handleDownload = async () => {
    if (!previewRef.current) {
      toast.error("Preview is not ready yet")
      return
    }

    try {
      setIsDownloading(true)
      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#f1f5f9",
      })

      const link = document.createElement("a")
      const label = sanitizeFilenamePart(transaction.description) || "transaction"
      const datePart = sanitizeFilenamePart(transaction.date)
      link.download = `core-receipt-${label}-${datePart}.png`
      link.href = dataUrl
      link.click()

      toast.success("Receipt image downloaded")
    } catch (error) {
      console.error("Failed to export transaction image:", error)
      toast.error("Unable to download receipt image")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] overflow-y-auto rounded-3xl sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Download Transaction Receipt</DialogTitle>
          <DialogDescription>
            Select what to include, preview the final card, then download as an image.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Included Fields</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedCount} field{selectedCount === 1 ? "" : "s"} selected
            </p>

            <div className="mt-4 space-y-2">
              {FIELD_METADATA.map(field => {
                const available = fieldAvailability[field.key]
                return (
                  <label
                    key={field.key}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors",
                      available ? "bg-background hover:bg-muted/30" : "bg-muted/40 opacity-60"
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={selectedFields[field.key]}
                      disabled={!available}
                      onCheckedChange={checked => {
                        setSelectedFields(prev => ({
                          ...prev,
                          [field.key]: Boolean(checked),
                        }))
                      }}
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{field.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {available ? field.description : "Not available for this transaction."}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
            {!isPreviewVisible ? (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/70 px-6 text-center">
                <Eye className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Preview not generated</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click Preview Receipt to render the exact downloadable image.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[520px] items-start justify-center rounded-xl border border-border/70 bg-gradient-to-b from-slate-100 to-slate-200 p-4">
                <ReceiptPreviewCard
                  ref={previewRef}
                  transaction={transaction}
                  selectedFields={selectedFields}
                  accountName={accountName}
                  receiptCount={receiptCount}
                  formatCurrency={formatCurrency}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-1">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handlePreview}>
            <Eye className="mr-1.5 h-4 w-4" />
            Preview Receipt
          </Button>
          <Button className="rounded-xl" onClick={handleDownload} disabled={!isPreviewVisible || isDownloading}>
            {isDownloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Download Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ReceiptPreviewCardProps = {
  transaction: Transaction
  selectedFields: ReceiptFieldState
  accountName: string
  receiptCount: number
  formatCurrency: (value: number) => string
}

const ReceiptPreviewCard = forwardRef<HTMLDivElement, ReceiptPreviewCardProps>(function ReceiptPreviewCard({
  transaction,
  selectedFields,
  accountName,
  receiptCount,
  formatCurrency,
}, ref) {
  const transactionDate = new Date(transaction.date)
  const dateLabel = transactionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeLabel = transactionDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
  const tags = transaction.tags || []
  const reference = `TXN-${transaction.id.slice(0, 8).toUpperCase()}`
  const statusLabel = transaction.type === "income" ? "Income Received" : "Successful Payment"
  const amountLabel = formatCurrency(transaction.amount)

  return (
    <div ref={ref} className="w-[390px] rounded-[30px] bg-slate-100 p-4 font-sans text-slate-900">
      <div className="rounded-[26px] bg-white shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)]">
        <div className="relative overflow-hidden rounded-t-[26px] bg-slate-900 px-6 pb-6 pt-7 text-white">
          <div className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/5" />
          <div className="absolute -right-10 bottom-[-42px] h-32 w-32 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sm font-bold tracking-wide text-slate-900 shadow-md">
              {badgeForTransaction(transaction)}
            </div>
            <p className="text-sm font-medium text-white/75">{transaction.description}</p>
            <h2 className="mt-1 text-4xl font-bold tracking-tight text-white">{amountLabel}</h2>
            <span className="mt-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-300">
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-200" />

        <div className="space-y-4 p-5">
          {selectedFields.dateTime && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Date</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{timeLabel}</p>
              </div>
            </div>
          )}

          {(selectedFields.account || selectedFields.category || selectedFields.party) && (
            <div className="rounded-2xl bg-slate-50 p-3.5">
              <div className="space-y-2.5 text-sm">
                {selectedFields.account && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-slate-500">Payment Method</p>
                    <p className="font-semibold text-slate-900">{accountName}</p>
                  </div>
                )}

                {selectedFields.category && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-slate-500">Category</p>
                    <p className="font-semibold text-slate-900">{transaction.category}</p>
                  </div>
                )}

                {selectedFields.party && transaction.party && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-slate-500">Counterparty</p>
                    <p className="font-semibold text-slate-900">{transaction.party}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedFields.notes && transaction.notes && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Personal Notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{transaction.notes}</p>
            </div>
          )}

          {selectedFields.tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span
                  key={`${transaction.id}-${tag}`}
                  className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-dashed border-slate-200 pt-3">
            <div className="flex items-end justify-between">
              <p className="text-sm font-medium text-slate-500">Total Paid</p>
              <p className="text-xl font-bold text-slate-900">{amountLabel}</p>
            </div>

            {(selectedFields.reference || selectedFields.attachments) && (
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <p>{selectedFields.reference ? `Ref: ${reference}` : ""}</p>
                <p>{selectedFields.attachments ? `${receiptCount} attachment${receiptCount === 1 ? "" : "s"}` : ""}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
