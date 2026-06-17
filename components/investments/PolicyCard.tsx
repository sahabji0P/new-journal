"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/investments/StatusBadge"
import {
  INSURANCE_TYPE_LABELS,
  INSURANCE_TYPE_COLORS,
} from "@/components/investments/InsurancePage"
import { cn } from "@/lib/utils"
import { differenceInDays, isPast, format } from "date-fns"
import { CalendarClock } from "lucide-react"
import type { InsurancePolicyRecord, PremiumFrequency } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  single: "Single",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PolicyCardProps {
  policy: InsurancePolicyRecord
  onClick: () => void
  formatCurrency: (n: number) => string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PolicyCard({
  policy,
  onClick,
  formatCurrency,
}: PolicyCardProps) {
  // Compute next premium countdown
  const premiumCountdown = (() => {
    if (!policy.nextPremiumDate) return null
    const nextDate = new Date(policy.nextPremiumDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = differenceInDays(nextDate, today)

    if (isPast(nextDate) && days < 0) {
      return {
        label: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}`,
        className: "text-red-600 dark:text-red-400",
      }
    }

    if (days <= 7) {
      return {
        label: `Due in ${days} day${days !== 1 ? "s" : ""}`,
        className: "text-amber-600 dark:text-amber-400",
      }
    }

    return {
      label: `Due in ${days} days`,
      className: "text-muted-foreground",
    }
  })()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">
              {policy.name}
            </CardTitle>
            {policy.insurer && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {policy.insurer}
              </p>
            )}
          </div>
          <StatusBadge status={policy.status} />
        </div>

        {/* Type badge + member */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              INSURANCE_TYPE_COLORS[policy.type]
            )}
          >
            {INSURANCE_TYPE_LABELS[policy.type]}
          </span>
          {policy.memberName && (
            <span className="text-xs text-muted-foreground">
              {policy.memberName}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <p className="text-xs text-muted-foreground">Premium</p>
            <p className="text-sm font-mono font-medium">
              {formatCurrency(policy.premiumAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {FREQUENCY_LABELS[policy.premiumFrequency]}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sum Assured</p>
            <p className="text-sm font-mono font-medium">
              {formatCurrency(policy.sumAssured)}
            </p>
          </div>
        </div>

        {/* Next premium date with countdown */}
        {premiumCountdown && policy.nextPremiumDate && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <CalendarClock className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {format(new Date(policy.nextPremiumDate), "dd MMM yyyy")}
            </span>
            <span className={cn("font-medium", premiumCountdown.className)}>
              {premiumCountdown.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
