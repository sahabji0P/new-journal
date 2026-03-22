"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import {
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PortfolioSummaryCards() {
  const { investments, formatCurrency } = useInvestments()

  const metrics = useMemo(() => {
    const totalInvested = investments.reduce(
      (sum, inv) => sum + (inv.investedAmount || 0),
      0
    )
    const totalCurrent = investments.reduce(
      (sum, inv) => sum + (inv.currentValue || 0),
      0
    )
    const totalReturns = totalCurrent - totalInvested
    const returnPercent =
      totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0

    return { totalInvested, totalCurrent, totalReturns, returnPercent }
  }, [investments])

  const activeCount = investments.filter(
    (inv) => inv.status === "active"
  ).length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>Total Invested</CardDescription>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-bold">
            {formatCurrency(metrics.totalInvested)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeCount} active investment{activeCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>Current Value</CardDescription>
            <IndianRupee className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-bold">
            {formatCurrency(metrics.totalCurrent)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Across all holdings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>Total Returns</CardDescription>
            {metrics.totalReturns >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "font-mono text-2xl font-bold",
              metrics.totalReturns >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {metrics.totalReturns >= 0 ? "+" : ""}
            {formatCurrency(metrics.totalReturns)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.totalReturns >= 0 ? "Profit" : "Loss"} on investments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardDescription>Return %</CardDescription>
            <Percent
              className={cn(
                "w-4 h-4",
                metrics.returnPercent >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              )}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "font-mono text-2xl font-bold",
              metrics.returnPercent >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {metrics.returnPercent >= 0 ? "+" : ""}
            {metrics.returnPercent.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Overall portfolio return
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
