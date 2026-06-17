"use client"

import { useApp } from "@/contexts/AppContext"
import { useMemo, useState, useRef, useEffect } from "react"
import {
  AlertCircle,
  Bell,
  DollarSign,
  Repeat,
  Target,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { todayLocalStr } from "@/lib/utils"

interface ActionItem {
  id: string
  title: string
  description: string
  actionLink: string
  icon: React.ReactNode
  severity: "high" | "medium" | "low"
}

export function NotificationPanel() {
  const {
    goals,
    recurringTransactions,
    budgets,
    settlements,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    formatCurrency,
  } = useApp()

  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const actionItems = useMemo(() => {
    const items: ActionItem[] = []
    const today = todayLocalStr()
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
          icon: <AlertCircle className="w-4 h-4" />,
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
            title: "Goal Behind Schedule",
            description: `"${goal.name}" needs ${formatCurrency(goal.targetAmount - goal.currentAmount)} in ${daysRemaining}d`,
            actionLink: "/settings",
            icon: <Target className="w-4 h-4" />,
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
            icon: <DollarSign className="w-4 h-4" />,
            severity: "high",
          })
        } else if (budget.totalAllocated > 0 && budget.totalSpent / budget.totalAllocated > 0.9) {
          items.push({
            id: `budget-alert-${budget.id}`,
            title: "Budget at 90%+",
            description: `"${budget.name}" at ${Math.round((budget.totalSpent / budget.totalAllocated) * 100)}%`,
            actionLink: "/transactions/budget",
            icon: <DollarSign className="w-4 h-4" />,
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
        icon: <Users className="w-4 h-4" />,
        severity: "low",
      })
    }

    // Upcoming bills (7 days)
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
        icon: <Repeat className="w-4 h-4" />,
        severity: "low",
      })
    }

    const order = { high: 0, medium: 1, low: 2 }
    return items.sort((a, b) => order[a.severity] - order[b.severity])
  }, [goals, recurringTransactions, budgets, settlements, formatCurrency])

  // Combine action items with app notifications
  const unreadNotifications = notifications.filter(n => !n.isRead)
  const totalCount = actionItems.length + unreadNotifications.length

  const severityDot: Record<string, string> = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-muted-foreground/50",
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-10 w-10 inline-flex items-center justify-center rounded-xl glass glass-hover"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-h-[70vh] rounded-xl shadow-2xl overflow-hidden" style={{ background: "color-mix(in oklch, var(--card) 65%, transparent)", backdropFilter: "blur(32px) saturate(1.4)", WebkitBackdropFilter: "blur(32px) saturate(1.4)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.3)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {totalCount > 0 && (
              <button
                onClick={() => {
                  clearAllNotifications()
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
            {totalCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="py-1">
                {/* Action Items */}
                {actionItems.map(item => (
                  <Link
                    key={item.id}
                    href={item.actionLink}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="mt-0.5 text-muted-foreground shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[item.severity]}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    </div>
                  </Link>
                ))}

                {/* App Notifications */}
                {unreadNotifications.map(notif => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="mt-0.5 text-muted-foreground shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    </div>
                    <button
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
