"use client"

import { useApp } from "@/contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import {
  AlertCircle,
  Target,
  DollarSign,
  Repeat,
  Users,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import { useMemo } from "react"
import Link from "next/link"

export function ActionItemsCard() {
  const {
    goals,
    recurringTransactions,
    budgets,
    settlements,
    formatCurrency,
  } = useApp()

  // Calculate action items
  const actionItems = useMemo(() => {
    const items: Array<{
      id: string
      type: "overdue" | "goal" | "budget" | "settlement" | "recurring"
      title: string
      description: string
      actionLink: string
      actionLabel: string
      icon: React.ReactNode
      severity: "high" | "medium" | "low"
    }> = []

    // 1. Overdue Recurring Transactions
    const today = new Date().toISOString().split("T")[0]
    const overdueRecurring = recurringTransactions.filter(
      r => r.isActive && r.nextDueDate < today
    )

    overdueRecurring.forEach(r => {
      items.push({
        id: `recurring-${r.id}`,
        type: "overdue",
        title: "Overdue Transaction",
        description: `"${r.description}" was due on ${new Date(r.nextDueDate).toLocaleDateString()}`,
        actionLink: "/transactions/recurring",
        actionLabel: "Review",
        icon: <AlertCircle className="w-4 h-4" />,
        severity: "high",
      })
    })

    // 2. Goals Behind Target (if has target date)
    const now = new Date()
    goals.forEach(goal => {
      if (goal.targetDate) {
        const targetDate = new Date(goal.targetDate)
        const daysRemaining = Math.ceil(
          (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysRemaining > 0 && daysRemaining <= 30) {
          const expectedProgress = goal.targetAmount
          const actualProgress = goal.currentAmount
          const remaining = goal.targetAmount - goal.currentAmount

          if (actualProgress < expectedProgress * 0.7) {
            // Behind by 30%+
            items.push({
              id: `goal-${goal.id}`,
              type: "goal",
              title: "Goal Behind Schedule",
              description: `"${goal.name}" needs ${formatCurrency(remaining)} in ${daysRemaining} days`,
              actionLink: "/settings",
              actionLabel: "Contribute",
              icon: <Target className="w-4 h-4" />,
              severity: "medium",
            })
          }
        }
      }
    })

    // 3. Budgets Exceeded
    budgets.forEach(budget => {
      if (budget.type === "monthly") {
        if (budget.totalSpent > budget.totalAllocated) {
          items.push({
            id: `budget-${budget.id}`,
            type: "budget",
            title: "Budget Exceeded",
            description: `"${budget.name}" over by ${formatCurrency(budget.totalSpent - budget.totalAllocated)}`,
            actionLink: "/transactions/budget",
            actionLabel: "Review",
            icon: <DollarSign className="w-4 h-4" />,
            severity: "high",
          })
        } else if (budget.totalSpent / budget.totalAllocated > 0.9) {
          items.push({
            id: `budget-${budget.id}`,
            type: "budget",
            title: "Budget Alert",
            description: `"${budget.name}" at ${Math.round((budget.totalSpent / budget.totalAllocated) * 100)}%`,
            actionLink: "/transactions/budget",
            actionLabel: "Review",
            icon: <DollarSign className="w-4 h-4" />,
            severity: "medium",
          })
        }
      }
    })

    // 4. Pending Settlements
    const pendingSettlements = settlements.filter(s => !s.isSettled)
    if (pendingSettlements.length > 0) {
      const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0)
      items.push({
        id: "settlements-pending",
        type: "settlement",
        title: "Pending Settlements",
        description: `${pendingSettlements.length} settlement(s) totaling ${formatCurrency(totalPending)}`,
        actionLink: "/transactions/settlements",
        actionLabel: "Settle",
        icon: <Users className="w-4 h-4" />,
        severity: "low",
      })
    }

    // 5. Upcoming Recurring (next 7 days)
    const upcomingRecurring = recurringTransactions.filter(r => {
      if (!r.isActive) return false
      const dueDate = new Date(r.nextDueDate)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      return dueDate <= sevenDaysFromNow && dueDate >= now
    })

    if (upcomingRecurring.length > 0) {
      items.push({
        id: "recurring-upcoming",
        type: "recurring",
        title: "Upcoming Bills",
        description: `${upcomingRecurring.length} transaction(s) due this week`,
        actionLink: "/transactions/recurring",
        actionLabel: "View",
        icon: <Repeat className="w-4 h-4" />,
        severity: "low",
      })
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }, [goals, recurringTransactions, budgets, settlements, formatCurrency])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
      case "medium":
        return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
      case "low":
        return "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
      default:
        return "bg-muted/30"
    }
  }

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            All Caught Up!
          </CardTitle>
          <CardDescription>No action items at the moment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground font-mono">
            You&apos;re on top of your finances. Keep up the great work!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Action Items
        </CardTitle>
        <CardDescription>
          {actionItems.length} item{actionItems.length !== 1 ? "s" : ""} need{actionItems.length === 1 ? "s" : ""} your attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionItems.map(item => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${getSeverityColor(item.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{item.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs font-mono opacity-90">{item.description}</p>
                  </div>
                </div>
                <Link href={item.actionLink}>
                  <Button size="sm" variant="outline" className="text-xs">
                    {item.actionLabel}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
