import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

// Type definitions
interface TransactionData {
  id: string
  date: Date
  type: string
  amount: number
  description: string
  category: string
  party: string | null
  tags: string[]
  isShared: boolean
  splits: unknown
  totalAmount: number | null
}

interface BudgetData {
  name: string
  totalAllocated: number
  subBudgets: { category: string; categoryId: string | null; allocated: number }[]
}

interface GoalData {
  name: string
  currentAmount: number
  targetAmount: number
  targetDate: Date | null
}

interface WatchlistData {
  name: string
  type: "category" | "tag" | "payee"
  value: string
  budgetLimit: number | null
  period: "monthly" | "yearly" | "custom"
  alertThreshold: number | null
}

function parseSplitsPayload(input: unknown): { amount: number }[] {
  if (!Array.isArray(input)) return []

  const parsed: { amount: number }[] = []
  for (const row of input) {
    if (typeof row !== "object" || row === null) continue
    const candidate = row as Record<string, unknown>
    const amount = Number(candidate.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue
    parsed.push({ amount })
  }

  return parsed
}

function resolveBudgetImpactAmount(transaction: TransactionData): number {
  if (transaction.type !== "expense") return 0

  const baseAmount = Math.abs(transaction.amount)
  if (!transaction.isShared) return Number(baseAmount.toFixed(2))

  const parsedSplits = parseSplitsPayload(transaction.splits)
  if (parsedSplits.length === 0) return Number(baseAmount.toFixed(2))

  const resolvedTotal = transaction.totalAmount && transaction.totalAmount > 0
    ? transaction.totalAmount
    : baseAmount
  const othersShare = parsedSplits.reduce((sum, split) => sum + split.amount, 0)
  const userShare = Math.max(0, resolvedTotal - othersShare)
  return Number(Math.min(resolvedTotal, userShare).toFixed(2))
}

function resolveCategoryLabel(categoryValue: string, categoryNameById: Map<string, string>): string {
  return categoryNameById.get(categoryValue) || categoryValue
}

function normalizeText(input: string | null | undefined): string {
  return String(input || "").trim().toLowerCase()
}

function transactionMatchesWatchlist(
  transaction: TransactionData,
  watchlist: WatchlistData,
  categoryNameById: Map<string, string>
): boolean {
  const watchValue = normalizeText(watchlist.value)
  if (!watchValue) return false

  if (watchlist.type === "category") {
    const txCategoryRaw = normalizeText(transaction.category)
    const txCategoryLabel = normalizeText(resolveCategoryLabel(transaction.category, categoryNameById))
    return txCategoryRaw === watchValue || txCategoryLabel === watchValue
  }

  if (watchlist.type === "tag") {
    return transaction.tags.some(tag => normalizeText(tag) === watchValue)
  }

  const txParty = normalizeText(transaction.party)
  const txDescription = normalizeText(transaction.description)
  return txParty.includes(watchValue) || txDescription.includes(watchValue)
}

// POST /api/insights/generate - Generate AI-powered insights
export async function POST() {
  try {
    const user = await requireAuth()

    // Fetch user's financial data
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const elapsedDays = Math.max(
      1,
      Math.ceil((Math.min(now.getTime(), thisMonthEnd.getTime()) - thisMonthStart.getTime()) / (24 * 60 * 60 * 1000))
    )
    const totalDaysInMonth = Math.max(
      1,
      Math.ceil((thisMonthEnd.getTime() - thisMonthStart.getTime()) / (24 * 60 * 60 * 1000))
    )

    const [
      transactions,
      budgets,
      goals,
      watchlists,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: lastMonthStart, lte: thisMonthEnd },
        },
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          description: true,
          category: true,
          party: true,
          tags: true,
          isShared: true,
          splits: true,
          totalAmount: true,
        },
      }) as Promise<TransactionData[]>,
      prisma.budget.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          name: true,
          totalAllocated: true,
          subBudgets: {
            select: {
              category: true,
              categoryId: true,
              allocated: true,
            },
          },
        },
      }) as Promise<BudgetData[]>,
      prisma.goal.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          name: true,
          currentAmount: true,
          targetAmount: true,
          targetDate: true,
        },
      }) as Promise<GoalData[]>,
      prisma.watchlist.findMany({
        where: {
          userId: user.id,
          isActive: true,
          alertEnabled: true,
        },
        select: {
          name: true,
          type: true,
          value: true,
          budgetLimit: true,
          period: true,
          alertThreshold: true,
        },
      }) as Promise<WatchlistData[]>,
    ])

    const categoryIds = [
      ...new Set([
        ...transactions.map(transaction => transaction.category),
        ...budgets.flatMap(budget =>
          budget.subBudgets.map(subBudget => subBudget.categoryId).filter((value): value is string => Boolean(value))
        ),
      ]),
    ].filter(Boolean)

    const categoryRows = categoryIds.length === 0
      ? []
      : await prisma.category.findMany({
          where: {
            userId: user.id,
            id: { in: categoryIds },
          },
          select: {
            id: true,
            name: true,
          },
        })

    const categoryNameById = new Map(categoryRows.map(category => [category.id, category.name]))

    const thisMonthTransactions = transactions.filter(
      transaction => transaction.date >= thisMonthStart && transaction.date <= thisMonthEnd
    )
    const lastMonthTransactions = transactions.filter(
      transaction => transaction.date >= lastMonthStart && transaction.date < thisMonthStart
    )
    const thisMonthExpenseTransactions = thisMonthTransactions.filter(transaction => transaction.type === "expense")
    const lastMonthExpenseTransactions = lastMonthTransactions.filter(transaction => transaction.type === "expense")

    // Calculate spending patterns
    const thisMonthSpending = thisMonthExpenseTransactions
      .reduce((sum: number, transaction) => sum + resolveBudgetImpactAmount(transaction), 0)

    const lastMonthSpending = lastMonthExpenseTransactions
      .reduce((sum: number, transaction) => sum + resolveBudgetImpactAmount(transaction), 0)

    const spendingChange = lastMonthSpending > 0
      ? ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100
      : (thisMonthSpending > 0 ? 100 : 0)

    // Category breakdown
    const categorySpending = thisMonthExpenseTransactions
      .reduce((acc, transaction) => {
        const categoryLabel = resolveCategoryLabel(transaction.category, categoryNameById)
        acc[categoryLabel] = (acc[categoryLabel] || 0) + resolveBudgetImpactAmount(transaction)
        return acc
      }, {} as Record<string, number>)

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Generate insights
    const insights: Record<string, unknown>[] = []
    const emittedTitles = new Set<string>()
    const pushInsight = (insight: Record<string, unknown>) => {
      const title = typeof insight.title === "string" ? insight.title : null
      if (!title || emittedTitles.has(title)) return
      emittedTitles.add(title)
      insights.push(insight)
    }

    // 1. Spending Trend Insight
    if (Math.abs(spendingChange) > 10) {
      const severity = spendingChange > 20 ? 'warning' : 'info'
      pushInsight({
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
      const topCategoryShare = thisMonthSpending > 0
        ? ((topCategory[1] / thisMonthSpending) * 100).toFixed(1)
        : "0.0"
      pushInsight({
        userId: user.id,
        type: 'spending_pattern',
        title: `💳 Top Spending Category: ${topCategory[0]}`,
        description: `You've spent $${topCategory[1].toFixed(2)} on ${topCategory[0]} this month, accounting for ${topCategoryShare}% of your total spending.`,
        severity: 'info',
        category: topCategory[0],
        data: {
          categories: Object.fromEntries(topCategories),
        },
      })
    }

    // 3. Budget Alerts
    for (const budget of budgets) {
      const budgetSpending = thisMonthExpenseTransactions
        .reduce((sum, transaction) => {
          if (budget.subBudgets.length === 0) {
            return sum + resolveBudgetImpactAmount(transaction)
          }

          const transactionCategoryName = resolveCategoryLabel(transaction.category, categoryNameById)
          const isBudgetMatched = budget.subBudgets.some(subBudget =>
            (subBudget.categoryId && subBudget.categoryId === transaction.category) ||
            subBudget.category === transaction.category ||
            subBudget.category === transactionCategoryName
          )

          if (!isBudgetMatched) return sum
          return sum + resolveBudgetImpactAmount(transaction)
        }, 0)

      const budgetPercentage = budget.totalAllocated > 0
        ? (budgetSpending / budget.totalAllocated) * 100
        : 0
      const projectedBudgetSpent = elapsedDays > 0
        ? (budgetSpending / elapsedDays) * totalDaysInMonth
        : budgetSpending

      if (budget.totalAllocated > 0 && budgetPercentage > 80) {
        pushInsight({
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

      if (
        budget.totalAllocated > 0 &&
        budgetPercentage < 80 &&
        projectedBudgetSpent > budget.totalAllocated
      ) {
        const overBy = projectedBudgetSpent - budget.totalAllocated
        pushInsight({
          userId: user.id,
          type: "recommendation",
          title: `⏱️ Pace Alert: ${budget.name}`,
          description: `At your current pace, ${budget.name} is projected to exceed budget by $${overBy.toFixed(2)} this month.`,
          severity: "warning",
          data: {
            budgetName: budget.name,
            projectedSpent: Number(projectedBudgetSpent.toFixed(2)),
            allocated: budget.totalAllocated,
            projectedOverBy: Number(overBy.toFixed(2)),
          },
        })
      } else if (
        budget.totalAllocated > 0 &&
        budgetPercentage > 0 &&
        budgetPercentage <= 60 &&
        projectedBudgetSpent < budget.totalAllocated * 0.9
      ) {
        pushInsight({
          userId: user.id,
          type: "recommendation",
          title: `✅ Good Pace: ${budget.name}`,
          description: `You're pacing well in ${budget.name}. Current trend projects you to finish under budget.`,
          severity: "success",
          data: {
            budgetName: budget.name,
            projectedSpent: Number(projectedBudgetSpent.toFixed(2)),
            allocated: budget.totalAllocated,
          },
        })
      }
    }

    // 4. Goal Progress
    for (const goal of goals) {
      const progress = (goal.currentAmount / goal.targetAmount) * 100

      if (progress >= 25 && progress < 30) {
        pushInsight({
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
        pushInsight({
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
    const avgTransactionAmount = thisMonthSpending / Math.max(thisMonthExpenseTransactions.length, 1)
    const largeTransactions = thisMonthExpenseTransactions
      .map(transaction => ({
        ...transaction,
        budgetImpactAmount: resolveBudgetImpactAmount(transaction),
      }))
      .filter(transaction => transaction.budgetImpactAmount > avgTransactionAmount * 3)

    if (largeTransactions.length > 0) {
      pushInsight({
        userId: user.id,
        type: 'anomaly',
        title: '🔍 Unusual Spending Detected',
        description: `Found ${largeTransactions.length} transaction(s) significantly above your average spending. Review these to ensure they're expected.`,
        severity: 'info',
        data: {
          count: largeTransactions.length,
          transactions: largeTransactions.map(transaction => ({
            description: transaction.description,
            amount: transaction.budgetImpactAmount,
            date: transaction.date,
          })),
        },
      })
    }

    // 6. Watchlist trend + frequency insights
    for (const watchlist of watchlists) {
      const threshold = watchlist.alertThreshold || 80
      const thisMonthWatchTransactions = thisMonthExpenseTransactions.filter(transaction =>
        transactionMatchesWatchlist(transaction, watchlist, categoryNameById)
      )
      const lastMonthWatchTransactions = lastMonthExpenseTransactions.filter(transaction =>
        transactionMatchesWatchlist(transaction, watchlist, categoryNameById)
      )

      const thisMonthWatchSpent = thisMonthWatchTransactions.reduce(
        (sum, transaction) => sum + resolveBudgetImpactAmount(transaction),
        0
      )
      const lastMonthWatchSpent = lastMonthWatchTransactions.reduce(
        (sum, transaction) => sum + resolveBudgetImpactAmount(transaction),
        0
      )
      const watchCount = thisMonthWatchTransactions.length

      if (watchlist.period === "monthly" && lastMonthWatchSpent > 0 && thisMonthWatchSpent >= 20) {
        const change = ((thisMonthWatchSpent - lastMonthWatchSpent) / lastMonthWatchSpent) * 100
        if (Math.abs(change) >= 25) {
          pushInsight({
            userId: user.id,
            type: "spending_pattern",
            title: `📊 Watchlist Trend: ${watchlist.name}`,
            description: `${watchlist.name} spending is ${Math.abs(change).toFixed(1)}% ${change > 0 ? "higher" : "lower"} than last month.`,
            severity: change > 0 ? "warning" : "success",
            category: watchlist.type === "category" ? watchlist.value : undefined,
            data: {
              watchlist: watchlist.name,
              thisMonth: Number(thisMonthWatchSpent.toFixed(2)),
              lastMonth: Number(lastMonthWatchSpent.toFixed(2)),
              percentChange: Number(change.toFixed(2)),
            },
          })
        }
      }

      if (watchCount >= 8) {
        pushInsight({
          userId: user.id,
          type: "recommendation",
          title: `🔁 Pattern Alert: ${watchlist.name}`,
          description: `You have ${watchCount} ${watchlist.type} transactions in ${watchlist.name} this month.`,
          severity: "info",
          category: watchlist.type === "category" ? watchlist.value : undefined,
          data: {
            watchlist: watchlist.name,
            type: watchlist.type,
            count: watchCount,
          },
        })
      }

      if (watchlist.budgetLimit && watchlist.budgetLimit > 0) {
        const usage = (thisMonthWatchSpent / watchlist.budgetLimit) * 100
        const projectedWatchlistSpent = elapsedDays > 0
          ? (thisMonthWatchSpent / elapsedDays) * totalDaysInMonth
          : thisMonthWatchSpent

        if (usage >= threshold) {
          pushInsight({
            userId: user.id,
            type: "budget_alert",
            title: `⚠️ Watchlist Limit: ${watchlist.name}`,
            description: `${watchlist.name} reached ${usage.toFixed(1)}% of its limit ($${thisMonthWatchSpent.toFixed(2)} / $${watchlist.budgetLimit.toFixed(2)}).`,
            severity: usage >= 100 ? "critical" : "warning",
            category: watchlist.type === "category" ? watchlist.value : undefined,
            data: {
              watchlist: watchlist.name,
              spent: Number(thisMonthWatchSpent.toFixed(2)),
              budgetLimit: watchlist.budgetLimit,
              usagePercent: Number(usage.toFixed(2)),
            },
          })
        } else if (projectedWatchlistSpent > watchlist.budgetLimit) {
          pushInsight({
            userId: user.id,
            type: "recommendation",
            title: `⏳ Forecast Risk: ${watchlist.name}`,
            description: `At current pace, ${watchlist.name} may exceed its limit by month end.`,
            severity: "warning",
            category: watchlist.type === "category" ? watchlist.value : undefined,
            data: {
              watchlist: watchlist.name,
              projectedSpent: Number(projectedWatchlistSpent.toFixed(2)),
              budgetLimit: watchlist.budgetLimit,
            },
          })
        }
      }
    }

    // Save insights to database
    if (insights.length > 0) {
      await prisma.insight.createMany({
        data: insights as never[],
      })
    }

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.insights, USER_CACHE_SCOPES.chatContext, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({
      success: true,
      count: insights.length,
      insights,
    })
  } catch (error) {
    console.error("Error generating insights:", error)
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    )
  }
}
