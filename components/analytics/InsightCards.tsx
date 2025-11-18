"use client"

import { useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import { Card, CardContent } from "../ui/card"
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Calendar,
  DollarSign,
} from "lucide-react"

interface Insight {
  id: string
  type: "success" | "warning" | "info" | "tip"
  icon: React.ReactNode
  title: string
  message: string
}

export function InsightCards() {
  const { transactions, formatCurrency } = useApp()

  const insights = useMemo(() => {
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7)

    // Current month transactions
    const thisMonthTx = transactions.filter(t => t.date.startsWith(thisMonth))
    const lastMonthTx = transactions.filter(t => t.date.startsWith(lastMonth))

    const thisMonthExpense = thisMonthTx
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const lastMonthExpense = lastMonthTx
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const thisMonthIncome = thisMonthTx
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const insights: Insight[] = []

    // Spending trend insight
    if (lastMonthExpense > 0) {
      const change = ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100
      if (change < -10) {
        insights.push({
          id: "spending-down",
          type: "success",
          icon: <TrendingDown className="w-5 h-5" />,
          title: "Great Progress!",
          message: `Your spending is down ${Math.abs(change).toFixed(0)}% compared to last month. Keep it up!`,
        })
      } else if (change > 15) {
        insights.push({
          id: "spending-up",
          type: "warning",
          icon: <TrendingUp className="w-5 h-5" />,
          title: "Spending Alert",
          message: `Your spending increased by ${change.toFixed(0)}% this month. Consider reviewing your expenses.`,
        })
      }
    }

    // Income vs Expense balance
    const savingsRate = thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100 : 0
    if (savingsRate >= 20) {
      insights.push({
        id: "savings-good",
        type: "success",
        icon: <Target className="w-5 h-5" />,
        title: "Excellent Savings!",
        message: `You're saving ${savingsRate.toFixed(0)}% of your income. You're on track for your financial goals!`,
      })
    } else if (savingsRate < 0) {
      insights.push({
        id: "overspending",
        type: "warning",
        icon: <AlertCircle className="w-5 h-5" />,
        title: "Overspending Alert",
        message: `Your expenses exceed income this month by ${formatCurrency(Math.abs(thisMonthIncome - thisMonthExpense))}. Consider adjusting your budget.`,
      })
    }

    // Category insights
    const categoryTotals: Record<string, number> = {}
    thisMonthTx
      .filter(t => t.type === "expense")
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount)
      })

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    if (topCategory && thisMonthExpense > 0) {
      const percentage = (topCategory[1] / thisMonthExpense) * 100
      if (percentage > 40) {
        insights.push({
          id: "category-dominant",
          type: "info",
          icon: <DollarSign className="w-5 h-5" />,
          title: "Top Spending Category",
          message: `${topCategory[0]} accounts for ${percentage.toFixed(0)}% of your expenses (${formatCurrency(topCategory[1])}). Consider if this aligns with your priorities.`,
        })
      }
    }

    // Transaction frequency insight
    const avgDailyTransactions = thisMonthTx.length / now.getDate()
    if (avgDailyTransactions > 5) {
      insights.push({
        id: "frequent-tx",
        type: "tip",
        icon: <Calendar className="w-5 h-5" />,
        title: "Tracking Consistently",
        message: `You're logging an average of ${avgDailyTransactions.toFixed(1)} transactions per day. Great job staying on top of your finances!`,
      })
    }

    // General tip if no other insights
    if (insights.length === 0) {
      insights.push({
        id: "general-tip",
        type: "tip",
        icon: <Lightbulb className="w-5 h-5" />,
        title: "Financial Tip",
        message: "Try the 50/30/20 rule: allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.",
      })
    }

    return insights
  }, [transactions, formatCurrency])

  const getCardColor = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
      case "warning":
        return "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400"
      case "info":
        return "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
      case "tip":
        return "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400"
      default:
        return "bg-muted/30"
    }
  }

  const getIconColor = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return "text-emerald-600"
      case "warning":
        return "text-orange-600"
      case "info":
        return "text-blue-600"
      case "tip":
        return "text-purple-600"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="space-y-3">
      {insights.map(insight => (
        <Card key={insight.id} className={`border ${getCardColor(insight.type)}`}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className={`${getIconColor(insight.type)} mt-0.5`}>{insight.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                <p className="text-sm font-mono">{insight.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
