"use client"

import { useApp } from "@/contexts/AppContext"
import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { toLocalDateStr } from "@/lib/utils"

type TimeRange = "1W" | "1M" | "3M"

export function SpendingChart() {
  const { transactions, formatCurrency } = useApp()
  const [range, setRange] = useState<TimeRange>("1M")

  const chartData = useMemo(() => {
    const now = new Date()
    const startDate = new Date(now)

    if (range === "1W") startDate.setDate(now.getDate() - 7)
    else if (range === "1M") startDate.setMonth(now.getMonth() - 1)
    else startDate.setMonth(now.getMonth() - 3)

    const expenses = transactions.filter(t => {
      const txDate = new Date(t.date)
      return t.type === "expense" && txDate >= startDate && txDate <= now
    })

    if (range === "1W") {
      // Key by YYYY-MM-DD to avoid weekday name collision (same weekday can appear twice in 7 days)
      const dayMap = new Map<string, { label: string; amount: number }>()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = toLocalDateStr(d)
        const label = d.toLocaleDateString("en-US", { weekday: "short" })
        dayMap.set(key, { label, amount: 0 })
      }
      expenses.forEach(tx => {
        const dateKey = tx.date.slice(0, 10) // YYYY-MM-DD
        const entry = dayMap.get(dateKey)
        if (entry) dayMap.set(dateKey, { ...entry, amount: entry.amount + Math.abs(tx.amount) })
      })
      return Array.from(dayMap.values()).map(({ label, amount }) => ({ name: label, amount }))
    }

    if (range === "1M") {
      // Group by day of month (show ~4 week buckets)
      const weekMap = new Map<string, number>()
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - (i * 7 + 6))
        const weekEnd = new Date(now)
        weekEnd.setDate(weekEnd.getDate() - i * 7)
        const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        weekMap.set(label, 0)
      }
      const weekKeys = Array.from(weekMap.keys())
      expenses.forEach(tx => {
        const txDate = new Date(tx.date)
        const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
        const weekIndex = Math.min(3, Math.floor(daysAgo / 7))
        const key = weekKeys[3 - weekIndex]
        if (key) weekMap.set(key, weekMap.get(key)! + Math.abs(tx.amount))
      })
      return Array.from(weekMap.entries()).map(([name, amount]) => ({ name, amount }))
    }

    // 3M — group by month
    const monthMap = new Map<string, number>()
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const key = d.toLocaleDateString("en-US", { month: "short" })
      monthMap.set(key, 0)
    }
    expenses.forEach(tx => {
      const d = new Date(tx.date)
      const key = d.toLocaleDateString("en-US", { month: "short" })
      if (monthMap.has(key)) monthMap.set(key, monthMap.get(key)! + Math.abs(tx.amount))
    })
    return Array.from(monthMap.entries()).map(([name, amount]) => ({ name, amount }))
  }, [transactions, range])

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

  const totalSpending = chartData.reduce((sum, d) => sum + d.amount, 0)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string } }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-strong rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{payload[0].payload.name}</p>
          <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Statistics</h3>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpending)}</p>
        </div>
        <div className="flex gap-1 glass-subtle rounded-lg p-1">
          {(["1W", "1M", "3M"] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                range === r
                  ? "glass bg-primary/20 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.amount === maxAmount ? "oklch(0.71 0.17 56)" : "oklch(0.71 0.17 56 / 0.4)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
