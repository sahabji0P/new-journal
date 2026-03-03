import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import type { Prisma } from "@prisma/client"

type BudgetMethod = "envelope" | "fixed_cap" | "goal_linked"
type BudgetPeriodType = "monthly" | "custom" | "rolling"
type BudgetEnforcementMode = "soft" | "hard"
type BudgetPresetKey = "fifty_thirty_twenty" | "zero_based_starter" | "essentials_focus"

type BudgetSubInput = {
  categoryId?: string
  category?: string
  allocated: number
  alertThreshold?: number
}

const DEFAULT_WARNING_THRESHOLD = 80
const DEFAULT_CRITICAL_THRESHOLD = 100
const DEFAULT_ALERT_WINDOW_DAYS = 5

const PRESET_DEFINITIONS: Record<
  BudgetPresetKey,
  {
    label: string
    split: Record<"needs" | "wants" | "savings", number>
  }
> = {
  fifty_thirty_twenty: {
    label: "50/30/20",
    split: { needs: 0.5, wants: 0.3, savings: 0.2 },
  },
  zero_based_starter: {
    label: "Zero-Based Starter",
    split: { needs: 0.6, wants: 0.25, savings: 0.15 },
  },
  essentials_focus: {
    label: "Essentials Focus",
    split: { needs: 0.7, wants: 0.2, savings: 0.1 },
  },
}

const NEEDS_KEYWORDS = ["rent", "grocer", "utility", "transport", "fuel", "insurance", "loan", "bill", "medical", "education"]
const WANTS_KEYWORDS = ["entertain", "shopping", "travel", "dining", "movie", "fun", "subscription", "coffee"]
const SAVINGS_KEYWORDS = ["saving", "invest", "emergency", "debt", "sip", "retire"]

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeThreshold(value: unknown, fallback: number): number {
  const numeric = toNumber(value, fallback)
  return Math.min(200, Math.max(1, numeric))
}

function isPresetKey(value: unknown): value is BudgetPresetKey {
  return typeof value === "string" && value in PRESET_DEFINITIONS
}

function inferBucket(name: string): "needs" | "wants" | "savings" {
  const lowered = name.toLowerCase()
  if (SAVINGS_KEYWORDS.some(keyword => lowered.includes(keyword))) return "savings"
  if (WANTS_KEYWORDS.some(keyword => lowered.includes(keyword))) return "wants"
  if (NEEDS_KEYWORDS.some(keyword => lowered.includes(keyword))) return "needs"
  return "needs"
}

