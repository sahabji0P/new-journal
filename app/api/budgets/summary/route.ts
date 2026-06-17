import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, stableSearchParamsKey, USER_CACHE_SCOPES } from "@/lib/server-cache"

type BudgetSummaryScope = "all" | "personal" | "shared"

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

function resolveScope(searchParams: URLSearchParams): BudgetSummaryScope {
  const raw = searchParams.get("scope")
  if (raw === "personal" || raw === "shared") return raw
  return "all"
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

function resolveBudgetImpactAmount(transaction: {
  amount: number
  isShared: boolean
  splits: unknown
  totalAmount: number | null
}): number {
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
    const scope = resolveScope(searchParams)
    const payload = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.budgetSummary,
      keyParts: [stableSearchParamsKey(searchParams)],
      revalidateSeconds: 60,
      loader: async () => {
        const [budgets, transactions, pendingSettlements] = await Promise.all([
          prisma.budget.findMany({
            where: { userId: user.id, isActive: true },
            select: {
              id: true,
              name: true,
              type: true,
              method: true,
              periodType: true,
              totalAllocated: true,
              totalSpent: true,
              warningThreshold: true,
              criticalThreshold: true,
              startDate: true,
              endDate: true,
              subBudgets: {
                select: { id: true, category: true, categoryId: true, allocated: true, alertThreshold: true },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.transaction.findMany({
            where: {
              userId: user.id,
              type: "expense",
              date: { gte: range.start, lte: range.end },
            },
            select: {
              id: true,
              date: true,
              amount: true,
              category: true,
              isShared: true,
              splits: true,
              totalAmount: true,
            },
          }),
          prisma.settlement.findMany({
            where: {
              userId: user.id,
              isSettled: false,
            },
            select: {
              amount: true,
              type: true,
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

        // Pre-index transactions by category for O(1) lookups per budget
        const txByCategory = new Map<string, typeof transactions>()
        for (const tx of transactions) {
          const catName = categoryNameById.get(tx.category) || tx.category
          // Index by raw category value
          const rawList = txByCategory.get(tx.category)
          if (rawList) {
            rawList.push(tx)
          } else {
            txByCategory.set(tx.category, [tx])
          }
          // Also index by resolved category name if different
          if (catName !== tx.category) {
            const nameList = txByCategory.get(catName)
            if (nameList) {
              nameList.push(tx)
            } else {
              txByCategory.set(catName, [tx])
            }
          }
        }

        const budgetSummaries = budgets.map(budget => {
          const budgetWindow = resolveBudgetWindow(budget, range)
          const matchesQueryWindow = intersects(budgetWindow, range)

          let totalSpent = 0
          const subBudgetSpent = new Map<string, number>()

          if (matchesQueryWindow) {
            const filterAndAccumulate = (tx: typeof transactions[number]) => {
              const txDate = new Date(tx.date)
              if (txDate < budgetWindow.start || txDate > budgetWindow.end) return
              if (scope === "personal" && tx.isShared) return
              if (scope === "shared" && !tx.isShared) return
              totalSpent += resolveBudgetImpactAmount(tx)
            }

            if (budget.subBudgets.length === 0) {
              // Catch-all budget: must check every transaction
              transactions.forEach(filterAndAccumulate)
            } else {
              // Only iterate transactions matching this budget's sub-budget categories
              const seen = new Set<string>()
              for (const subBudget of budget.subBudgets) {
                const keysToCheck = new Set<string>()
                if (subBudget.categoryId) keysToCheck.add(subBudget.categoryId)
                if (subBudget.category) keysToCheck.add(subBudget.category)

                for (const key of keysToCheck) {
                  const matchedTxs = txByCategory.get(key)
                  if (!matchedTxs) continue

                  for (const tx of matchedTxs) {
                    // Avoid double-counting a transaction across multiple sub-budget key matches
                    const txKey = tx.id
                    if (seen.has(txKey)) {
                      // Still accumulate sub-budget spend but not totalSpent
                      const txDate = new Date(tx.date)
                      if (txDate < budgetWindow.start || txDate > budgetWindow.end) continue
                      if (scope === "personal" && tx.isShared) continue
                      if (scope === "shared" && !tx.isShared) continue
                      const txAmount = resolveBudgetImpactAmount(tx)
                      subBudgetSpent.set(subBudget.id, (subBudgetSpent.get(subBudget.id) || 0) + txAmount)
                      continue
                    }

                    const txDate = new Date(tx.date)
                    if (txDate < budgetWindow.start || txDate > budgetWindow.end) continue
                    if (scope === "personal" && tx.isShared) continue
                    if (scope === "shared" && !tx.isShared) continue

                    const txAmount = resolveBudgetImpactAmount(tx)
                    seen.add(txKey)
                    totalSpent += txAmount
                    subBudgetSpent.set(subBudget.id, (subBudgetSpent.get(subBudget.id) || 0) + txAmount)
                  }
                }
              }
            }
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
        const pending = pendingSettlements.reduce(
          (acc, settlement) => {
            if (settlement.type === "i_owe") {
              acc.payables += settlement.amount
            } else {
              acc.receivables += settlement.amount
            }
            acc.count += 1
            return acc
          },
          { payables: 0, receivables: 0, count: 0 }
        )

        return {
          scope,
          range,
          totals: {
            ...totals,
            allocated: Number(totals.allocated.toFixed(2)),
            spent: Number(totals.spent.toFixed(2)),
            remaining: Number((totals.allocated - totals.spent).toFixed(2)),
            usagePercent: totals.allocated > 0 ? Number(((totals.spent / totals.allocated) * 100).toFixed(2)) : 0,
          },
          pending: {
            payables: Number(pending.payables.toFixed(2)),
            receivables: Number(pending.receivables.toFixed(2)),
            net: Number((pending.receivables - pending.payables).toFixed(2)),
            count: pending.count,
          },
          budgets: budgetSummaries,
        }
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error generating budget summary:", error)
    return NextResponse.json(
      { error: "Failed to generate budget summary" },
      { status: 500 }
    )
  }
}
