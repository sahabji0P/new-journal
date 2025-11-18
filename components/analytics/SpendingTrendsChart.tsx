"use client"

import { useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

interface SpendingTrendsChartProps {
  months?: number
}

export function SpendingTrendsChart({ months = 6 }: SpendingTrendsChartProps) {
  const { transactions, formatCurrency } = useApp()

  const chartData = useMemo(() => {
    const now = new Date()
    const monthsData: Record<string, { month: string; income: number; expense: number; net: number }> = {}

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7)
      const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      monthsData[monthKey] = { month: monthLabel, income: 0, expense: 0, net: 0 }
    }

    // Aggregate transactions by month
    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7)
      if (monthsData[monthKey]) {
        if (t.type === "income") {
          monthsData[monthKey].income += t.amount
        } else {
          monthsData[monthKey].expense += Math.abs(t.amount)
        }
        monthsData[monthKey].net += t.amount
      }
    })

    return Object.values(monthsData)
  }, [transactions, months])

  // Calculate trend (comparing last 2 months)
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: "stable" as const, percentage: 0 }

    const lastMonth = chartData[chartData.length - 1]
    const prevMonth = chartData[chartData.length - 2]

    if (prevMonth.expense === 0) return { direction: "stable" as const, percentage: 0 }

    const change = ((lastMonth.expense - prevMonth.expense) / prevMonth.expense) * 100

    return {
      direction: change > 5 ? "up" : change < -5 ? "down" : "stable",
      percentage: Math.abs(change),
    }
  }, [chartData])

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0)
  const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-mono">Spending Trends</CardTitle>
            <CardDescription className="font-mono text-xs">
              Last {months} months overview
            </CardDescription>
          </div>
          {trend.direction !== "stable" && (
            <div className={`flex items-center gap-1 text-sm font-mono ${
              trend.direction === "up" ? "text-red-600" : "text-emerald-600"
            }`}>
              {trend.direction === "up" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <p className="text-xs font-mono text-muted-foreground">Total Income</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10">
            <p className="text-xs font-mono text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs font-mono"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs font-mono"
              tick={{ fill: "currentColor" }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
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
            <Legend
              wrapperStyle={{ fontFamily: "monospace", fontSize: "0.75rem" }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              name="Income"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>

        {chartData.length === 0 && (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground font-mono">
              No transaction data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
