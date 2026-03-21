import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

async function hasUniqueUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return false

  const user = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  })

  return Boolean(user)
}

// GET /api/settlements - Get all settlements for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const settlements = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.settlements,
      revalidateSeconds: 20,
      loader: async () => prisma.settlement.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          party: true,
          amount: true,
          type: true,
          reason: true,
          isSettled: true,
          settledAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(settlements)
  } catch (error) {
    console.error("Error fetching settlements:", error)
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    )
  }
}

// POST /api/settlements - Create a new settlement
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      party,
      amount,
      type,
      reason,
      notes,
      fromPerson,
      toPerson,
      partyEmail,
    } = body

    const resolvedParty = party || toPerson || fromPerson
    const resolvedType = type || (fromPerson && toPerson ? "i_owe" : undefined)
    const resolvedReason = reason || notes

    if (!resolvedParty || !amount || !resolvedType) {
      return NextResponse.json(
        { error: "Party, amount, and type are required" },
        { status: 400 }
      )
    }

    if (typeof partyEmail === "string" && partyEmail.trim()) {
      const isRegisteredUser = await hasUniqueUserByEmail(partyEmail)
      if (!isRegisteredUser) {
        return NextResponse.json(
          { error: "Invitation can only be sent to registered users" },
          { status: 400 }
        )
      }
    }

    const settlement = await prisma.settlement.create({
      data: {
        userId: user.id,
        party: resolvedParty,
        amount: parseFloat(amount),
        type: resolvedType,
        reason: resolvedReason || null,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.settlements, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(settlement, { status: 201 })
  } catch (error) {
    console.error("Error creating settlement:", error)
    return NextResponse.json(
      { error: "Failed to create settlement" },
      { status: 500 }
    )
  }
}

// PUT /api/settlements - Update a settlement
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: "Settlement ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.settlement.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      )
    }

    const settlement = await prisma.settlement.update({
      where: { id },
      data: {
        ...(data.party && { party: data.party }),
        ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
        ...(data.type && { type: data.type }),
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.isSettled !== undefined && { isSettled: data.isSettled }),
        ...(data.isSettled && {
          settledAt: data.settledAt ? new Date(data.settledAt) : new Date(),
        }),
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.settlements, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(settlement)
  } catch (error) {
    console.error("Error updating settlement:", error)
    return NextResponse.json(
      { error: "Failed to update settlement" },
      { status: 500 }
    )
  }
}

// DELETE /api/settlements - Delete a settlement
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || body.id

    if (!id) {
      return NextResponse.json(
        { error: "Settlement ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.settlement.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      )
    }

    await prisma.settlement.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.settlements, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting settlement:", error)
    return NextResponse.json(
      { error: "Failed to delete settlement" },
      { status: 500 }
    )
  }
}
