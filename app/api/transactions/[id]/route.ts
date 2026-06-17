import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

/**
 * Scopes to invalidate for simple transaction operations in [id] routes.
 * Smaller set than the main route since these don't touch budgets/parties.
 */
const TRANSACTION_ID_INVALIDATION_SCOPES = [
  USER_CACHE_SCOPES.transactions,
  USER_CACHE_SCOPES.accounts,
  USER_CACHE_SCOPES.budgetSummary,
  USER_CACHE_SCOPES.syncCore,
  USER_CACHE_SCOPES.syncAdvanced,
  USER_CACHE_SCOPES.chatContext,
] as const

// GET /api/transactions/[id] - Get a specific transaction
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const transaction = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.transactions,
      keyParts: [`id=${id}`],
      revalidateSeconds: 60,
      loader: async () => prisma.transaction.findFirst({
        where: { id, userId: user.id },
        include: {
          account: {
            select: {
              name: true,
            },
          },
        },
      }),
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    )
  }
}

// PATCH /api/transactions/[id] - Update a transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      select: { id: true, amount: true, type: true, accountId: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Calculate balance adjustment
    const oldAmount = transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount
    const newAmount = (body.type || transaction.type) === 'income'
      ? (body.amount || transaction.amount)
      : -(body.amount || transaction.amount)

    const balanceChange = newAmount - (-oldAmount)

    // Update transaction and account balance atomically
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.transaction.update({
        where: { id },
        data: {
          ...body,
          date: body.date ? new Date(body.date) : undefined,
        },
      })

      if (body.amount !== undefined || body.type !== undefined) {
        await tx.financialAccount.update({
          where: { id: transaction.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        })
      }

      return result
    })

    invalidateUserCache(user.id, TRANSACTION_ID_INVALIDATION_SCOPES)

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      select: { id: true, amount: true, type: true, accountId: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Reverse the balance change
    const balanceChange = transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount

    // Delete transaction and reverse balance atomically
    await prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      })
      await tx.transaction.delete({ where: { id } })
    })

    invalidateUserCache(user.id, TRANSACTION_ID_INVALIDATION_SCOPES)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
