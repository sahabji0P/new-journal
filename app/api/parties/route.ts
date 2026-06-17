import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/parties - Get all parties for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const parties = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.parties,
      revalidateSeconds: 20,
      loader: async () => prisma.party.findMany({
        where: { userId: user.id },
        orderBy: { name: 'asc' },
      }),
    })

    return NextResponse.json(parties)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching parties:", error)
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 }
    )
  }
}

// POST /api/parties - Create a new party (or return existing)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Use upsert to handle duplicate names gracefully
    const party = await prisma.party.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
      update: {}, // No update needed, just return existing
      create: {
        userId: user.id,
        name,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.parties, USER_CACHE_SCOPES.syncAdvanced, USER_CACHE_SCOPES.chatContext])

    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating party:", error)
    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 }
    )
  }
}

// PUT /api/parties - Update a party
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, name } = body

    if (!id) {
      return NextResponse.json(
        { error: "Party ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.party.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      )
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        name,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.parties, USER_CACHE_SCOPES.syncAdvanced, USER_CACHE_SCOPES.chatContext])

    return NextResponse.json(party)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating party:", error)
    return NextResponse.json(
      { error: "Failed to update party" },
      { status: 500 }
    )
  }
}

// DELETE /api/parties - Delete a party
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Party ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.party.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Party not found" },
        { status: 404 }
      )
    }

    await prisma.party.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.parties, USER_CACHE_SCOPES.syncAdvanced, USER_CACHE_SCOPES.chatContext])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting party:", error)
    return NextResponse.json(
      { error: "Failed to delete party" },
      { status: 500 }
    )
  }
}