async function getExpenseCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId, type: { in: ["expense", "both"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}

function normalizeDateInput(value: unknown): Date | null {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeBudgetMethod(value: unknown, fallback: BudgetMethod = "envelope"): BudgetMethod {
  if (value === "envelope" || value === "fixed_cap" || value === "goal_linked") return value
  return fallback
}

function normalizeBudgetPeriodType(value: unknown, fallback: BudgetPeriodType = "monthly"): BudgetPeriodType {
  if (value === "monthly" || value === "custom" || value === "rolling") return value
  return fallback
}

function normalizeEnforcementMode(value: unknown, fallback: BudgetEnforcementMode = "soft"): BudgetEnforcementMode {
  if (value === "soft" || value === "hard") return value
  return fallback
}

async function buildPresetSubBudgets(userId: string, totalAllocated: number, presetKey: BudgetPresetKey): Promise<BudgetSubInput[]> {
  const categories = await getExpenseCategories(userId)
  if (categories.length === 0) return []

  const grouped = {
    needs: categories.filter(category => inferBucket(category.name) === "needs"),
    wants: categories.filter(category => inferBucket(category.name) === "wants"),
    savings: categories.filter(category => inferBucket(category.name) === "savings"),
  }

  const fallbackCategory = categories[0]
  const split = PRESET_DEFINITIONS[presetKey].split
  const result: BudgetSubInput[] = []

  ;(["needs", "wants", "savings"] as const).forEach(bucket => {
    const pool = grouped[bucket]
    const budgetForBucket = totalAllocated * split[bucket]
    if (budgetForBucket <= 0) return

    const targets = pool.length > 0 ? pool : [fallbackCategory]
    const perCategory = budgetForBucket / targets.length

    targets.forEach(category => {
      result.push({
        categoryId: category.id,
        category: category.name,
        allocated: Number(perCategory.toFixed(2)),
        alertThreshold: DEFAULT_WARNING_THRESHOLD,
      })
    })
  })

  return result
}

async function normalizeSubBudgets(userId: string, rawSubBudgets: unknown): Promise<BudgetSubInput[]> {
  if (!Array.isArray(rawSubBudgets)) return []

  const categories = await getExpenseCategories(userId)
  const categoryById = new Map(categories.map(category => [category.id, category.name]))
  const categoryIdByName = new Map(categories.map(category => [category.name.toLowerCase(), category.id]))

  const normalized: BudgetSubInput[] = []

  for (const item of rawSubBudgets) {
    if (!item || typeof item !== "object") continue

    const candidate = item as {
      categoryId?: unknown
      category?: unknown
      allocated?: unknown
      alertThreshold?: unknown
    }

    const allocated = toNumber(candidate.allocated, NaN)
    if (!Number.isFinite(allocated) || allocated <= 0) continue

    const rawCategoryId = typeof candidate.categoryId === "string" ? candidate.categoryId : undefined
    const rawCategoryName = typeof candidate.category === "string" ? candidate.category.trim() : ""

    const categoryId = rawCategoryId || (rawCategoryName ? categoryIdByName.get(rawCategoryName.toLowerCase()) : undefined)
    const categoryName = (categoryId ? categoryById.get(categoryId) : undefined) || rawCategoryName

    if (!categoryName) continue

    normalized.push({
      categoryId,
      category: categoryName,
      allocated,
      alertThreshold: normalizeThreshold(candidate.alertThreshold, DEFAULT_WARNING_THRESHOLD),
    })
  }

  return normalized
}

function getBudgetTotalAllocated(inputTotal: unknown, subBudgets: BudgetSubInput[]): number {
  const explicit = toNumber(inputTotal, NaN)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return Number(subBudgets.reduce((sum, subBudget) => sum + subBudget.allocated, 0).toFixed(2))
}

function toSubBudgetCreateInput(subBudgets: BudgetSubInput[]): Prisma.SubBudgetCreateWithoutBudgetInput[] {
  return subBudgets.map(subBudget => ({
    categoryId: subBudget.categoryId,
    category: subBudget.category || "Uncategorized",
    allocated: subBudget.allocated,
    alertThreshold: normalizeThreshold(subBudget.alertThreshold, DEFAULT_WARNING_THRESHOLD),
  }))
}

async function prepareSubBudgets(
  userId: string,
  {
    subBudgets,
    totalAllocated,
    presetKey,
  }: {
    subBudgets: unknown
    totalAllocated: number
    presetKey?: BudgetPresetKey
  }
) {
  const normalized = await normalizeSubBudgets(userId, subBudgets)
  if (normalized.length > 0) return normalized
  if (!presetKey) return []
  return buildPresetSubBudgets(userId, totalAllocated, presetKey)
}

// GET /api/budgets - Get all budgets for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const budgets = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.budgets,
      revalidateSeconds: 20,
      loader: async () => prisma.budget.findMany({
        where: { userId: user.id },
        include: {
          subBudgets: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }
}

// POST /api/budgets - Create a new budget
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const type = typeof body.type === "string" ? body.type : ""
    const presetKey = isPresetKey(body.presetKey) ? body.presetKey : undefined
    const method = normalizeBudgetMethod(body.method)
    const periodType = normalizeBudgetPeriodType(body.periodType, type === "event" || type === "trip" ? "custom" : "monthly")
    const warningThreshold = normalizeThreshold(body.warningThreshold, DEFAULT_WARNING_THRESHOLD)
    const criticalThreshold = normalizeThreshold(body.criticalThreshold, DEFAULT_CRITICAL_THRESHOLD)
    const alertWindowDays = Math.max(1, Math.min(30, Math.round(toNumber(body.alertWindowDays, DEFAULT_ALERT_WINDOW_DAYS))))
    const enforcementMode = normalizeEnforcementMode(body.enforcementMode)
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      )
    }

    const provisionalTotal = getBudgetTotalAllocated(body.totalAllocated, [])
    const preparedSubBudgets = await prepareSubBudgets(user.id, {
      subBudgets: body.subBudgets,
      totalAllocated: provisionalTotal,
      presetKey,
    })
    const totalAllocated = getBudgetTotalAllocated(body.totalAllocated, preparedSubBudgets)

    const budget = await prisma.$transaction(async (tx) => {
      if (type === "monthly" && isActive) {
        await tx.budget.updateMany({
          where: {
            userId: user.id,
            type: "monthly",
            isActive: true,
          },
          data: { isActive: false },
        })
      }

      return tx.budget.create({
        data: {
          userId: user.id,
          name,
          type,
          method,
          periodType,
          totalAllocated,
          startDate: normalizeDateInput(body.startDate),
          endDate: normalizeDateInput(body.endDate),
          rollover: Boolean(body.rollover),
          warningThreshold,
          criticalThreshold,
          alertWindowDays,
          enforcementMode,
          presetKey,
          goalId: typeof body.goalId === "string" && body.goalId.trim() ? body.goalId : null,
          isActive,
          subBudgets: {
            create: toSubBudgetCreateInput(preparedSubBudgets),
          },
        },
        include: {
          subBudgets: true,
        },
      })
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }
}

// PUT /api/budgets - Update an existing budget
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const id = typeof body.id === "string" ? body.id : ""
    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      )
    }

    const existingBudget = await prisma.budget.findUnique({
      where: { id },
      include: { subBudgets: true },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      )
    }

    if (existingBudget.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const hasSubBudgetsPayload = body.subBudgets !== undefined
    const presetKey = isPresetKey(body.presetKey) ? body.presetKey : undefined

    const preparedSubBudgets = hasSubBudgetsPayload || presetKey
      ? await prepareSubBudgets(user.id, {
          subBudgets: body.subBudgets,
          totalAllocated: getBudgetTotalAllocated(body.totalAllocated, existingBudget.subBudgets as BudgetSubInput[]),
          presetKey,
        })
      : []

    const targetTotal = hasSubBudgetsPayload || presetKey
      ? getBudgetTotalAllocated(body.totalAllocated, preparedSubBudgets)
      : toNumber(body.totalAllocated, existingBudget.totalAllocated)

    const targetType = body.type !== undefined ? String(body.type) : existingBudget.type
    const targetIsActive = body.isActive !== undefined ? Boolean(body.isActive) : existingBudget.isActive
    const budget = await prisma.$transaction(async (tx) => {
      if (targetType === "monthly" && targetIsActive) {
        await tx.budget.updateMany({
          where: {
            userId: user.id,
            type: "monthly",
            isActive: true,
            id: { not: id },
          },
          data: { isActive: false },
        })
      }

      return tx.budget.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name) : existingBudget.name,
          type: targetType,
          method: normalizeBudgetMethod(body.method, existingBudget.method as BudgetMethod),
          periodType: normalizeBudgetPeriodType(body.periodType, existingBudget.periodType as BudgetPeriodType),
          totalAllocated: Number.isFinite(targetTotal) && targetTotal >= 0 ? targetTotal : existingBudget.totalAllocated,
          startDate: body.startDate !== undefined ? normalizeDateInput(body.startDate) : existingBudget.startDate,
          endDate: body.endDate !== undefined ? normalizeDateInput(body.endDate) : existingBudget.endDate,
          rollover: body.rollover !== undefined ? Boolean(body.rollover) : existingBudget.rollover,
          isActive: targetIsActive,
          warningThreshold: body.warningThreshold !== undefined
            ? normalizeThreshold(body.warningThreshold, existingBudget.warningThreshold)
            : existingBudget.warningThreshold,
          criticalThreshold: body.criticalThreshold !== undefined
            ? normalizeThreshold(body.criticalThreshold, existingBudget.criticalThreshold)
            : existingBudget.criticalThreshold,
          alertWindowDays: body.alertWindowDays !== undefined
            ? Math.max(1, Math.min(30, Math.round(toNumber(body.alertWindowDays, existingBudget.alertWindowDays))))
            : existingBudget.alertWindowDays,
          enforcementMode: body.enforcementMode !== undefined
            ? normalizeEnforcementMode(body.enforcementMode, existingBudget.enforcementMode as BudgetEnforcementMode)
            : existingBudget.enforcementMode,
          presetKey: body.presetKey !== undefined ? (presetKey || null) : existingBudget.presetKey,
          goalId: body.goalId !== undefined
            ? (typeof body.goalId === "string" && body.goalId.trim() ? body.goalId : null)
            : existingBudget.goalId,
          subBudgets: hasSubBudgetsPayload || presetKey
            ? {
                deleteMany: {},
                create: toSubBudgetCreateInput(preparedSubBudgets),
              }
            : undefined,
        },
        include: {
          subBudgets: true,
        },
      })
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets - Delete a budget
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const id = typeof body.id === "string" ? body.id : ""

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      )
    }

    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      )
    }

    if (existingBudget.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    await prisma.budget.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
