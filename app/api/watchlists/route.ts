import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/watchlists - Get all watchlists for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const watchlists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(watchlists)
  } catch (error) {
    console.error("Error fetching watchlists:", error)
    return NextResponse.json(
      { error: "Failed to fetch watchlists" },
      { status: 500 }
    )
  }
}

// POST /api/watchlists - Create a new watchlist
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      name,
      type,
      value,
      budgetLimit,
      period,
      startDate,
      endDate,
      alertEnabled,
      alertThreshold,
      color,
    } = body

    if (!name || !type || !value) {
      return NextResponse.json(
        { error: "Name, type, and value are required" },
        { status: 400 }
      )
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId: user.id,
        name,
        type,
        value,
        budgetLimit,
        period: period || 'monthly',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        alertEnabled: alertEnabled ?? true,
        alertThreshold: alertThreshold || 80,
        color,
      },
    })

    return NextResponse.json(watchlist, { status: 201 })
  } catch (error) {
    console.error("Error creating watchlist:", error)
    return NextResponse.json(
      { error: "Failed to create watchlist" },
      { status: 500 }
    )
  }
}

// PUT /api/watchlists - Update a watchlist
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      id,
      name,
      type,
      value,
      budgetLimit,
      period,
      startDate,
      endDate,
      alertEnabled,
      alertThreshold,
      color,
      isActive,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Watchlist ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.watchlist.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      )
    }

    const watchlist = await prisma.watchlist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value }),
        ...(budgetLimit !== undefined && { budgetLimit }),
        ...(period !== undefined && { period }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(alertEnabled !== undefined && { alertEnabled }),
        ...(alertThreshold !== undefined && { alertThreshold }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(watchlist)
  } catch (error) {
    console.error("Error updating watchlist:", error)
    return NextResponse.json(
      { error: "Failed to update watchlist" },
      { status: 500 }
    )
  }
}

// DELETE /api/watchlists - Delete a watchlist
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Watchlist ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.watchlist.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      )
    }

    await prisma.watchlist.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting watchlist:", error)
    return NextResponse.json(
      { error: "Failed to delete watchlist" },
      { status: 500 }
    )
  }
}
