import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import {
  amountToCents,
  centsToAmount,
  splitByPercentages,
  splitEqually,
  type SplitMode,
  validateCustomSplit,
} from "@/lib/settlements/group-ledger"
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

function parseSplitMode(value: unknown): SplitMode {
  return value === "equal" || value === "custom" || value === "percentage" ? value : "custom"
}

function normalizeUserIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function normalizeCustomShares(value: unknown): { userId: string; amountCents: number }[] {
  if (!Array.isArray(value)) return []

  const normalized: { userId: string; amountCents: number }[] = []

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.userId !== "string" || !candidate.userId.trim()) continue

    const parsedAmount = Number(candidate.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) continue

    normalized.push({
      userId: candidate.userId.trim(),
      amountCents: amountToCents(parsedAmount),
    })
  }

  return normalized
}

function normalizePercentageShares(value: unknown): { userId: string; percentage: number }[] {
  if (!Array.isArray(value)) return []

  const normalized: { userId: string; percentage: number }[] = []

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.userId !== "string" || !candidate.userId.trim()) continue

    const percentage = Number(candidate.percentage)
    if (!Number.isFinite(percentage) || percentage < 0) continue

    normalized.push({
      userId: candidate.userId.trim(),
      percentage,
    })
  }

  return normalized
}

function dedupeByUserId<T extends { userId: string }>(rows: T[]): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    map.set(row.userId, row)
  }
  return [...map.values()]
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

// POST /api/settlements/group-transactions - Add a new shared transaction inside a group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))

    const groupId = typeof body.groupId === "string" ? body.groupId : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const notes = typeof body.notes === "string" ? body.notes.trim() : ""
    const totalAmount = Number(body.totalAmount)
    const paidByUserId = typeof body.paidByUserId === "string" ? body.paidByUserId : ""
    const splitType = parseSplitMode(body.splitType)

    if (!groupId || !description || !Number.isFinite(totalAmount) || totalAmount <= 0 || !paidByUserId) {
      return NextResponse.json(
        { error: "Group, description, payer, and valid total amount are required" },
        { status: 400 }
      )
    }

    const canWrite = await hasGroupAccess(groupId, user.id)
    if (!canWrite) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const members = await prisma.settlementGroupMember.findMany({
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
    })

    if (members.length === 0) {
      return NextResponse.json({ error: "Group has no members" }, { status: 400 })
    }

    const memberById = new Map(members.map((member) => [member.userId, member]))

    if (!memberById.has(paidByUserId)) {
      return NextResponse.json({ error: "Payer must be a group member" }, { status: 400 })
    }

    const totalAmountCents = amountToCents(totalAmount)
    let computedShares: { userId: string; amountCents: number; percentage?: number }[] = []

    if (splitType === "equal") {
      const splitBetween = normalizeUserIdList(body.splitBetween)
      const participants = splitBetween.length > 0 ? splitBetween : [...memberById.keys()]
      const uniqueParticipants = [...new Set(participants)]

      if (uniqueParticipants.length === 0) {
        return NextResponse.json(
          { error: "At least one participant is required for equal split" },
          { status: 400 }
        )
      }

      const invalidParticipant = uniqueParticipants.find((participant) => !memberById.has(participant))
      if (invalidParticipant) {
        return NextResponse.json(
          { error: "All split participants must be group members" },
          { status: 400 }
        )
      }

      computedShares = splitEqually(totalAmountCents, uniqueParticipants)
    } else if (splitType === "percentage") {
      const percentageShares = dedupeByUserId(normalizePercentageShares(body.percentageShares))

      if (percentageShares.length === 0) {
        return NextResponse.json(
          { error: "Percentage split requires at least one participant" },
          { status: 400 }
        )
      }

      const invalidParticipant = percentageShares.find((split) => !memberById.has(split.userId))
      if (invalidParticipant) {
        return NextResponse.json(
          { error: "All percentage split participants must be group members" },
          { status: 400 }
        )
      }

      try {
        computedShares = splitByPercentages(totalAmountCents, percentageShares)
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid percentage split" },
          { status: 400 }
        )
      }
    } else {
      const shares = dedupeByUserId(normalizeCustomShares(body.shares))
      if (shares.length === 0) {
        return NextResponse.json({ error: "At least one split share is required" }, { status: 400 })
      }

      const invalidParticipant = shares.find((share) => !memberById.has(share.userId))
      if (invalidParticipant) {
        return NextResponse.json({ error: "All share users must be group members" }, { status: 400 })
      }

      const validation = validateCustomSplit(totalAmountCents, shares)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || "Invalid split amounts" }, { status: 400 })
      }

      computedShares = shares
    }

    const splitSum = computedShares.reduce((sum, share) => sum + share.amountCents, 0)
    if (splitSum !== totalAmountCents) {
      return NextResponse.json(
        { error: "Split shares total must match transaction total" },
        { status: 400 }
      )
    }

    const storedShareData = computedShares.map((share) => {
      const member = memberById.get(share.userId)
      const displayName = member ? resolveDisplayName(member.user, "Member") : "Member"

      return {
        userId: share.userId,
        name: displayName,
        amount: centsToAmount(share.amountCents),
        amountCents: share.amountCents,
        isPaid: false,
        ...(share.percentage !== undefined ? { percentage: share.percentage } : {}),
      }
    })

    const transaction = await prisma.settlementGroupTransaction.create({
      data: {
        groupId,
        createdById: user.id,
        paidByUserId,
        description,
        totalAmount: centsToAmount(totalAmountCents),
        splitData: {
          transactionType: "expense",
          splitType,
          totalAmountCents,
          shares: storedShareData,
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

    const payload = {
      id: transaction.id,
      groupId: transaction.groupId,
      transactionType: "expense" as const,
      splitType,
      description: transaction.description,
      totalAmount: centsToAmount(totalAmountCents),
      totalAmountCents,
      paidByUserId: transaction.paidByUserId,
      paidByName: resolveDisplayName(transaction.paidBy, "Member"),
      shares: storedShareData,
      notes: transaction.notes || undefined,
      createdAt: transaction.createdAt.toISOString(),
    }

    // Create chat message for this expense
    try {
      const chatMessage = await prisma.settlementGroupMessage.create({
        data: {
          groupId,
          senderId: user.id,
          type: "expense",
          content: JSON.stringify({
            description: transaction.description,
            totalAmount: centsToAmount(totalAmountCents),
            paidByName: resolveDisplayName(transaction.paidBy, "Member"),
            splitType,
            shares: storedShareData,
          }),
          transactionId: transaction.id,
        },
        include: {
          sender: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      })

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

      await broadcastToGroup(groupId, "expense-added", messagePayload)
    } catch (chatError) {
      console.error("Failed to create chat message for expense:", chatError)
    }

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Group transactions are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating settlement group transaction:", error)
    return NextResponse.json({ error: "Failed to create group transaction" }, { status: 500 })
  }
}
