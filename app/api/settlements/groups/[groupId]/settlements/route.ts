import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import {
  amountToCents,
  calculateGroupBalances,
  centsToAmount,
  maximumAllowedSettlementCents,
  parseGroupTransactionData,
} from "@/lib/settlements/group-ledger"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { broadcastToGroup } from "@/lib/pusher"

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

async function fetchLedgerContext(groupId: string) {
  const [group, members, transactions] = await Promise.all([
    prisma.settlementGroup.findUnique({
      where: {
        id: groupId,
      },
      select: {
        id: true,
        name: true,
      },
    }),
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

  return {
    group,
    members,
    transactions,
  }
}

// GET /api/settlements/groups/[groupId]/settlements - List settlement payment history
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await context.params

    const hasAccess = await hasGroupAccess(groupId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const { transactions, members } = await fetchLedgerContext(groupId)
    const memberNameById = new Map(
      members.map((member) => [member.userId, resolveDisplayName(member.user, "Member")])
    )

    const settlements = transactions
      .map((transaction) => {
        const parsed = parseGroupTransactionData({
          splitData: transaction.splitData,
          totalAmount: transaction.totalAmount,
          paidByUserId: transaction.paidByUserId,
          paidByName: resolveDisplayName(transaction.paidBy, "Member"),
          memberNameById,
        })

        if (parsed.transactionType !== "settlement") return null

        return {
          id: transaction.id,
          groupId: transaction.groupId,
          fromUserId: parsed.fromUserId,
          fromUserName: parsed.fromUserName,
          toUserId: parsed.toUserId,
          toUserName: parsed.toUserName,
          amount: centsToAmount(parsed.totalAmountCents),
          amountCents: parsed.totalAmountCents,
          notes: transaction.notes || undefined,
          createdAt: transaction.createdAt.toISOString(),
        }
      })
      .filter((settlement): settlement is NonNullable<typeof settlement> => settlement !== null)

    return NextResponse.json(settlements)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error fetching group settlements:", error)
    return NextResponse.json({ error: "Failed to fetch settlements" }, { status: 500 })
  }
}

// POST /api/settlements/groups/[groupId]/settlements - Record a settlement payment
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await context.params
    const body = await req.json().catch(() => ({}))

    const fromUserId = typeof body.fromUserId === "string" ? body.fromUserId : ""
    const toUserId = typeof body.toUserId === "string" ? body.toUserId : ""
    const notes = typeof body.notes === "string" ? body.notes.trim() : ""
    const amount = Number(body.amount)
    const receiverAccountId = typeof body.receiverAccountId === "string" ? body.receiverAccountId : null

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: "Both payer and recipient are required" }, { status: 400 })
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: "Cannot create settlement to yourself" }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 })
    }

    const hasAccess = await hasGroupAccess(groupId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    // Either party (payer or receiver) can record a settlement
    if (fromUserId !== user.id && toUserId !== user.id) {
      return NextResponse.json(
        { error: "You can only record settlements you are involved in" },
        { status: 403 }
      )
    }

    const { group, members, transactions } = await fetchLedgerContext(groupId)
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const memberById = new Map(members.map((member) => [member.userId, member]))
    if (!memberById.has(fromUserId) || !memberById.has(toUserId)) {
      return NextResponse.json({ error: "Both users must be group members" }, { status: 400 })
    }

    const memberNameById = new Map(
      members.map((member) => [member.userId, resolveDisplayName(member.user, "Member")])
    )

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
      users: members.map((member) => ({
        id: member.userId,
        name: resolveDisplayName(member.user, "Member"),
        email: member.user.email || "",
      })),
      expenses: expenseRows,
      settlements: settlementRows,
    })

    const amountCents = amountToCents(amount)
    const maxAllowedCents = maximumAllowedSettlementCents(balances, fromUserId, toUserId)
    if (maxAllowedCents <= 0) {
      return NextResponse.json(
        { error: "No pending debt found for this member pair" },
        { status: 400 }
      )
    }

    if (amountCents > maxAllowedCents) {
      return NextResponse.json(
        {
          error: `Amount exceeds outstanding debt. Max allowed: ${centsToAmount(maxAllowedCents)}`,
        },
        { status: 400 }
      )
    }

    const fromUserName = memberNameById.get(fromUserId) || "Member"
    const toUserName = memberNameById.get(toUserId) || "Member"
    const settlementDescription =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : `${fromUserName} paid ${toUserName}`

    const settlementEntry = await prisma.settlementGroupTransaction.create({
      data: {
        groupId,
        createdById: user.id,
        paidByUserId: fromUserId,
        description: settlementDescription,
        totalAmount: centsToAmount(amountCents),
        splitData: {
          transactionType: "settlement",
          fromUserId,
          toUserId,
          fromUserName,
          toUserName,
          amountCents,
        },
        notes: notes || null,
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
    })

    // Create notification and chat message in parallel
    try {
      const [, chatMessage] = await Promise.all([
        prisma.notification.create({
          data: {
            userId: toUserId,
            type: "info",
            title: "Settlement received",
            message: `${fromUserName} paid you ${centsToAmount(amountCents)} in ${group.name}`,
            actionLink: `/settlements/${groupId}`,
          },
        }),
        prisma.settlementGroupMessage.create({
          data: {
            groupId,
            senderId: user.id,
            type: "settlement",
            content: JSON.stringify({
              fromUserId,
              fromUserName,
              toUserId,
              toUserName,
              amount: centsToAmount(amountCents),
              amountCents,
              totalOwedCents: maxAllowedCents,
              isPartial: amountCents < maxAllowedCents,
            }),
            transactionId: settlementEntry.id,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        }),
      ])

      const messagePayload = {
        id: chatMessage.id,
        groupId: chatMessage.groupId,
        senderId: chatMessage.senderId,
        senderName: resolveDisplayName(chatMessage.sender, "Member"),
        senderImage: chatMessage.sender.image || undefined,
        type: chatMessage.type,
        content: chatMessage.content,
        transactionId: chatMessage.transactionId || undefined,
        createdAt: chatMessage.createdAt.toISOString(),
      }

      // Don't await — fire and forget
      broadcastToGroup(groupId, "settlement-recorded", messagePayload).catch(() => {})
    } catch (chatError) {
      console.error("Failed to create notification or chat message for settlement:", chatError)
    }

    invalidateUserCache(toUserId, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])
    invalidateUserCache(user.id, [USER_CACHE_SCOPES.syncAdvanced])

    // Auto-create personal transactions for both parties
    try {
      const [payerAccount, receiverAccount] = await Promise.all([
        prisma.financialAccount.findFirst({
          where: { userId: fromUserId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        }),
        receiverAccountId
          ? prisma.financialAccount.findFirst({
              where: { id: receiverAccountId, userId: toUserId },
              select: { id: true },
            })
          : prisma.financialAccount.findFirst({
              where: { userId: toUserId },
              select: { id: true },
              orderBy: { createdAt: "asc" },
            }),
      ])

      const settlementAmount = centsToAmount(amountCents) // dollars

      const personalTxnPromises: Promise<void>[] = []

      if (payerAccount) {
        personalTxnPromises.push(
          prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: fromUserId,
                type: "expense",
                amount: -Math.abs(settlementAmount), // negative for expense
                description: `Settlement to ${toUserName} — ${group.name}`,
                category: "Settlement",
                accountId: payerAccount.id,
                tags: ["group-settlement", group.name],
                notes: `Settlement payment in group: ${group.name}`,
                date: new Date(),
              },
            })
            await tx.financialAccount.update({
              where: { id: payerAccount.id },
              data: { balance: { decrement: Math.abs(settlementAmount) } },
            })
          })
        )
      }

      if (receiverAccount) {
        personalTxnPromises.push(
          prisma.$transaction(async (tx) => {
            await tx.transaction.create({
              data: {
                userId: toUserId,
                type: "income",
                amount: Math.abs(settlementAmount), // positive for income
                description: `Settlement from ${fromUserName} — ${group.name}`,
                category: "Settlement",
                accountId: receiverAccount.id,
                tags: ["group-settlement", group.name],
                notes: `Settlement payment in group: ${group.name}`,
                date: new Date(),
              },
            })
            await tx.financialAccount.update({
              where: { id: receiverAccount.id },
              data: { balance: { increment: Math.abs(settlementAmount) } },
            })
          })
        )
      }

      await Promise.all(personalTxnPromises)

      // Invalidate transaction + account caches for both users
      invalidateUserCache(fromUserId, [
        USER_CACHE_SCOPES.transactions,
        USER_CACHE_SCOPES.accounts,
        USER_CACHE_SCOPES.syncCore,
      ])
      invalidateUserCache(toUserId, [
        USER_CACHE_SCOPES.transactions,
        USER_CACHE_SCOPES.accounts,
        USER_CACHE_SCOPES.syncCore,
      ])
    } catch (personalTxnError) {
      console.error("Failed to create personal transactions for settlement:", personalTxnError)
      // Non-critical — settlement is already recorded in group
    }

    return NextResponse.json(
      {
        id: settlementEntry.id,
        groupId: settlementEntry.groupId,
        transactionType: "settlement",
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        amount: centsToAmount(amountCents),
        amountCents,
        notes: settlementEntry.notes || undefined,
        createdAt: settlementEntry.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating group settlement:", error)
    return NextResponse.json({ error: "Failed to create settlement" }, { status: 500 })
  }
}
