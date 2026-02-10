import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, stableSearchParamsKey, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { Prisma } from "@prisma/client"

function normalizeTransactionAmount(amount: number, type: string): number {
  const absAmount = Math.abs(amount)
  return type === "expense" ? -absAmount : absAmount
}

function parseAmount(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseDateInput(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeTagsInput(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((value): value is string => typeof value === "string")
    .map(value => value.trim())
    .filter(Boolean)
}

function normalizeSplitsInput(input: unknown): Prisma.JsonArray | null {
  if (!Array.isArray(input)) return null

  const normalized: Prisma.JsonArray = []

  for (const item of input) {
    if (typeof item !== "object" || item === null) continue
    const candidate = item as Record<string, unknown>

    const id = typeof candidate.id === "string" ? candidate.id : `split-${Date.now()}`
    const personName = typeof candidate.personName === "string" ? candidate.personName.trim() : ""
    const amount = Number(candidate.amount)

    if (!Number.isFinite(amount) || amount < 0) {
      continue
    }

    normalized.push({
      id,
      personName,
      amount,
      isPaid: Boolean(candidate.isPaid),
      ...(typeof candidate.paidDate === "string" ? { paidDate: candidate.paidDate } : {}),
    } as Prisma.JsonObject)
  }

  if (normalized.length === 0) return null

  return normalized
}

function normalizeTotalAmountInput(input: unknown): number | null {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function ensureRecurringTag(tags: string[]): string[] {
  if (tags.some(tag => tag.toLowerCase() === "recurring")) return tags
  return [...tags, "recurring"]
}

type TxClient = Prisma.TransactionClient

const INTERACTIVE_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const

function isMissingColumnError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2022"
  )
}

function startOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date: Date): Date {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function isBudgetApplicableForDate(
  budget: {
    type: string
    periodType: string
    startDate: Date | null
    endDate: Date | null
    isActive: boolean
  },
  transactionDate: Date
): boolean {
  if (!budget.isActive) return false

  const txDate = startOfDay(transactionDate)
  const budgetStart = budget.startDate ? startOfDay(new Date(budget.startDate)) : null
  const budgetEnd = budget.endDate ? endOfDay(new Date(budget.endDate)) : null

  if (budget.periodType === "custom" || budget.type === "event" || budget.type === "trip") {
    if (budgetStart && txDate < budgetStart) return false
    if (budgetEnd && txDate > budgetEnd) return false
    return true
  }

  if (budget.periodType === "rolling") {
    const end = endOfDay(new Date())
    const start = startOfDay(new Date(end.getTime() - (29 * 24 * 60 * 60 * 1000)))
    return txDate >= start && txDate <= end
  }

  if (budgetStart && txDate < budgetStart) return false
  if (budgetEnd && txDate > budgetEnd) return false
  return true
}

async function buildCategoryNameLookup(userId: string, categoryValues: string[]): Promise<Map<string, string>> {
  const uniqueValues = [...new Set(categoryValues.map(value => value.trim()).filter(Boolean))]
  const categoryNameByValue = new Map<string, string>()

  if (uniqueValues.length === 0) return categoryNameByValue

  const categories = await prisma.category.findMany({
    where: {
      userId,
      OR: [
        { id: { in: uniqueValues } },
        { name: { in: uniqueValues } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  })

  categories.forEach(category => {
    categoryNameByValue.set(category.id, category.name)
    categoryNameByValue.set(category.name, category.name)
  })

  uniqueValues.forEach(value => {
    if (!categoryNameByValue.has(value)) {
      categoryNameByValue.set(value, value)
    }
  })

  return categoryNameByValue
}

async function applyExpenseDeltaToBudgets(
  tx: TxClient,
  userId: string,
  {
    categoryValue,
    transactionDate,
    deltaAbs,
    categoryNameById,
  }: {
    categoryValue: string
    transactionDate: Date
    deltaAbs: number
    categoryNameById: Map<string, string>
  }
) {
  if (!deltaAbs || !categoryValue) return

  try {
    const transactionCategoryName = categoryNameById.get(categoryValue) || categoryValue
    const subBudgetMatchConditions: Prisma.SubBudgetWhereInput[] = [
      { categoryId: categoryValue },
      { category: categoryValue },
    ]
    if (transactionCategoryName !== categoryValue) {
      subBudgetMatchConditions.push({ category: transactionCategoryName })
    }

    const budgets = await tx.budget.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          {
            subBudgets: {
              none: {},
            },
          },
          {
            subBudgets: {
              some: {
                OR: subBudgetMatchConditions,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        type: true,
        periodType: true,
        startDate: true,
        endDate: true,
        isActive: true,
        totalSpent: true,
        subBudgets: {
          where: {
            OR: subBudgetMatchConditions,
          },
          select: {
            id: true,
            spent: true,
          },
        },
      },
    })

    for (const budget of budgets) {
      if (!isBudgetApplicableForDate(budget, transactionDate)) continue

      let budgetDelta = budget.subBudgets.length === 0 ? deltaAbs : 0
      const subBudgetUpdates: Promise<unknown>[] = []

      for (const subBudget of budget.subBudgets) {
        const nextSubSpent = Math.max(0, subBudget.spent + deltaAbs)
        const effectiveSubDelta = nextSubSpent - subBudget.spent
        if (effectiveSubDelta === 0) continue

        subBudgetUpdates.push(
          tx.subBudget.update({
            where: { id: subBudget.id },
            data: { spent: nextSubSpent },
          })
        )
        budgetDelta += effectiveSubDelta
      }

      if (subBudgetUpdates.length > 0) {
        await Promise.all(subBudgetUpdates)
      }

      if (budgetDelta === 0) continue

      const nextBudgetSpent = Math.max(0, budget.totalSpent + budgetDelta)
      await tx.budget.update({
        where: { id: budget.id },
        data: { totalSpent: nextBudgetSpent },
      })
    }
  } catch (error) {
    if (isMissingColumnError(error)) {
      console.warn("Budget schema is out of date. Skipping budget spend sync until DB migration is applied.")
      return
    }
    throw error
  }
}

// GET /api/transactions - Get all transactions for the user with optional filters
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const accountId = searchParams.get('accountId')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : null
    const parsedOffset = offsetParam ? Number.parseInt(offsetParam, 10) : 0
    const limit = parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 500) : null
    const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0
    const parsedStartDate = startDate ? parseDateInput(startDate) : null
    const parsedEndDate = endDate ? parseDateInput(endDate) : null

    if (startDate && !parsedStartDate) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 })
    }

    if (endDate && !parsedEndDate) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
    }

    const where: {
      userId: string
      accountId?: string
      category?: string
      type?: string
      date?: { gte?: Date; lte?: Date }
    } = { userId: user.id }

    if (accountId) where.accountId = accountId
    if (category) where.category = category
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (parsedStartDate) where.date.gte = parsedStartDate
      if (parsedEndDate) where.date.lte = parsedEndDate
    }

    const payload = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.transactions,
      keyParts: [stableSearchParamsKey(searchParams)],
      revalidateSeconds: 10,
      loader: async () => {
        const transactions = await prisma.transaction.findMany({
          where,
          include: {
            account: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          ...(limit && limit > 0 ? { take: limit + 1, skip: offset } : {}),
        })

        const formatted = transactions.map(transaction => {
          const { account, ...rest } = transaction
          return {
            ...rest,
            accountName: account.name,
          }
        })

        if (limit && limit > 0) {
          const hasMore = formatted.length > limit
          const items = hasMore ? formatted.slice(0, limit) : formatted
          const nextOffset = hasMore ? offset + limit : null

          return {
            items,
            hasMore,
            nextOffset,
          }
        }

        return formatted
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      description,
      amount,
      date,
      category,
      type,
      accountId,
      party,
      notes,
      tags,
      recurringId,
      isShared,
      splits,
      totalAmount,
    } = body

    if (!description || amount === undefined || !date || !category || !type || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      )
    }

    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null || parsedAmount === 0) {
      return NextResponse.json(
        { error: "Amount must be a valid non-zero number" },
        { status: 400 }
      )
    }

    const parsedDate = parseDateInput(date)
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid transaction date" },
        { status: 400 }
      )
    }

    const shouldSyncBudgets = type === "expense"
    const [account, categoryNameById] = await Promise.all([
      prisma.financialAccount.findFirst({
        where: { id: accountId, userId: user.id },
      }),
      shouldSyncBudgets
        ? buildCategoryNameLookup(user.id, [category])
        : Promise.resolve(new Map<string, string>()),
    ])

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    const normalizedAmount = normalizeTransactionAmount(parsedAmount, type)
    const normalizedTags = normalizeTagsInput(tags)
    const finalTags = recurringId ? ensureRecurringTag(normalizedTags) : normalizedTags
    const normalizedSplits = normalizeSplitsInput(splits)
    const normalizedTotalAmount = normalizeTotalAmountInput(totalAmount)
    const finalIsShared = typeof isShared === "boolean"
      ? isShared
      : Boolean(normalizedSplits)

    const transaction = await prisma.$transaction(async tx => {
      const created = await tx.transaction.create({
        data: {
          userId: user.id,
          description,
          amount: normalizedAmount,
          date: parsedDate,
          category,
          type,
          accountId,
          party,
          notes,
          tags: finalTags,
          recurringId,
          isShared: finalIsShared,
          ...(normalizedSplits ? { splits: normalizedSplits } : {}),
          totalAmount: normalizedTotalAmount,
        },
      })

      await tx.financialAccount.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: normalizedAmount,
          },
        },
      })

      if (party && party.trim()) {
        await tx.party.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: party.trim(),
            },
          },
          create: {
            userId: user.id,
            name: party.trim(),
          },
          update: {},
        })
      }

      if (type === "expense") {
        await applyExpenseDeltaToBudgets(tx, user.id, {
          categoryValue: category,
          transactionDate: parsedDate,
          deltaAbs: Math.abs(normalizedAmount),
          categoryNameById,
        })
      }

      return created
    }, INTERACTIVE_TX_OPTIONS)

    invalidateUserCache(user.id)

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}

