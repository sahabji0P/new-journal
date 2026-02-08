"use client"

import type React from "react"
import { PageLayout } from "@/components/PageLayout"
import { SpendingTrendsChart } from "@/components/analytics/SpendingTrendsChart"
import { CategoryBreakdown } from "@/components/analytics/CategoryBreakdown"
import { InsightCards } from "@/components/analytics/InsightCards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart, TrendingUp, Lightbulb } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Comprehensive insights into your financial data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SpendingTrendsChart months={6} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryBreakdown type="expense" months={1} />
            <CategoryBreakdown type="income" months={1} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription className="text-xs">
                Current month overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Avg. Daily Expense"
                  value="—"
                  color="text-red-600"
                />
                <StatCard
                  icon={<BarChart3 className="w-4 h-4" />}
                  label="Transaction Count"
                  value="—"
                  color="text-blue-600"
                />
                <StatCard
                  icon={<PieChart className="w-4 h-4" />}
                  label="Top Category"
                  value="—"
                  color="text-violet-600"
                />
                <StatCard
                  icon={<Lightbulb className="w-4 h-4" />}
                  label="Savings Rate"
                  value="—"
                  color="text-emerald-600"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription className="text-xs">
                Personalized financial insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InsightCards />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color?: string
}

function StatCard({ icon, label, value, color = "text-foreground" }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className={`flex items-center gap-2 mb-1 ${color}`}>
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}
