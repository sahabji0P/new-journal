"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import type { InvestmentType } from "@/lib/types"

const TYPE_COLOR_MAP: Record<InvestmentType, string> = {
  mutual_fund: "oklch(0.65 0.18 250)",
  fixed_deposit: "oklch(0.70 0.14 60)",
  ppf: "oklch(0.72 0.16 155)",
  epf: "oklch(0.60 0.18 300)",
  nps: "oklch(0.68 0.12 200)",
  stocks: "oklch(0.62 0.20 30)",
  gold: "oklch(0.78 0.14 85)",
  real_estate: "oklch(0.55 0.14 170)",
  bonds: "oklch(0.65 0.10 230)",
  rd: "oklch(0.70 0.16 120)",
  ssy: "oklch(0.75 0.12 340)",
  elss: "oklch(0.60 0.16 280)",
  nsc: "oklch(0.68 0.14 40)",
  kvp: "oklch(0.72 0.10 100)",
  scss: "oklch(0.58 0.18 190)",
  crypto: "oklch(0.64 0.22 320)",
  other: "oklch(0.60 0.08 0)",
}

const TYPE_LABEL_MAP: Record<InvestmentType, string> = {
  mutual_fund: "Mutual Funds",
  fixed_deposit: "Fixed Deposits",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  stocks: "Stocks",
  gold: "Gold",
  real_estate: "Real Estate",
  bonds: "Bonds",
  rd: "Recurring Deposits",
  ssy: "SSY",
  elss: "ELSS",
  nsc: "NSC",
  kvp: "KVP",
  scss: "SCSS",
  crypto: "Crypto",
  other: "Other",
}

export function AssetAllocationChart() {
  const { investments, formatCurrency } = useInvestments()

  const chartData = useMemo(() => {
    const typeMap = new Map<InvestmentType, number>()

    investments.forEach((inv) => {
      const current = typeMap.get(inv.type) || 0
      typeMap.set(inv.type, current + (inv.currentValue || 0))
    })

    return Array.from(typeMap.entries())
      .filter(([, value]) => value > 0)
      .map(([type, value]) => ({
        name: TYPE_LABEL_MAP[type] || type,
        value,
        type,
        color: TYPE_COLOR_MAP[type] || "oklch(0.60 0.08 0)",
      }))
      .sort((a, b) => b.value - a.value)
  }, [investments])

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{
      name: string
      value: number
      payload: { name: string; value: number }
    }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const total = chartData.reduce((sum, d) => sum + d.value, 0)
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0"
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-mono text-xs font-semibold mb-1">
            {data.payload.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {formatCurrency(data.value)} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>Investment distribution by type</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No investments to display
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", fontFamily: "monospace" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
