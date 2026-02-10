import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

function isSchemaOutOfDateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  )
}

type IncomingShare = {
  userId: string
  amount: number
  isPaid?: boolean
}

function resolveDisplayName(user: { name: string | null; email: string | null }, fallback: string): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

function normalizeShares(input: unknown): IncomingShare[] {
  if (!Array.isArray(input)) return []

  const normalized: IncomingShare[] = []

  for (const entry of input) {
    if (typeof entry !== "object" || entry === null) continue
    const candidate = entry as Record<string, unknown>
    const amount = Number(candidate.amount)

    if (typeof candidate.userId !== "string" || !candidate.userId.trim()) {
      continue
    }

    if (!Number.isFinite(amount) || amount < 0) {
      continue
    }

    normalized.push({
      userId: candidate.userId.trim(),
      amount,
      isPaid: Boolean(candidate.isPaid),
    })
  }

  return normalized
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
    const shares = normalizeShares(body.shares)

    if (!groupId || !description || !Number.isFinite(totalAmount) || totalAmount <= 0 || !paidByUserId) {
      return NextResponse.json(
        { error: "Group, description, payer, and valid total amount are required" },
        { status: 400 }
      )
    }

    if (shares.length === 0) {
      return NextResponse.json({ error: "At least one split share is required" }, { status: 400 })
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

    for (const share of shares) {
      if (!memberById.has(share.userId)) {
        return NextResponse.json({ error: "All share users must be group members" }, { status: 400 })
      }
    }

    const sharesTotal = shares.reduce((sum, share) => sum + share.amount, 0)
    if (Math.abs(sharesTotal - totalAmount) > 0.01) {
      return NextResponse.json(
        { error: "Split shares total must match transaction total" },
        { status: 400 }
      )
    }

    const storedShareData = shares.map((share) => {
      const member = memberById.get(share.userId)
      if (!member) {
        return {
          userId: share.userId,
          name: "Member",
          amount: share.amount,
          isPaid: Boolean(share.isPaid),
        }
      }

      return {
        userId: share.userId,
        name: resolveDisplayName(member.user, "Member"),
        amount: share.amount,
        isPaid: Boolean(share.isPaid),
      }
    })

    const transaction = await prisma.settlementGroupTransaction.create({
      data: {
        groupId,
        createdById: user.id,
        paidByUserId,
        description,
        totalAmount,
        splitData: storedShareData,
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
      description: transaction.description,
      totalAmount: transaction.totalAmount,
      paidByUserId: transaction.paidByUserId,
      paidByName: resolveDisplayName(transaction.paidBy, "Member"),
      shares: storedShareData,
      notes: transaction.notes || undefined,
      createdAt: transaction.createdAt.toISOString(),
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
