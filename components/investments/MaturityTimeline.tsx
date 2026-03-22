"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { isAfter, isBefore, addMonths, format, differenceInDays } from "date-fns"
import type { InvestmentType } from "@/lib/types"

const TYPE_LABEL_MAP: Record<InvestmentType, string> = {
  mutual_fund: "MF",
  fixed_deposit: "FD",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  stocks: "Stocks",
  gold: "Gold",
  real_estate: "RE",
  bonds: "Bonds",
  rd: "RD",
  ssy: "SSY",
  elss: "ELSS",
  nsc: "NSC",
  kvp: "KVP",
  scss: "SCSS",
  crypto: "Crypto",
  other: "Other",
}

export function MaturityTimeline() {
  const { investments, formatCurrency } = useInvestments()

  const upcomingMaturities = useMemo(() => {
    const now = new Date()
    const twelveMonthsLater = addMonths(now, 12)

    return investments
      .filter((inv) => {
        if (!inv.maturityDate) return false
        const maturity = new Date(inv.maturityDate)
        return isAfter(maturity, now) && isBefore(maturity, twelveMonthsLater)
      })
      .sort(
        (a, b) =>
          new Date(a.maturityDate!).getTime() -
          new Date(b.maturityDate!).getTime()
      )
      .slice(0, 8)
  }, [investments])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upcoming Maturities</CardTitle>
        <CardDescription>Next 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingMaturities.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No upcoming maturities
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingMaturities.map((inv) => {
              const maturityDate = new Date(inv.maturityDate!)
              const daysUntil = differenceInDays(maturityDate, new Date())
              const isUrgent = daysUntil <= 30

              return (
                <div
                  key={inv.id}
                  className={cn(
                    "flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg transition-colors",
                    isUrgent
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                      : "hover:bg-muted/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {inv.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(maturityDate, "dd MMM yyyy")}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {TYPE_LABEL_MAP[inv.type] || inv.type}
                      </span>
                      {isUrgent && (
                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          {daysUntil}d left
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-mono font-semibold whitespace-nowrap">
                    {formatCurrency(inv.currentValue || inv.investedAmount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
