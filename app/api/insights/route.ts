import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/insights - Get all insights for the user
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')

    const where: any = {
      userId: user.id,
      isArchived: false,
    }

    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const insights = await prisma.insight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json(insights)
  } catch (error) {
    console.error("Error fetching insights:", error)
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    )
  }
}

// POST /api/insights - Create a new insight (internal use or manual)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { type, title, description, severity, category, data, validUntil } = body

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Type, title, and description are required" },
        { status: 400 }
      )
    }

    const insight = await prisma.insight.create({
      data: {
        userId: user.id,
        type,
        title,
        description,
        severity: severity || 'info',
        category,
        data,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    })

    return NextResponse.json(insight, { status: 201 })
  } catch (error) {
    console.error("Error creating insight:", error)
    return NextResponse.json(
      { error: "Failed to create insight" },
      { status: 500 }
    )
  }
}

// PATCH /api/insights/mark-read - Mark insights as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      )
    }

    await prisma.insight.updateMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking insights as read:", error)
    return NextResponse.json(
      { error: "Failed to mark insights as read" },
      { status: 500 }
    )
  }
}
