import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

// POST /api/insights/generate - Generate AI-powered insights
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    // Fetch user's financial data
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    const [
      thisMonthTransactions,
      lastMonthTransactions,
      accounts,
      budgets,
      goals,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: thisMonthStart, lte: thisMonthEnd },
        },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.financialAccount.findMany({
        where: { userId: user.id },
      }),
      prisma.budget.findMany({
        where: { userId: user.id, isActive: true },
        include: { subBudgets: true },
      }),
      prisma.goal.findMany({
        where: { userId: user.id, isActive: true },
      }),
    ])

    // Calculate spending patterns
    const thisMonthSpending = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const lastMonthSpending = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const spendingChange = ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100

    // Category breakdown
    const categorySpending = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount)
        return acc
      }, {} as Record<string, number>)

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Generate insights
    const insights = []

    // 1. Spending Trend Insight
    if (Math.abs(spendingChange) > 10) {
      const severity = spendingChange > 20 ? 'warning' : 'info'
      insights.push({
        userId: user.id,
        type: 'spending_pattern',
        title: spendingChange > 0 ? '📈 Spending Increased' : '📉 Spending Decreased',
        description: `Your spending this month is ${Math.abs(spendingChange).toFixed(1)}% ${spendingChange > 0 ? 'higher' : 'lower'} than last month. This month: $${thisMonthSpending.toFixed(2)}, Last month: $${lastMonthSpending.toFixed(2)}.`,
        severity,
        data: {
          thisMonth: thisMonthSpending,
          lastMonth: lastMonthSpending,
          change: spendingChange,
        },
      })
    }

    // 2. Top Categories Insight
    if (topCategories.length > 0) {
      const topCategory = topCategories[0]
      insights.push({
        userId: user.id,
        type: 'spending_pattern',
        title: `💳 Top Spending Category: ${topCategory[0]}`,
        description: `You've spent $${topCategory[1].toFixed(2)} on ${topCategory[0]} this month, accounting for ${((topCategory[1] / thisMonthSpending) * 100).toFixed(1)}% of your total spending.`,
        severity: 'info',
        category: topCategory[0],
        data: {
          categories: Object.fromEntries(topCategories),
        },
      })
    }

    // 3. Budget Alerts
    for (const budget of budgets) {
      const budgetSpending = thisMonthTransactions
        .filter(t => t.type === 'expense' && budget.subBudgets.some(sb => sb.category === t.category))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const budgetPercentage = (budgetSpending / budget.totalAllocated) * 100

      if (budgetPercentage > 80) {
        insights.push({
          userId: user.id,
          type: 'budget_alert',
          title: `⚠️ Budget Alert: ${budget.name}`,
          description: `You've used ${budgetPercentage.toFixed(1)}% of your ${budget.name} budget ($${budgetSpending.toFixed(2)} of $${budget.totalAllocated.toFixed(2)}).`,
          severity: budgetPercentage > 100 ? 'critical' : 'warning',
          data: {
            budgetName: budget.name,
            spent: budgetSpending,
            allocated: budget.totalAllocated,
            percentage: budgetPercentage,
          },
        })
      }
    }

    // 4. Goal Progress
    for (const goal of goals) {
      const progress = (goal.currentAmount / goal.targetAmount) * 100

      if (progress >= 25 && progress < 30) {
        insights.push({
          userId: user.id,
          type: 'goal_progress',
          title: `🎯 Quarter Way There: ${goal.name}`,
          description: `You've reached ${progress.toFixed(1)}% of your goal! Keep up the great work.`,
          severity: 'success',
          data: {
            goalName: goal.name,
            current: goal.currentAmount,
            target: goal.targetAmount,
            progress,
          },
        })
      } else if (progress >= 50 && progress < 55) {
        insights.push({
          userId: user.id,
          type: 'goal_progress',
          title: `🎉 Halfway to ${goal.name}!`,
          description: `You're halfway there! $${goal.currentAmount.toFixed(2)} of $${goal.targetAmount.toFixed(2)} saved.`,
          severity: 'success',
          data: {
            goalName: goal.name,
            current: goal.currentAmount,
            target: goal.targetAmount,
            progress,
          },
        })
      }
    }

    // 5. Unusual Spending Detection
    const avgTransactionAmount = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) / Math.max(thisMonthTransactions.filter(t => t.type === 'expense').length, 1)

    const largeTransactions = thisMonthTransactions
      .filter(t => t.type === 'expense' && Math.abs(t.amount) > avgTransactionAmount * 3)

    if (largeTransactions.length > 0) {
      insights.push({
        userId: user.id,
        type: 'anomaly',
        title: '🔍 Unusual Spending Detected',
        description: `Found ${largeTransactions.length} transaction(s) significantly above your average spending. Review these to ensure they're expected.`,
        severity: 'info',
        data: {
          count: largeTransactions.length,
          transactions: largeTransactions.map(t => ({
            description: t.description,
            amount: t.amount,
            date: t.date,
          })),
        },
      })
    }

    // Save insights to database
    const createdInsights = await Promise.all(
      insights.map(insight => prisma.insight.create({ data: insight }))
    )

    return NextResponse.json({
      success: true,
      count: createdInsights.length,
      insights: createdInsights,
    })
  } catch (error) {
    console.error("Error generating insights:", error)
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    )
  }
}
