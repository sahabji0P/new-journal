"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/investments/StatusBadge"
import {
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_COLORS,
} from "@/components/investments/InvestmentGroupFilter"
import { cn } from "@/lib/utils"
import type { InvestmentRecord } from "@/lib/types"
import { CalendarClock, RefreshCw } from "lucide-react"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvestmentCardProps {
  investment: InvestmentRecord
  onClick: () => void
  formatCurrency: (n: number) => string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestmentCard({
  investment,
  onClick,
  formatCurrency,
}: InvestmentCardProps) {
  const returns = investment.currentValue - investment.investedAmount
  const returnsPct =
    investment.investedAmount > 0
      ? (returns / investment.investedAmount) * 100
      : 0
  const isPositive = returns >= 0

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">
              {investment.name}
            </CardTitle>
            {investment.institution && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {investment.institution}
              </p>
            )}
          </div>
          <StatusBadge status={investment.status} />
        </div>

        {/* Type badge + member */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              INVESTMENT_TYPE_COLORS[investment.type]
            )}
          >
            {INVESTMENT_TYPE_LABELS[investment.type]}
          </span>
          {investment.memberName && (
            <span className="text-xs text-muted-foreground">
              {investment.memberName}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="text-sm font-mono font-medium">
              {formatCurrency(investment.investedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Current Value</p>
            <p className="text-sm font-mono font-medium">
              {formatCurrency(investment.currentValue)}
            </p>
          </div>
        </div>

        {/* Returns */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Returns</span>
          <span
            className={cn(
              "text-sm font-mono font-medium",
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(returns)}
          </span>
          <span
            className={cn(
              "text-xs font-mono",
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            ({isPositive ? "+" : ""}
            {returnsPct.toFixed(1)}%)
          </span>
        </div>

        {/* Bottom row: maturity + SIP */}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {investment.maturityDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              {new Date(investment.maturityDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {investment.sipAmount != null && investment.sipAmount > 0 && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="size-3" />
              SIP {formatCurrency(investment.sipAmount)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
