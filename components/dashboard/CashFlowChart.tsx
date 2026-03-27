"use client"

import { useApp } from "@/contexts/AppContext"
import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export function CashFlowChart() {
  const { transactions, formatCurrency } = useApp()

  const monthlyData = useMemo(() => {
    const last6Months = new Date()
    last6Months.setMonth(last6Months.getMonth() - 6)

    const monthlyMap = new Map<
      string,
      { month: string; income: number; expenses: number }
    >()

    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      if (date >= last6Months) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthLabel = date.toLocaleDateString("en-US", {
          month: "short",
        })

        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthLabel, income: 0, expenses: 0 })
        }

        const data = monthlyMap.get(monthKey)!
        if (transaction.type === "income") {
          data.income += transaction.amount
        } else {
          data.expenses += Math.abs(transaction.amount)
        }
      }
    })

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  }, [transactions])

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{
      name: string
      value: number
      color: string
      payload: { month: string }
    }>
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-strong rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {payload[0].payload.month}
          </p>
          {payload.map((entry, index: number) => (
            <p
              key={index}
              className="text-xs font-medium"
              style={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (monthlyData.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-sm">
          No transaction data for the last 6 months
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Cash Flow</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Income vs expenses — last 6 months
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.75 0.16 155)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.75 0.16 155)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.71 0.17 56)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="oklch(0.71 0.17 56)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={value =>
              `${(value / 1000).toFixed(0)}k`
            }
            className="text-muted-foreground"
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="oklch(0.75 0.16 155)"
            strokeWidth={2}
            fill="url(#incomeGrad)"
            name="Income"
            dot={{ r: 3, fill: "oklch(0.75 0.16 155)" }}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="oklch(0.71 0.17 56)"
            strokeWidth={2}
            fill="url(#expenseGrad)"
            name="Expenses"
            dot={{ r: 3, fill: "oklch(0.71 0.17 56)" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
