import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/parties - Get all parties for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const parties = await prisma.party.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(parties)
  } catch (error) {
    console.error("Error fetching parties:", error)
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 }
    )
  }
}

// POST /api/parties - Create a new party
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

    const party = await prisma.party.create({
      data: {
        userId: user.id,
        name,
      },
    })

    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error("Error creating party:", error)
    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 }
    )
  }
}
