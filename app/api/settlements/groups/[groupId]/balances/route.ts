import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import {
  calculateGroupBalances,
  centsToAmount,
  generateSettlementSuggestions,
  parseGroupTransactionData,
} from "@/lib/settlements/group-ledger"

function isSchemaOutOfDateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  )
}

function resolveDisplayName(user: { name: string | null; email: string | null }, fallback: string): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

async function hasGroupAccess(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.settlementGroupMember.findFirst({
    where: {
      groupId,
      userId,
    },
    select: {
      id: true,
    },
  })

  return Boolean(membership)
}

// GET /api/settlements/groups/[groupId]/balances - Compute group balances + settlement suggestions
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await context.params

    const canRead = await hasGroupAccess(groupId, user.id)
    if (!canRead) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const group = await prisma.settlementGroup.findUnique({
      where: {
        id: groupId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const [members, transactions] = await Promise.all([
      prisma.settlementGroupMember.findMany({
        where: {
          groupId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.settlementGroupTransaction.findMany({
        where: {
          groupId,
        },
        include: {
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ])

    const memberNameById = new Map<string, string>()
    const users = members.map((member) => {
      const name = resolveDisplayName(member.user, "Member")
      memberNameById.set(member.userId, name)
      return {
        id: member.userId,
        name,
        email: member.user.email || "",
      }
    })

    const normalizedTransactions = transactions.map((transaction) =>
      parseGroupTransactionData({
        splitData: transaction.splitData,
        totalAmount: transaction.totalAmount,
        paidByUserId: transaction.paidByUserId,
        paidByName: resolveDisplayName(transaction.paidBy, "Member"),
        memberNameById,
      })
    )

    const expenseRows = normalizedTransactions
      .map((transaction, index) => ({ transaction, source: transactions[index] }))
      .filter(
        (
          row
        ): row is {
          transaction: Extract<typeof row.transaction, { transactionType: "expense" }>
          source: (typeof transactions)[number]
        } => row.transaction.transactionType === "expense"
      )
      .map((row) => ({
        paidByUserId: row.source.paidByUserId,
        totalAmountCents: row.transaction.totalAmountCents,
        shares: row.transaction.shares.map((share) => ({
          userId: share.userId,
          amountCents: share.amountCents,
        })),
      }))

    const settlementRows = normalizedTransactions
      .filter((transaction) => transaction.transactionType === "settlement")
      .map((transaction) => ({
        fromUserId: transaction.fromUserId,
        toUserId: transaction.toUserId,
        amountCents: transaction.totalAmountCents,
      }))
      .filter(
        (
          transaction
        ): transaction is { fromUserId: string; toUserId: string; amountCents: number } =>
          Boolean(transaction.fromUserId && transaction.toUserId)
      )

    const balances = calculateGroupBalances({
      users,
      expenses: expenseRows,
      settlements: settlementRows,
    })
    const suggestions = generateSettlementSuggestions(balances)

    const myBalances = balances.find((balance) => balance.userId === user.id)
    const { searchParams } = new URL(req.url)
    const focusUserId = searchParams.get("userId")

    const focusView =
      focusUserId && users.some((candidate) => candidate.id === focusUserId)
        ? suggestions
            .filter(
              (suggestion) =>
                suggestion.fromUserId === focusUserId || suggestion.toUserId === focusUserId
            )
            .map((suggestion) => ({
              ...suggestion,
              amount: centsToAmount(suggestion.amountCents),
            }))
        : null

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
      },
      summary: {
        myBalance: myBalances ? centsToAmount(myBalances.balanceCents) : 0,
        myBalanceCents: myBalances?.balanceCents || 0,
      },
      balances: balances.map((balance) => ({
        userId: balance.userId,
        userName: balance.userName,
        userEmail: balance.userEmail,
        balance: centsToAmount(balance.balanceCents),
        balanceCents: balance.balanceCents,
      })),
      suggestions: suggestions.map((suggestion) => ({
        fromUserId: suggestion.fromUserId,
        fromUserName: suggestion.fromUserName,
        toUserId: suggestion.toUserId,
        toUserName: suggestion.toUserName,
        amount: centsToAmount(suggestion.amountCents),
        amountCents: suggestion.amountCents,
      })),
      ...(focusView ? { focusSuggestions: focusView } : {}),
    })
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error computing group balances:", error)
    return NextResponse.json({ error: "Failed to compute group balances" }, { status: 500 })
  }
}
