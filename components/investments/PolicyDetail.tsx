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
  INSURANCE_TYPE_LABELS,
  INSURANCE_TYPE_COLORS,
} from "@/components/investments/InsurancePage"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Pencil, Trash2, CreditCard } from "lucide-react"
import type { InsurancePolicyRecord, TaxSection, PremiumFrequency, ClaimEntry } from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PolicyDetailProps {
  policy: InsurancePolicyRecord
  open: boolean
  onClose: () => void
  onEdit: () => void
  onRecordPayment: () => void
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

const FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  single: "Single",
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
// Metric Cell
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

export function PolicyDetail({
  policy,
  open,
  onClose,
  onEdit,
  onRecordPayment,
}: PolicyDetailProps) {
  const { formatCurrency, deletePolicy, familyMembers } = useInvestments()
  const isMobile = useIsMobile()

  const handleDelete = async () => {
    await deletePolicy(policy.id)
    onClose()
  }

  // Resolve covered member names
  const coveredMemberNames = (policy.coveredMembers ?? [])
    .map((memberId) => {
      const member = familyMembers.find((m) => m.id === memberId)
      return member?.name ?? memberId
    })
    .filter(Boolean)

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
              INSURANCE_TYPE_COLORS[policy.type]
            )}
          >
            {INSURANCE_TYPE_LABELS[policy.type]}
          </span>
          <StatusBadge status={policy.status} />
        </div>
        {policy.insurer && (
          <p className="text-sm text-muted-foreground mt-1">
            {policy.insurer}
          </p>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricCell
          label="Premium"
          value={
            <div>
              <span className="font-mono">{formatCurrency(policy.premiumAmount)}</span>
              <span className="text-xs text-muted-foreground ml-1">
                {FREQUENCY_LABELS[policy.premiumFrequency]}
              </span>
            </div>
          }
        />
        <MetricCell
          label="Sum Assured"
          value={<span className="font-mono">{formatCurrency(policy.sumAssured)}</span>}
        />
        <MetricCell label="Start Date" value={formatDate(policy.startDate)} />
        {policy.endDate && (
          <MetricCell label="End Date" value={formatDate(policy.endDate)} />
        )}
        {policy.nextPremiumDate && (
          <MetricCell label="Next Premium" value={formatDate(policy.nextPremiumDate)} />
        )}
      </div>

      {/* Policy Details */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Policy Details</h4>
        <div className="divide-y">
          {policy.policyNumber && (
            <DetailRow label="Policy Number" value={policy.policyNumber} />
          )}
          {policy.nominee && (
            <DetailRow label="Nominee" value={policy.nominee} />
          )}
          {policy.nomineeRelation && (
            <DetailRow label="Nominee Relation" value={policy.nomineeRelation} />
          )}
          {policy.agentName && (
            <DetailRow label="Agent Name" value={policy.agentName} />
          )}
          {policy.agentPhone && (
            <DetailRow label="Agent Phone" value={policy.agentPhone} />
          )}
        </div>
      </div>

      {/* Tax Section */}
      {policy.taxSection && policy.taxSection !== "none" && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Tax Benefit</h4>
          <div className="divide-y">
            <DetailRow label="Tax Section" value={TAX_SECTION_LABELS[policy.taxSection]} />
          </div>
        </div>
      )}

      {/* Riders */}
      {policy.riders && policy.riders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Riders</h4>
          <div className="flex flex-wrap gap-1.5">
            {policy.riders.map((rider) => (
              <span
                key={rider}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {rider}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Covered Members (for family floater) */}
      {coveredMemberNames.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Covered Members</h4>
          <div className="flex flex-wrap gap-1.5">
            {coveredMemberNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Claim History */}
      {policy.claimHistory && policy.claimHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Claim History</h4>
          <div className="space-y-2">
            {policy.claimHistory.map((claim: ClaimEntry, idx: number) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 rounded-md border p-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{claim.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(claim.date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm">{formatCurrency(claim.amount)}</p>
                  <StatusBadge status={claim.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {policy.tags && policy.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {policy.tags.map((tag) => (
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
      {policy.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {policy.notes}
          </p>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onRecordPayment}>
        <CreditCard className="size-4" />
        Record Payment
      </Button>
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
            <SheetTitle>{policy.name}</SheetTitle>
            <SheetDescription>Insurance policy details</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{content}</div>
          <SheetFooter>{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy.name}</DialogTitle>
          <DialogDescription>Insurance policy details</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