// PUT /api/transactions - Update a transaction
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const nextType = updateData.type ?? existingTransaction.type
    if (nextType !== 'income' && nextType !== 'expense') {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      )
    }

    let nextAmount = existingTransaction.amount
    if (updateData.amount !== undefined) {
      const parsedAmount = parseAmount(updateData.amount)
      if (parsedAmount === null || parsedAmount === 0) {
        return NextResponse.json(
          { error: "Amount must be a valid non-zero number" },
          { status: 400 }
        )
      }
      nextAmount = normalizeTransactionAmount(parsedAmount, nextType)
    } else if (nextType !== existingTransaction.type) {
      nextAmount = normalizeTransactionAmount(existingTransaction.amount, nextType)
    }

    const nextCategoryValue =
      typeof updateData.category === "string" && updateData.category.trim()
        ? updateData.category
        : existingTransaction.category
    const nextDate =
      updateData.date !== undefined
        ? parseDateInput(updateData.date)
        : new Date(existingTransaction.date)

    if (!nextDate) {
      return NextResponse.json(
        { error: "Invalid transaction date" },
        { status: 400 }
      )
    }

    const nextAccountId = updateData.accountId ?? existingTransaction.accountId
    const nextRecurringId =
      updateData.recurringId !== undefined ? updateData.recurringId : existingTransaction.recurringId
    const incomingTags =
      updateData.tags !== undefined ? normalizeTagsInput(updateData.tags) : (existingTransaction.tags || [])
    const finalTagsForUpdate = nextRecurringId ? ensureRecurringTag(incomingTags) : incomingTags
    const shouldPersistTags = updateData.tags !== undefined || updateData.recurringId !== undefined
    const shouldSyncBudgets = existingTransaction.type === "expense" || nextType === "expense"
    const incomingSplits = updateData.splits !== undefined
      ? normalizeSplitsInput(updateData.splits)
      : undefined
    const incomingTotalAmount = updateData.totalAmount !== undefined
      ? normalizeTotalAmountInput(updateData.totalAmount)
      : undefined
    const incomingIsShared = updateData.isShared !== undefined
      ? Boolean(updateData.isShared)
      : undefined

    if (nextAccountId !== existingTransaction.accountId) {
      const nextAccount = await prisma.financialAccount.findFirst({
        where: { id: nextAccountId, userId: user.id },
      })

      if (!nextAccount) {
        return NextResponse.json(
          { error: "New account not found" },
          { status: 404 }
        )
      }
    }

    const categoryNameById = shouldSyncBudgets
      ? await buildCategoryNameLookup(user.id, [existingTransaction.category, nextCategoryValue])
      : new Map<string, string>()

    const updatedTransaction = await prisma.$transaction(async tx => {
      await tx.financialAccount.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            decrement: existingTransaction.amount,
          },
        },
      })

      await tx.financialAccount.update({
        where: { id: nextAccountId },
        data: {
          balance: {
            increment: nextAmount,
          },
        },
      })

      const dataToUpdate: {
        description?: string
        amount?: number
        date?: Date
        category?: string
        type?: string
        accountId?: string
        party?: string | null
        notes?: string | null
        tags?: string[]
        recurringId?: string | null
        isShared?: boolean
        splits?: Prisma.JsonArray | Prisma.NullTypes.DbNull
        totalAmount?: number | null
      } = {}

      if (updateData.description !== undefined) dataToUpdate.description = updateData.description
      dataToUpdate.amount = nextAmount
      if (updateData.date !== undefined) dataToUpdate.date = nextDate
      if (updateData.category !== undefined) dataToUpdate.category = updateData.category
      dataToUpdate.type = nextType
      dataToUpdate.accountId = nextAccountId
      if (updateData.party !== undefined) dataToUpdate.party = updateData.party
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes
      if (shouldPersistTags) dataToUpdate.tags = finalTagsForUpdate
      if (updateData.recurringId !== undefined) dataToUpdate.recurringId = updateData.recurringId
      if (incomingSplits !== undefined) {
        dataToUpdate.splits = incomingSplits === null ? Prisma.DbNull : incomingSplits
      }
      if (incomingTotalAmount !== undefined) dataToUpdate.totalAmount = incomingTotalAmount
      if (incomingIsShared !== undefined) dataToUpdate.isShared = incomingIsShared

      const updated = await tx.transaction.update({
        where: { id },
        data: dataToUpdate,
      })

      const partyValue = updateData.party
      if (typeof partyValue === "string" && partyValue.trim()) {
        await tx.party.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: partyValue.trim(),
            },
          },
          create: {
            userId: user.id,
            name: partyValue.trim(),
          },
          update: {},
        })
      }

      if (existingTransaction.type === "expense") {
        await applyExpenseDeltaToBudgets(tx, user.id, {
          categoryValue: existingTransaction.category,
          transactionDate: new Date(existingTransaction.date),
          deltaAbs: -Math.abs(existingTransaction.amount),
          categoryNameById,
        })
      }

      if (nextType === "expense") {
        await applyExpenseDeltaToBudgets(tx, user.id, {
          categoryValue: nextCategoryValue,
          transactionDate: nextDate,
          deltaAbs: Math.abs(nextAmount),
          categoryNameById,
        })
      }

      return updated
    }, INTERACTIVE_TX_OPTIONS)

    invalidateUserCache(user.id)

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions - Delete a transaction
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const categoryNameById = transaction.type === "expense"
      ? await buildCategoryNameLookup(user.id, [transaction.category])
      : new Map<string, string>()

    await prisma.$transaction(async tx => {
      await tx.financialAccount.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount,
          },
        },
      })

      await tx.transaction.delete({
        where: { id },
      })

      if (transaction.type === "expense") {
        await applyExpenseDeltaToBudgets(tx, user.id, {
          categoryValue: transaction.category,
          transactionDate: new Date(transaction.date),
          deltaAbs: -Math.abs(transaction.amount),
          categoryNameById,
        })
      }
    }, INTERACTIVE_TX_OPTIONS)

    invalidateUserCache(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
