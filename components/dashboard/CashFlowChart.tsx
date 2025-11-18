"use client"

import { useApp } from "@/contexts/AppContext"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type ChartType = "line" | "bar"

export function CashFlowChart({ type = "line" }: { type?: ChartType }) {
  const { transactions, formatCurrency } = useApp()

  const monthlyData = useMemo(() => {
    const last6Months = new Date()
    last6Months.setMonth(last6Months.getMonth() - 6)

    // Group transactions by month
    const monthlyMap = new Map<string, { month: string; income: number; expenses: number; net: number }>()

    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      if (date >= last6Months) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthLabel = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthLabel, income: 0, expenses: 0, net: 0 })
        }

        const data = monthlyMap.get(monthKey)!
        if (transaction.type === "income") {
          data.income += transaction.amount
          data.net += transaction.amount
        } else {
          data.expenses += Math.abs(transaction.amount)
          data.net += transaction.amount // Amount is already negative for expenses
        }
      }
    })

    // Convert to array and sort by date
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  }, [transactions])

  const totalIncome = monthlyData.reduce((sum, data) => sum + data.income, 0)
  const totalExpenses = monthlyData.reduce((sum, data) => sum + data.expenses, 0)
  const netCashFlow = totalIncome - totalExpenses

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload: { month: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-mono text-xs text-muted-foreground mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="font-mono text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Income (6 months)</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{formatCurrency(totalIncome)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Expenses (6 months)</CardDescription>
            <CardTitle className="text-2xl text-red-600">{formatCurrency(totalExpenses)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Net Cash Flow (6 months)</CardDescription>
            <CardTitle className={`text-2xl ${netCashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netCashFlow)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Trend</CardTitle>
          <CardDescription>Income vs Expenses over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground font-mono text-sm">
                No transaction data available for the last 6 months
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              {type === "line" ? (
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs font-mono"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    className="text-xs font-mono"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value >= 0 ? "+" : ""}${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="oklch(0.75 0.16 155)"
                    strokeWidth={2}
                    name="Income"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="oklch(0.65 0.2 25)"
                    strokeWidth={2}
                    name="Expenses"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="oklch(0.55 0.15 260)"
                    strokeWidth={2}
                    name="Net"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              ) : (
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs font-mono"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    className="text-xs font-mono"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value >= 0 ? "+" : ""}${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }} />
                  <Bar dataKey="income" fill="oklch(0.75 0.16 155)" name="Income" />
                  <Bar dataKey="expenses" fill="oklch(0.65 0.2 25)" name="Expenses" />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
