import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/groups - Get all portfolio groups for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const groups = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.portfolioGroups,
      revalidateSeconds: 20,
      loader: async () => prisma.portfolioGroup.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error("Error fetching portfolio groups:", error)
    return NextResponse.json(
      { error: "Failed to fetch portfolio groups" },
      { status: 500 }
    )
  }
}

// POST /api/investments/groups - Create a new portfolio group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { name, description, color } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const group = await prisma.portfolioGroup.create({
      data: {
        userId: user.id,
        name,
        description,
        color,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.portfolioGroups])

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error("Error creating portfolio group:", error)
    return NextResponse.json(
      { error: "Failed to create portfolio group" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/groups - Update a portfolio group
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Portfolio group ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.portfolioGroup.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Portfolio group not found" },
        { status: 404 }
      )
    }

    const group = await prisma.portfolioGroup.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.portfolioGroups])

    return NextResponse.json(group)
  } catch (error) {
    console.error("Error updating portfolio group:", error)
    return NextResponse.json(
      { error: "Failed to update portfolio group" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/groups - Delete a portfolio group
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Portfolio group ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.portfolioGroup.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Portfolio group not found" },
        { status: 404 }
      )
    }

    await prisma.portfolioGroup.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.portfolioGroups])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting portfolio group:", error)
    return NextResponse.json(
      { error: "Failed to delete portfolio group" },
      { status: 500 }
    )
  }
}
