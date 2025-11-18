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
