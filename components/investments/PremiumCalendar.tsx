"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { cn } from "@/lib/utils"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isPast,
  differenceInDays,
} from "date-fns"
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react"
import type { InsurancePolicyRecord } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PremiumCalendar() {
  const { policies, formatCurrency } = useInvestments()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // -----------------------------------------------------------------------
  // Build calendar data
  // -----------------------------------------------------------------------

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  // Map of date string -> policies due on that date
  const premiumsByDate = useMemo(() => {
    const map = new Map<string, InsurancePolicyRecord[]>()

    for (const policy of policies) {
      if (!policy.nextPremiumDate || policy.status !== "active") continue

      const premiumDate = new Date(policy.nextPremiumDate)
      if (!isSameMonth(premiumDate, currentMonth)) continue

      const key = format(premiumDate, "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(policy)
    }

    return map
  }, [policies, currentMonth])

  // Upcoming premiums this month (sorted by date)
  const upcomingThisMonth = useMemo(() => {
    const entries: { date: string; policies: InsurancePolicyRecord[] }[] = []

    for (const [dateStr, pols] of premiumsByDate.entries()) {
      entries.push({ date: dateStr, policies: pols })
    }

    entries.sort((a, b) => a.date.localeCompare(b.date))
    return entries
  }, [premiumsByDate])

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // -----------------------------------------------------------------------
  // Dot color for a day
  // -----------------------------------------------------------------------

  const getDotClass = (day: Date): string | null => {
    const key = format(day, "yyyy-MM-dd")
    const pols = premiumsByDate.get(key)
    if (!pols || pols.length === 0) return null

    const dayDate = new Date(key)
    const days = differenceInDays(dayDate, today)

    if (isPast(dayDate) && days < 0) {
      return "bg-red-500"
    }

    if (days <= 7) {
      return "bg-amber-500"
    }

    return "bg-muted-foreground/40"
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="size-4" />
            Premium Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={goToPrevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={goToNextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <TooltipProvider>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {/* Day cells */}
            {daysInMonth.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dotClass = getDotClass(day)
              const isToday = isSameDay(day, today)
              const dayPolicies = premiumsByDate.get(key)

              const cell = (
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center h-9 rounded-md text-sm transition-colors",
                    isToday && "bg-primary/10 font-semibold",
                    dotClass && "cursor-pointer hover:bg-muted"
                  )}
                >
                  <span className={cn(isToday && "text-primary")}>
                    {format(day, "d")}
                  </span>
                  {dotClass && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 size-1.5 rounded-full",
                        dotClass
                      )}
                    />
                  )}
                </div>
              )

              if (dayPolicies && dayPolicies.length > 0) {
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>{cell}</TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <div className="space-y-1">
                        <p className="font-medium text-xs">
                          {format(day, "dd MMM yyyy")}
                        </p>
                        {dayPolicies.map((p) => (
                          <div key={p.id} className="text-xs">
                            {p.name} - {formatCurrency(p.premiumAmount)}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return <div key={key}>{cell}</div>
            })}
          </div>
        </TooltipProvider>

        {/* Summary list */}
        {upcomingThisMonth.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Premiums this month
            </p>
            <div className="space-y-2">
              {upcomingThisMonth.map(({ date, policies: pols }) => (
                <div key={date} className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground shrink-0 min-w-[60px]">
                    {format(new Date(date), "dd MMM")}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    {pols.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{p.name}</span>
                        <span className="font-mono shrink-0 ml-2">
                          {formatCurrency(p.premiumAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingThisMonth.length === 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground text-center py-2">
              No premiums due this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
