"use client"

import { useApp } from "@/contexts/AppContext"
import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

interface ActivityHeatmapProps {
  onDateSelect?: (date: string | null) => void
  selectedDate?: string | null
}

export function ActivityHeatmap({ onDateSelect, selectedDate }: ActivityHeatmapProps) {
  const { transactions } = useApp()

  const heatmapData = useMemo(() => {
    const now = new Date()
    const oneYearAgo = new Date(now)
    oneYearAgo.setFullYear(now.getFullYear() - 1)

    // Create a map of dates to transaction counts
    const activityMap = new Map<string, number>()

    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      if (date >= oneYearAgo) {
        const dateKey = date.toISOString().split("T")[0]
        activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1)
      }
    })

    // Generate array of last 365 days
    const days: Array<{ date: string; count: number; dayOfWeek: number }> = []
    for (let i = 364; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split("T")[0]
      days.push({
        date: dateKey,
        count: activityMap.get(dateKey) || 0,
        dayOfWeek: date.getDay(),
      })
    }

    // Group by weeks
    const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>> = []
    let currentWeek: Array<{ date: string; count: number; dayOfWeek: number }> = []

    // Pad beginning to start on Sunday
    const firstDayOfWeek = days[0].dayOfWeek
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: "", count: 0, dayOfWeek: i })
    }

    days.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(day)
    })

    if (currentWeek.length > 0) {
      // Pad end to complete the week
      while (currentWeek.length < 7) {
        currentWeek.push({ date: "", count: 0, dayOfWeek: currentWeek.length })
      }
      weeks.push(currentWeek)
    }

    const maxCount = Math.max(...Array.from(activityMap.values()), 1)

    return { weeks, maxCount }
  }, [transactions])

  const getIntensityClass = (count: number, maxCount: number) => {
    if (count === 0) return "bg-muted"
    const intensity = count / maxCount
    if (intensity <= 0.25) return "bg-emerald-200 dark:bg-emerald-900"
    if (intensity <= 0.5) return "bg-emerald-400 dark:bg-emerald-700"
    if (intensity <= 0.75) return "bg-emerald-600 dark:bg-emerald-500"
    return "bg-emerald-800 dark:bg-emerald-300"
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Activity</CardTitle>
        <CardDescription>Your transaction activity over the last year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-0.5">
            {heatmapData.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => {
                  const isSelected = selectedDate === day.date
                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3 h-3 rounded-sm transition-all ${
                        day.date ? getIntensityClass(day.count, heatmapData.maxCount) : "bg-transparent"
                      } ${day.date ? "hover:ring-2 hover:ring-foreground/20 cursor-pointer" : ""} ${
                        isSelected ? "ring-2 ring-primary scale-125" : ""
                      }`}
                      title={day.date ? `${formatDate(day.date)}: ${day.count} transaction${day.count !== 1 ? "s" : ""}` : ""}
                      onClick={() => {
                        if (day.date && onDateSelect) {
                          onDateSelect(isSelected ? null : day.date)
                        }
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground font-mono">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
            <div className="w-3 h-3 rounded-sm bg-emerald-800 dark:bg-emerald-300" />
          </div>
          <span>More</span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground font-mono">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {transactions.filter(t => {
                const date = new Date(t.date)
                const now = new Date()
                const oneYearAgo = new Date(now)
                oneYearAgo.setFullYear(now.getFullYear() - 1)
                return date >= oneYearAgo
              }).length}
            </p>
            <p className="text-xs text-muted-foreground font-mono">Last Year</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {new Set(
                transactions
                  .filter(t => {
                    const date = new Date(t.date)
                    const now = new Date()
                    const oneYearAgo = new Date(now)
                    oneYearAgo.setFullYear(now.getFullYear() - 1)
                    return date >= oneYearAgo
                  })
                  .map(t => t.date.split("T")[0])
              ).size}
            </p>
            <p className="text-xs text-muted-foreground font-mono">Active Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {(() => {
                const last30Days = transactions.filter(t => {
                  const date = new Date(t.date)
                  const now = new Date()
                  const thirtyDaysAgo = new Date(now)
                  thirtyDaysAgo.setDate(now.getDate() - 30)
                  return date >= thirtyDaysAgo
                })
                return last30Days.length
              })()}
            </p>
            <p className="text-xs text-muted-foreground font-mono">Last 30 Days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
