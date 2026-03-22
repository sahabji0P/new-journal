"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export function FamilyDistributionChart() {
  const { investments, familyMembers, formatCurrency } = useInvestments()

  const chartData = useMemo(() => {
    const memberMap = new Map<string, { name: string; value: number }>()

    investments.forEach((inv) => {
      const existing = memberMap.get(inv.memberId)
      if (existing) {
        existing.value += inv.currentValue || 0
      } else {
        const member = familyMembers.find((m) => m.id === inv.memberId)
        memberMap.set(inv.memberId, {
          name: member?.name || inv.memberName || "Unknown",
          value: inv.currentValue || 0,
        })
      }
    })

    return Array.from(memberMap.values())
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [investments, familyMembers])

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
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-mono text-xs font-semibold mb-1">
            {data.payload.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Family Distribution</CardTitle>
        <CardDescription>Investments by family member</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No family investment data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                horizontal={false}
              />
              <XAxis
                type="number"
                className="text-xs font-mono"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  `${(value / 100000).toFixed(0)}L`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs font-mono"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill="oklch(0.65 0.18 250)"
                radius={[0, 4, 4, 0]}
                name="Value"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
