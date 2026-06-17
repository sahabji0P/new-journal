import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import {
  invalidateUserCache,
  USER_CACHE_SCOPES,
} from "@/lib/server-cache"
import { parseGroupTransactionData } from "@/lib/settlements/group-ledger"

// POST /api/settlements/groups/[groupId]/record-personal
// Record a group expense share as a personal transaction
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params
    const body = await req.json().catch(() => ({}))

    const transactionId =
      typeof body.transactionId === "string" ? body.transactionId : ""
    const accountId =
      typeof body.accountId === "string" ? body.accountId : ""
    const category =
      typeof body.category === "string" ? body.category.trim() : ""

    if (!transactionId || !accountId) {
      return NextResponse.json(
        { error: "transactionId and accountId are required" },
        { status: 400 }
      )
    }

    // Verify membership
    const membership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: user.id },
      select: { id: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
      select: { id: true, name: true },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Find the group transaction
    const groupTransaction =
      await prisma.settlementGroupTransaction.findFirst({
        where: { id: transactionId, groupId },
        include: {
          group: { select: { name: true } },
          paidBy: { select: { id: true, name: true, email: true } },
        },
      })

    if (!groupTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Parse transaction data to find user's share
    const parsed = parseGroupTransactionData({
      splitData: groupTransaction.splitData,
      totalAmount: groupTransaction.totalAmount,
      paidByUserId: groupTransaction.paidByUserId,
      paidByName:
        groupTransaction.paidBy.name ||
        groupTransaction.paidBy.email ||
        "Member",
      memberNameById: new Map(),
    })

    if (parsed.transactionType !== "expense") {
      return NextResponse.json(
        { error: "Can only record expenses in personal accounts" },
        { status: 400 }
      )
    }

    const userShare = parsed.shares.find(
      (share) => share.userId === user.id
    )

    if (!userShare) {
      return NextResponse.json(
        { error: "You are not part of this expense split" },
        { status: 400 }
      )
    }

    const shareAmount = userShare.amount

    // Create personal transaction
    const personalTransaction = await prisma.$transaction(
      async (tx) => {
        const txn = await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -Math.abs(shareAmount),
            type: "expense",
            description: `Group: ${groupTransaction.group.name} - ${groupTransaction.description}`,
            category: category || "Other",
            accountId,
            tags: ["group-settlement", groupTransaction.group.name],
            notes: `Recorded from settlement group: ${groupTransaction.group.name}. Total: ${groupTransaction.totalAmount}, your share: ${shareAmount}`,
            date: groupTransaction.createdAt,
          },
        })

        // Update account balance
        await tx.financialAccount.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: Math.abs(shareAmount),
            },
          },
        })

        return txn
      },
      { maxWait: 10_000, timeout: 20_000 }
    )

    // Update the chat message metadata to track who has recorded
    const chatMessage =
      await prisma.settlementGroupMessage.findFirst({
        where: { transactionId },
        select: { id: true, metadata: true },
      })

    if (chatMessage) {
      const existingMetadata =
        (chatMessage.metadata as Record<string, unknown>) || {}
      const recordedBy = Array.isArray(existingMetadata.recordedBy)
        ? [...existingMetadata.recordedBy, user.id]
        : [user.id]

      await prisma.settlementGroupMessage.update({
        where: { id: chatMessage.id },
        data: {
          metadata: { ...existingMetadata, recordedBy },
        },
      })
    }

    // Recalculate affected budgets
    const txnDate = groupTransaction.createdAt
    const affectedBudgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
        OR: [
          { startDate: { lte: txnDate }, endDate: { gte: txnDate } },
          { startDate: { lte: txnDate }, endDate: null },
        ],
      },
      include: { subBudgets: true },
    })

    for (const budget of affectedBudgets) {
      const expenseCategory = category || "Other"
      const sub = budget.subBudgets.find((sb: { category: string }) => sb.category === expenseCategory)

      if (sub) {
        await prisma.subBudget.update({
          where: { id: sub.id },
          data: { spent: { increment: Math.abs(shareAmount) } },
        })
      }

      await prisma.budget.update({
        where: { id: budget.id },
        data: { totalSpent: { increment: Math.abs(shareAmount) } },
      })
    }

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.transactions,
      USER_CACHE_SCOPES.accounts,
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.syncCore,
    ])

    return NextResponse.json(
      {
        id: personalTransaction.id,
        amount: personalTransaction.amount,
        description: personalTransaction.description,
        accountName: account.name,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error recording personal transaction:", error)
    return NextResponse.json(
      { error: "Failed to record personal transaction" },
      { status: 500 }
    )
  }
}
