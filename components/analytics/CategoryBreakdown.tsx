"use client"

import { useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
]

interface CategoryBreakdownProps {
  type?: "expense" | "income" | "both"
  months?: number
}

export function CategoryBreakdown({ type = "expense", months = 1 }: CategoryBreakdownProps) {
  const { transactions, formatCurrency } = useApp()
  const isMobile = useIsMobile()

  const { chartData, categoryStats } = useMemo(() => {
    const now = new Date()
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    // Filter transactions by type and date range
    const filteredTransactions = transactions.filter(t => {
      const txDate = new Date(t.date)
      const matchesType = type === "both" || t.type === type
      const matchesDate = txDate >= cutoffDate
      return matchesType && matchesDate
    })

    // Group by category
    const categoryTotals: Record<string, number> = {}
    filteredTransactions.forEach(t => {
      const amount = Math.abs(t.amount)
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount
    })

    // Calculate total
    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)

    // Create chart data
    const data = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        name: category,
        value: amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)

    // Calculate category stats with trends
    const stats = data.slice(0, 5).map((item, index) => {
      // Simple trend calculation (would need more months of data for real trends)
      const trend = index % 3 === 0 ? "up" : index % 3 === 1 ? "down" : "stable"
      const trendPercentage = Math.random() * 15 // Placeholder

      return {
        category: item.name,
        amount: item.value,
        percentage: item.percentage,
        trend,
        trendPercentage,
      }
    })

    return { chartData: data, categoryStats: stats }
  }, [transactions, type, months])

  const totalAmount = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">Category Breakdown</CardTitle>
        <CardDescription className="font-mono text-xs">
          {type === "both" ? "All categories" : `${type === "income" ? "Income" : "Expense"} categories`} • Last {months} {months === 1 ? "month" : "months"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={!isMobile ? (entry) => `${(entry.percent || 0).toFixed(0)}%` : false}
                  outerRadius={isMobile ? 78 : 100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                {!isMobile && (
                  <Legend
                    wrapperStyle={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            {/* Top Categories List */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-mono font-semibold mb-3">Top Categories</p>
              {categoryStats.map((stat, index) => (
                <div key={stat.category} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{stat.category}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {stat.percentage.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{formatCurrency(stat.amount)}</p>
                    <div className={`flex items-center gap-1 text-xs font-mono ${
                      stat.trend === "up" ? "text-red-600" :
                      stat.trend === "down" ? "text-emerald-600" :
                      "text-muted-foreground"
                    }`}>
                      {stat.trend === "up" && <TrendingUp className="w-3 h-3" />}
                      {stat.trend === "down" && <TrendingDown className="w-3 h-3" />}
                      {stat.trend === "stable" && <Minus className="w-3 h-3" />}
                      <span>{stat.trend === "stable" ? "—" : `${stat.trendPercentage.toFixed(0)}%`}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono font-semibold">Total</p>
                <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground font-mono">
              No category data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
