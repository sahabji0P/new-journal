"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
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

export function TopPerformers() {
  const { investments, formatCurrency } = useInvestments()

  const topPerformers = useMemo(() => {
    return investments
      .filter((inv) => inv.investedAmount > 0)
      .map((inv) => {
        const returnAmount = (inv.currentValue || 0) - inv.investedAmount
        const returnPercent =
          (returnAmount / inv.investedAmount) * 100
        return { ...inv, returnAmount, returnPercent }
      })
      .sort((a, b) => b.returnPercent - a.returnPercent)
      .slice(0, 5)
  }, [investments])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>By return percentage</CardDescription>
      </CardHeader>
      <CardContent>
        {topPerformers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No investments to display
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPerformers.map((inv, index) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{inv.name}</p>
                  <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground mt-0.5">
                    {TYPE_LABEL_MAP[inv.type] || inv.type}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-mono font-bold",
                      inv.returnPercent >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    )}
                  >
                    {inv.returnPercent >= 0 ? "+" : ""}
                    {inv.returnPercent.toFixed(1)}%
                  </p>
                  <p
                    className={cn(
                      "text-xs font-mono",
                      inv.returnAmount >= 0
                        ? "text-emerald-600/70"
                        : "text-red-600/70"
                    )}
                  >
                    {inv.returnAmount >= 0 ? "+" : ""}
                    {formatCurrency(inv.returnAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
