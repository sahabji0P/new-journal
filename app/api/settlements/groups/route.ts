import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
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

type StoredShare = {
  userId: string
  name: string
  amount: number
  amountCents: number
  isPaid: boolean
  paidAt?: string
  percentage?: number
}

type SettlementGroupPayload = Prisma.SettlementGroupGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    members: {
      orderBy: {
        createdAt: "asc"
      }
      include: {
        user: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
    transactions: {
      orderBy: {
        createdAt: "desc"
      }
      include: {
        paidBy: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
  }
}>

function mapGroup(group: SettlementGroupPayload) {
  const memberNameById = new Map<string, string>()
  const memberEmailById = new Map<string, string>()
  const users = group.members.map((member) => {
    const memberName = resolveDisplayName(member.user, "Member")
    const memberEmail = member.user.email || ""
    memberNameById.set(member.userId, memberName)
    memberEmailById.set(member.userId, memberEmail)

    return {
      id: member.userId,
      name: memberName,
      email: memberEmail,
    }
  })

  const normalizedTransactions = group.transactions.map((transaction) => {
    const parsed = parseGroupTransactionData({
      splitData: transaction.splitData,
      totalAmount: transaction.totalAmount,
      paidByUserId: transaction.paidByUserId,
      paidByName: resolveDisplayName(transaction.paidBy, "Member"),
      memberNameById,
    })

    if (parsed.transactionType === "settlement") {
      const totalAmount = centsToAmount(parsed.totalAmountCents)
      return {
        id: transaction.id,
        groupId: transaction.groupId,
        transactionType: "settlement" as const,
        description: transaction.description,
        totalAmount,
        totalAmountCents: parsed.totalAmountCents,
        paidByUserId: transaction.paidByUserId,
        paidByName: resolveDisplayName(transaction.paidBy, "Member"),
        shares: [] as StoredShare[],
        fromUserId: parsed.fromUserId,
        fromUserName: parsed.fromUserName,
        toUserId: parsed.toUserId,
        toUserName: parsed.toUserName,
        notes: transaction.notes || undefined,
        createdAt: transaction.createdAt.toISOString(),
      }
    }

    const shares = parsed.shares.map((share) => ({
      userId: share.userId,
      name: share.name,
      amount: share.amount,
      amountCents: share.amountCents,
      isPaid: share.isPaid,
      ...(share.paidAt ? { paidAt: share.paidAt } : {}),
      ...(share.percentage !== undefined ? { percentage: share.percentage } : {}),
    }))

    return {
      id: transaction.id,
      groupId: transaction.groupId,
      transactionType: "expense" as const,
      splitType: parsed.splitType,
      description: transaction.description,
      totalAmount: centsToAmount(parsed.totalAmountCents),
      totalAmountCents: parsed.totalAmountCents,
      paidByUserId: transaction.paidByUserId,
      paidByName: resolveDisplayName(transaction.paidBy, "Member"),
      shares,
      notes: transaction.notes || undefined,
      createdAt: transaction.createdAt.toISOString(),
    }
  })

  const expenses = normalizedTransactions
    .filter((transaction) => transaction.transactionType === "expense")
    .map((transaction) => ({
      paidByUserId: transaction.paidByUserId,
      totalAmountCents: transaction.totalAmountCents,
      shares: transaction.shares.map((share) => ({
        userId: share.userId,
        amountCents: share.amountCents,
      })),
    }))

  const settlements = normalizedTransactions
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
    expenses,
    settlements,
  })

  const suggestions = generateSettlementSuggestions(balances)

  return {
    id: group.id,
    name: group.name,
    description: group.description || undefined,
    createdById: group.createdById,
    createdByName: resolveDisplayName(group.createdBy, "Creator"),
    members: group.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: resolveDisplayName(member.user, "Member"),
      email: member.user.email || "",
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    })),
    transactions: normalizedTransactions,
    balances: balances.map((balance) => ({
      userId: balance.userId,
      name: balance.userName,
      email: memberEmailById.get(balance.userId) || "",
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
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

async function fetchGroupsForUser(userId: string) {
  const groups = await prisma.settlementGroup.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        orderBy: {
          createdAt: "asc",
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
      },
      transactions: {
        orderBy: {
          createdAt: "desc",
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
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return groups.map(mapGroup)
}

// GET /api/settlements/groups - List groups where user is a member
export async function GET() {
  try {
    const user = await requireAuth()
    const groups = await fetchGroupsForUser(user.id)
    return NextResponse.json(groups)
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      console.warn("Settlement groups table not ready yet. Returning empty groups list.")
      return NextResponse.json([])
    }

    console.error("Error fetching settlement groups:", error)
    return NextResponse.json({ error: "Failed to fetch settlement groups" }, { status: 500 })
  }
}

// POST /api/settlements/groups - Create a new settlement group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    const createdGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.settlementGroup.create({
        data: {
          name,
          description: description || null,
          createdById: user.id,
        },
      })

      await tx.settlementGroupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
          role: "owner",
        },
      })

      return group
    })

    // Create initial system message
    try {
      const creatorName = user.name || user.email || "The creator"
      await prisma.settlementGroupMessage.create({
        data: {
          groupId: createdGroup.id,
          senderId: user.id,
          type: "system",
          content: `${creatorName} created this group`,
        },
      })
    } catch (chatError) {
      console.error("Failed to create system message for group creation:", chatError)
    }

    const groups = await fetchGroupsForUser(user.id)
    const created = groups.find((group) => group.id === createdGroup.id)

    return NextResponse.json(created || null, { status: 201 })
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating settlement group:", error)
    return NextResponse.json({ error: "Failed to create settlement group" }, { status: 500 })
  }
}
