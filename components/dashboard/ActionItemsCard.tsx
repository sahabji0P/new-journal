"use client"

import { useApp } from "@/contexts/AppContext"
import { Button } from "../ui/button"
import {
  AlertCircle,
  Target,
  DollarSign,
  Repeat,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useMemo, useState } from "react"
import Link from "next/link"

export function ActionItemsBanner() {
  const {
    goals,
    recurringTransactions,
    budgets,
    settlements,
    formatCurrency,
  } = useApp()

  const [expanded, setExpanded] = useState(false)

  const actionItems = useMemo(() => {
    const items: Array<{
      id: string
      title: string
      description: string
      actionLink: string
      actionLabel: string
      icon: React.ReactNode
      severity: "high" | "medium" | "low"
    }> = []

    const today = new Date().toISOString().split("T")[0]
    const now = new Date()

    // Overdue Recurring
    recurringTransactions
      .filter(r => r.isActive && r.nextDueDate < today)
      .forEach(r => {
        items.push({
          id: `recurring-${r.id}`,
          title: "Overdue Transaction",
          description: `"${r.description}" was due ${new Date(r.nextDueDate).toLocaleDateString()}`,
          actionLink: "/transactions/recurring",
          actionLabel: "Review",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          severity: "high",
        })
      })

    // Goals Behind
    goals.forEach(goal => {
      if (goal.targetDate) {
        const targetDate = new Date(goal.targetDate)
        const daysRemaining = Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysRemaining > 0 && daysRemaining <= 30 && goal.currentAmount < goal.targetAmount * 0.7) {
          items.push({
            id: `goal-${goal.id}`,
            title: "Goal Behind",
            description: `"${goal.name}" needs ${formatCurrency(goal.targetAmount - goal.currentAmount)} in ${daysRemaining}d`,
            actionLink: "/settings",
            actionLabel: "View",
            icon: <Target className="w-3.5 h-3.5" />,
            severity: "medium",
          })
        }
      }
    })

    // Budgets
    budgets.forEach(budget => {
      if (budget.type === "monthly") {
        if (budget.totalSpent > budget.totalAllocated) {
          items.push({
            id: `budget-${budget.id}`,
            title: "Over Budget",
            description: `"${budget.name}" over by ${formatCurrency(budget.totalSpent - budget.totalAllocated)}`,
            actionLink: "/transactions/budget",
            actionLabel: "Review",
            icon: <DollarSign className="w-3.5 h-3.5" />,
            severity: "high",
          })
        } else if (budget.totalAllocated > 0 && budget.totalSpent / budget.totalAllocated > 0.9) {
          items.push({
            id: `budget-alert-${budget.id}`,
            title: "Budget Alert",
            description: `"${budget.name}" at ${Math.round((budget.totalSpent / budget.totalAllocated) * 100)}%`,
            actionLink: "/transactions/budget",
            actionLabel: "Review",
            icon: <DollarSign className="w-3.5 h-3.5" />,
            severity: "medium",
          })
        }
      }
    })

    // Settlements
    const pending = settlements.filter(s => !s.isSettled)
    if (pending.length > 0) {
      items.push({
        id: "settlements",
        title: "Pending Settlements",
        description: `${pending.length} unsettled (${formatCurrency(pending.reduce((s, x) => s + x.amount, 0))})`,
        actionLink: "/settlements",
        actionLabel: "Settle",
        icon: <Users className="w-3.5 h-3.5" />,
        severity: "low",
      })
    }

    // Upcoming bills
    const upcoming = recurringTransactions.filter(r => {
      if (!r.isActive) return false
      const due = new Date(r.nextDueDate)
      const week = new Date()
      week.setDate(week.getDate() + 7)
      return due <= week && due >= now
    })
    if (upcoming.length > 0) {
      items.push({
        id: "upcoming-bills",
        title: "Upcoming Bills",
        description: `${upcoming.length} due this week`,
        actionLink: "/transactions/recurring",
        actionLabel: "View",
        icon: <Repeat className="w-3.5 h-3.5" />,
        severity: "low",
      })
    }

    const order = { high: 0, medium: 1, low: 2 }
    return items.sort((a, b) => order[a.severity] - order[b.severity])
  }, [goals, recurringTransactions, budgets, settlements, formatCurrency])

  if (actionItems.length === 0) return null

  const severityColor = {
    high: "text-red-400",
    medium: "text-amber-400",
    low: "text-muted-foreground",
  }

  const highCount = actionItems.filter(i => i.severity === "high").length

  return (
    <div className="glass-subtle rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 ${highCount > 0 ? "text-red-400" : "text-amber-400"}`}>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {actionItems.length} action item{actionItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          {highCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
              {highCount} urgent
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {actionItems.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-white/[0.02]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={severityColor[item.severity]}>{item.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{item.description}</span>
                </div>
              </div>
              <Link href={item.actionLink}>
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2 shrink-0">
                  {item.actionLabel}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
