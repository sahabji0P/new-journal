import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import type { Prisma } from "@prisma/client"

type WatchlistTx = Prisma.TransactionClient

function normalizeBudgetLimit(input: unknown): number | null {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Number(parsed.toFixed(2))
}

function normalizeWatchlistValue(input: unknown): string {
  return typeof input === "string" ? input.trim() : ""
}

async function resolveWatchlistCategory(
  tx: WatchlistTx,
  userId: string,
  value: string
): Promise<{ categoryId: string | null; categoryName: string } | null> {
  const normalizedValue = value.trim()
  if (!normalizedValue) return null

  const category = await tx.category.findFirst({
    where: {
      userId,
      OR: [
        { id: normalizedValue },
        { name: { equals: normalizedValue, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!category) {
    return {
      categoryId: null,
      categoryName: normalizedValue,
    }
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
  }
}

async function ensureWatchlistBudgetLink(
  tx: WatchlistTx,
  {
    userId,
    value,
    budgetLimit,
  }: {
    userId: string
    value: string
    budgetLimit: number
  }
) {
  if (!value.trim() || budgetLimit <= 0) return

  const categoryInfo = await resolveWatchlistCategory(tx, userId, value)
  if (!categoryInfo) return

  const { categoryId, categoryName } = categoryInfo
  const normalizedCategoryName = categoryName.trim().toLowerCase()

  const monthlyBudget = await tx.budget.findFirst({
    where: {
      userId,
      type: "monthly",
      isActive: true,
    },
    include: {
      subBudgets: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  if (!monthlyBudget) {
    await tx.budget.create({
      data: {
        userId,
        name: "Monthly Budget",
        type: "monthly",
        periodType: "monthly",
        totalAllocated: budgetLimit,
        isActive: true,
        subBudgets: {
          create: [
            {
              categoryId,
              category: categoryName,
              allocated: budgetLimit,
              alertThreshold: 80,
            },
          ],
        },
      },
    })
    return
  }

  const existingSubBudget = monthlyBudget.subBudgets.find(subBudget =>
    (categoryId && subBudget.categoryId === categoryId) ||
    subBudget.category.toLowerCase() === normalizedCategoryName
  )

  const currentSubBudgetTotal = monthlyBudget.subBudgets.reduce((sum, subBudget) => sum + subBudget.allocated, 0)

  if (existingSubBudget) {
    const desiredAllocation = Math.max(existingSubBudget.allocated, budgetLimit)
    const nextSubBudgetTotal = currentSubBudgetTotal - existingSubBudget.allocated + desiredAllocation
    const nextTotalAllocated = Math.max(monthlyBudget.totalAllocated, nextSubBudgetTotal)

    await tx.subBudget.update({
      where: { id: existingSubBudget.id },
      data: {
        allocated: desiredAllocation,
        ...(categoryId && !existingSubBudget.categoryId ? { categoryId } : {}),
        category: categoryName,
      },
    })

    if (nextTotalAllocated !== monthlyBudget.totalAllocated) {
      await tx.budget.update({
        where: { id: monthlyBudget.id },
        data: {
          totalAllocated: nextTotalAllocated,
        },
      })
    }

    return
  }

  const nextSubBudgetTotal = currentSubBudgetTotal + budgetLimit
  const nextTotalAllocated = Math.max(monthlyBudget.totalAllocated, nextSubBudgetTotal)

  await tx.subBudget.create({
    data: {
      budgetId: monthlyBudget.id,
      categoryId,
      category: categoryName,
      allocated: budgetLimit,
      alertThreshold: 80,
    },
  })

  if (nextTotalAllocated !== monthlyBudget.totalAllocated) {
    await tx.budget.update({
      where: { id: monthlyBudget.id },
      data: {
        totalAllocated: nextTotalAllocated,
      },
    })
  }
}

// GET /api/watchlists - Get all watchlists for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const watchlists = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.watchlists,
      revalidateSeconds: 20,
      loader: async () => prisma.watchlist.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(watchlists)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching watchlists:", error)
    return NextResponse.json(
      { error: "Failed to fetch watchlists" },
      { status: 500 }
    )
  }
}

// POST /api/watchlists - Create a new watchlist
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      name,
      type,
      value,
      budgetLimit,
      period,
      startDate,
      endDate,
      alertEnabled,
      alertThreshold,
      color,
    } = body

    if (!name || !type || !value) {
      return NextResponse.json(
        { error: "Name, type, and value are required" },
        { status: 400 }
      )
    }

    const normalizedValue = normalizeWatchlistValue(value)
    const normalizedBudgetLimit = normalizeBudgetLimit(budgetLimit)
    const watchlist = await prisma.$transaction(async tx => {
      const createdWatchlist = await tx.watchlist.create({
        data: {
          userId: user.id,
          name,
          type,
          value: normalizedValue,
          budgetLimit: normalizedBudgetLimit,
          period: period || "monthly",
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          alertEnabled: alertEnabled ?? true,
          alertThreshold: alertThreshold || 80,
          color,
        },
      })

      if (type === "category" && normalizedBudgetLimit && normalizedValue) {
        await ensureWatchlistBudgetLink(tx, {
          userId: user.id,
          value: normalizedValue,
          budgetLimit: normalizedBudgetLimit,
        })
      }

      return createdWatchlist
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.watchlists,
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.syncAdvanced,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json(watchlist, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating watchlist:", error)
    return NextResponse.json(
      { error: "Failed to create watchlist" },
      { status: 500 }
    )
  }
}

// PUT /api/watchlists - Update a watchlist
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      id,
      name,
      type,
      value,
      budgetLimit,
      period,
      startDate,
      endDate,
      alertEnabled,
      alertThreshold,
      color,
      isActive,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Watchlist ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.watchlist.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      )
    }

    const resolvedType = type !== undefined ? String(type) : existing.type
    const resolvedValue = normalizeWatchlistValue(value !== undefined ? value : existing.value)
    const resolvedBudgetLimit =
      budgetLimit !== undefined
        ? normalizeBudgetLimit(budgetLimit)
        : normalizeBudgetLimit(existing.budgetLimit)

    const watchlist = await prisma.$transaction(async tx => {
      const updatedWatchlist = await tx.watchlist.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(type !== undefined && { type: resolvedType }),
          ...(value !== undefined && { value: resolvedValue }),
          ...(budgetLimit !== undefined && { budgetLimit: resolvedBudgetLimit }),
          ...(period !== undefined && { period }),
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(alertEnabled !== undefined && { alertEnabled }),
          ...(alertThreshold !== undefined && { alertThreshold }),
          ...(color !== undefined && { color }),
          ...(isActive !== undefined && { isActive }),
        },
      })

      if (resolvedType === "category" && resolvedBudgetLimit && resolvedValue) {
        await ensureWatchlistBudgetLink(tx, {
          userId: user.id,
          value: resolvedValue,
          budgetLimit: resolvedBudgetLimit,
        })
      }

      return updatedWatchlist
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.watchlists,
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.syncAdvanced,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json(watchlist)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating watchlist:", error)
    return NextResponse.json(
      { error: "Failed to update watchlist" },
      { status: 500 }
    )
  }
}

// DELETE /api/watchlists - Delete a watchlist
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Watchlist ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.watchlist.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      )
    }

    await prisma.watchlist.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.watchlists,
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.syncAdvanced,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting watchlist:", error)
    return NextResponse.json(
      { error: "Failed to delete watchlist" },
      { status: 500 }
    )
  }
}
