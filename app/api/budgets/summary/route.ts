import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, stableSearchParamsKey, USER_CACHE_SCOPES } from "@/lib/server-cache"

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function getDateRange(searchParams: URLSearchParams): { start: Date; end: Date } {
  const period = searchParams.get("period") || "month"
  const now = new Date()

  if (period === "custom") {
    const startRaw = searchParams.get("start")
    const endRaw = searchParams.get("end")
    const start = startRaw ? new Date(startRaw) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
    const end = endRaw ? new Date(endRaw) : endOfDay(now)
    return { start: startOfDay(start), end: endOfDay(end) }
  }

  if (period === "last30") {
    const end = endOfDay(now)
    const start = startOfDay(new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000)))
    return { start, end }
  }

  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  return { start, end }
}

function intersects(rangeA: { start: Date; end: Date }, rangeB: { start: Date; end: Date }): boolean {
  return rangeA.start <= rangeB.end && rangeB.start <= rangeA.end
}

function resolveBudgetWindow(
  budget: { type: string; periodType: string; startDate: Date | null; endDate: Date | null },
  fallback: { start: Date; end: Date },
) {
  const now = new Date()

  if (budget.periodType === "custom" || budget.type === "event" || budget.type === "trip") {
    const start = budget.startDate ? startOfDay(new Date(budget.startDate)) : fallback.start
    const end = budget.endDate ? endOfDay(new Date(budget.endDate)) : fallback.end
    return { start, end }
  }

  if (budget.periodType === "rolling") {
    const end = endOfDay(now)
    const start = startOfDay(new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000)))
    return { start, end }
  }

  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  return { start, end }
}

// GET /api/budgets/summary - Get budget summary for a period
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const range = getDateRange(searchParams)
    const payload = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.budgetSummary,
      keyParts: [stableSearchParamsKey(searchParams)],
      revalidateSeconds: 20,
      loader: async () => {
        const [budgets, transactions] = await Promise.all([
          prisma.budget.findMany({
            where: { userId: user.id, isActive: true },
            include: { subBudgets: true },
            orderBy: { createdAt: "desc" },
          }),
          prisma.transaction.findMany({
            where: {
              userId: user.id,
              type: "expense",
              date: { gte: range.start, lte: range.end },
            },
            select: {
              date: true,
              amount: true,
              category: true,
            },
          }),
        ])

        const categoryIds = [...new Set(transactions.map(transaction => transaction.category).filter(Boolean))]
        const categories = categoryIds.length === 0
          ? []
          : await prisma.category.findMany({
              where: {
                userId: user.id,
                id: { in: categoryIds },
              },
              select: { id: true, name: true },
            })
        const categoryNameById = new Map(categories.map(category => [category.id, category.name]))

        const budgetSummaries = budgets.map(budget => {
          const budgetWindow = resolveBudgetWindow(budget, range)
          const matchesQueryWindow = intersects(budgetWindow, range)

          let totalSpent = 0
          const subBudgetSpent = new Map<string, number>()

          if (matchesQueryWindow) {
            transactions.forEach(transaction => {
              const txDate = new Date(transaction.date)
              if (txDate < budgetWindow.start || txDate > budgetWindow.end) return

              const txCategoryValue = transaction.category
              const txCategoryName = categoryNameById.get(txCategoryValue) || txCategoryValue
              const txAmount = Math.abs(transaction.amount)

              const matchedSubBudgets = budget.subBudgets.filter(subBudget =>
                (subBudget.categoryId && subBudget.categoryId === txCategoryValue) ||
                subBudget.category === txCategoryValue ||
                subBudget.category === txCategoryName
              )

              if (matchedSubBudgets.length === 0 && budget.subBudgets.length > 0) return

              totalSpent += txAmount

              matchedSubBudgets.forEach(subBudget => {
                subBudgetSpent.set(subBudget.id, (subBudgetSpent.get(subBudget.id) || 0) + txAmount)
              })
            })
          }

          const totalAllocated = Math.max(0, budget.totalAllocated)
          const usagePercent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

          const now = new Date()
          const periodStart = budgetWindow.start
          const periodEnd = budgetWindow.end
          const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)))
          const elapsedDays = Math.min(
            totalDays,
            Math.max(1, Math.ceil((Math.min(now.getTime(), periodEnd.getTime()) - periodStart.getTime()) / (24 * 60 * 60 * 1000)))
          )
          const projectedSpent = totalDays > 0 ? (totalSpent / elapsedDays) * totalDays : totalSpent

          const warningThreshold = budget.warningThreshold || 80
          const criticalThreshold = budget.criticalThreshold || 100

          return {
            id: budget.id,
            name: budget.name,
            type: budget.type,
            method: budget.method,
            periodType: budget.periodType,
            totalAllocated,
            totalSpent: Number(totalSpent.toFixed(2)),
            remaining: Number((totalAllocated - totalSpent).toFixed(2)),
            usagePercent: Number(usagePercent.toFixed(2)),
            projectedSpent: Number(projectedSpent.toFixed(2)),
            warningThreshold,
            criticalThreshold,
            atRisk: usagePercent >= warningThreshold || projectedSpent > totalAllocated,
            overLimit: usagePercent >= criticalThreshold || totalSpent > totalAllocated,
            subBudgets: budget.subBudgets.map(subBudget => {
              const spent = subBudgetSpent.get(subBudget.id) || 0
              const subUsage = subBudget.allocated > 0 ? (spent / subBudget.allocated) * 100 : 0
              return {
                id: subBudget.id,
                category: subBudget.category,
                categoryId: subBudget.categoryId,
                allocated: subBudget.allocated,
                spent: Number(spent.toFixed(2)),
                usagePercent: Number(subUsage.toFixed(2)),
                alertThreshold: subBudget.alertThreshold || warningThreshold,
              }
            }),
          }
        })

        const totals = budgetSummaries.reduce(
          (acc, summary) => {
            acc.allocated += summary.totalAllocated
            acc.spent += summary.totalSpent
            if (summary.atRisk) acc.atRiskCount += 1
            if (summary.overLimit) acc.overLimitCount += 1
            return acc
          },
          { allocated: 0, spent: 0, atRiskCount: 0, overLimitCount: 0 }
        )

        return {
          range,
          totals: {
            ...totals,
            allocated: Number(totals.allocated.toFixed(2)),
            spent: Number(totals.spent.toFixed(2)),
            remaining: Number((totals.allocated - totals.spent).toFixed(2)),
            usagePercent: totals.allocated > 0 ? Number(((totals.spent / totals.allocated) * 100).toFixed(2)) : 0,
          },
          budgets: budgetSummaries,
        }
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error generating budget summary:", error)
    return NextResponse.json(
      { error: "Failed to generate budget summary" },
      { status: 500 }
    )
  }
}
