"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/investments/StatusBadge"
import {
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_COLORS,
} from "@/components/investments/InvestmentGroupFilter"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Pencil, Trash2 } from "lucide-react"
import type { InvestmentRecord, TaxSection } from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvestmentDetailProps {
  investment: InvestmentRecord
  open: boolean
  onClose: () => void
  onEdit: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAX_SECTION_LABELS: Record<TaxSection, string> = {
  "80C": "Section 80C",
  "80CCC": "Section 80CCC",
  "80CCD": "Section 80CCD(1B)",
  "80D": "Section 80D",
  "10_14": "Section 10(14)",
  none: "None",
}

function formatDate(d: string | undefined): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Metric Grid Cell
// ---------------------------------------------------------------------------

function MetricCell({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "-") return null
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestmentDetail({
  investment,
  open,
  onClose,
  onEdit,
}: InvestmentDetailProps) {
  const { formatCurrency, deleteInvestment } = useInvestments()
  const isMobile = useIsMobile()

  const returns = investment.currentValue - investment.investedAmount
  const returnsPct =
    investment.investedAmount > 0
      ? (returns / investment.investedAmount) * 100
      : 0
  const isPositive = returns >= 0

  const handleDelete = async () => {
    await deleteInvestment(investment.id)
    onClose()
  }

  // -----------------------------------------------------------------------
  // Type-specific details
  // -----------------------------------------------------------------------

  const typeSpecificDetails = () => {
    const rows: React.ReactNode[] = []
    const inv = investment

    switch (inv.type) {
      case "mutual_fund":
      case "elss":
        if (inv.folioNumber) rows.push(<DetailRow key="folio" label="Folio Number" value={inv.folioNumber} />)
        if (inv.fundCategory) rows.push(<DetailRow key="fundCat" label="Fund Category" value={inv.fundCategory.charAt(0).toUpperCase() + inv.fundCategory.slice(1)} />)
        if (inv.sipAmount != null && inv.sipAmount > 0) {
          rows.push(<DetailRow key="sip" label="SIP Amount" value={formatCurrency(inv.sipAmount)} />)
          if (inv.sipDay) rows.push(<DetailRow key="sipDay" label="SIP Day" value={`Day ${inv.sipDay}`} />)
          if (inv.sipFrequency) rows.push(<DetailRow key="sipFreq" label="SIP Frequency" value={inv.sipFrequency.charAt(0).toUpperCase() + inv.sipFrequency.slice(1)} />)
        }
        break

      case "fixed_deposit":
      case "rd":
      case "scss":
        if (inv.accountNumber) rows.push(<DetailRow key="acc" label="Account Number" value={inv.accountNumber} />)
        if (inv.compoundingFreq) rows.push(<DetailRow key="comp" label="Compounding" value={inv.compoundingFreq.charAt(0).toUpperCase() + inv.compoundingFreq.slice(1)} />)
        if (inv.autoRenew != null) rows.push(<DetailRow key="renew" label="Auto Renew" value={inv.autoRenew ? "Yes" : "No"} />)
        break

      case "stocks":
      case "crypto":
        if (inv.ticker) rows.push(<DetailRow key="ticker" label="Ticker" value={inv.ticker} />)
        if (inv.quantity != null) rows.push(<DetailRow key="qty" label="Quantity" value={inv.quantity.toString()} />)
        if (inv.buyPrice != null) rows.push(<DetailRow key="buy" label="Buy Price" value={formatCurrency(inv.buyPrice)} />)
        if (inv.type === "stocks") {
          if (inv.dematAccount) rows.push(<DetailRow key="demat" label="Demat Account" value={inv.dematAccount} />)
          if (inv.broker) rows.push(<DetailRow key="broker" label="Broker" value={inv.broker} />)
        }
        break

      case "ppf":
      case "nps":
        if (inv.accountNumber) rows.push(<DetailRow key="acc" label="Account Number" value={inv.accountNumber} />)
        if (inv.pranNumber) rows.push(<DetailRow key="pran" label="PRAN Number" value={inv.pranNumber} />)
        break

      case "epf":
        if (inv.uanNumber) rows.push(<DetailRow key="uan" label="UAN Number" value={inv.uanNumber} />)
        break

      case "gold":
        if (inv.goldForm) rows.push(<DetailRow key="form" label="Form" value={inv.goldForm === "sgb" ? "SGB" : inv.goldForm.charAt(0).toUpperCase() + inv.goldForm.slice(1)} />)
        if (inv.weightGrams != null) rows.push(<DetailRow key="weight" label="Weight" value={`${inv.weightGrams}g`} />)
        if (inv.purity) rows.push(<DetailRow key="purity" label="Purity" value={inv.purity} />)
        break

      case "real_estate":
        if (inv.propertyAddress) rows.push(<DetailRow key="addr" label="Address" value={inv.propertyAddress} />)
        if (inv.propertyArea) rows.push(<DetailRow key="area" label="Area" value={inv.propertyArea} />)
        if (inv.registrationNo) rows.push(<DetailRow key="reg" label="Registration No" value={inv.registrationNo} />)
        break

      case "bonds":
      case "nsc":
      case "kvp":
      case "ssy":
        if (inv.accountNumber) rows.push(<DetailRow key="acc" label="Account Number" value={inv.accountNumber} />)
        break
    }

    return rows.length > 0 ? rows : null
  }

  // -----------------------------------------------------------------------
  // Content
  // -----------------------------------------------------------------------

  const content = (
    <div className="flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              INVESTMENT_TYPE_COLORS[investment.type]
            )}
          >
            {INVESTMENT_TYPE_LABELS[investment.type]}
          </span>
          <StatusBadge status={investment.status} />
        </div>
        {investment.institution && (
          <p className="text-sm text-muted-foreground mt-1">
            {investment.institution}
          </p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricCell
          label="Invested Amount"
          value={
            <span className="font-mono">{formatCurrency(investment.investedAmount)}</span>
          }
        />
        <MetricCell
          label="Current Value"
          value={
            <span className="font-mono">{formatCurrency(investment.currentValue)}</span>
          }
        />
        <MetricCell
          label="Returns"
          value={
            <span
              className={cn(
                "font-mono",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(returns)}
            </span>
          }
        />
        <MetricCell
          label="Returns %"
          value={
            <span
              className={cn(
                "font-mono",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {returnsPct.toFixed(2)}%
            </span>
          }
        />
        {investment.interestRate != null && (
          <MetricCell
            label="Interest Rate"
            value={<span className="font-mono">{investment.interestRate}%</span>}
          />
        )}
        <MetricCell label="Maturity Date" value={formatDate(investment.maturityDate)} />
      </div>

      {/* Type-Specific Details */}
      {typeSpecificDetails() && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Details</h4>
          <div className="divide-y">
            {typeSpecificDetails()}
          </div>
        </div>
      )}

      {/* General info */}
      <div>
        <h4 className="text-sm font-semibold mb-2">General</h4>
        <div className="divide-y">
          <DetailRow label="Start Date" value={formatDate(investment.startDate)} />
          {investment.nominee && <DetailRow label="Nominee" value={investment.nominee} />}
          {investment.taxSection && investment.taxSection !== "none" && (
            <DetailRow label="Tax Section" value={TAX_SECTION_LABELS[investment.taxSection]} />
          )}
        </div>
      </div>

      {/* Tags */}
      {investment.tags && investment.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {investment.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {investment.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {investment.notes}
          </p>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onEdit}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{investment.name}</SheetTitle>
            <SheetDescription>Investment details</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{content}</div>
          <SheetFooter>{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{investment.name}</DialogTitle>
          <DialogDescription>Investment details</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
