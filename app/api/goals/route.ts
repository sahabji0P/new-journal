import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/goals - Get all goals for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("Error fetching goals:", error)
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    )
  }
}

// POST /api/goals - Create a new goal
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      name,
      targetAmount,
      targetDate,
      monthlyContribution,
      priority,
      color,
      icon,
      accountId,
      includeInSpendingPlan,
      notes,
    } = body

    if (!name || !targetAmount) {
      return NextResponse.json(
        { error: "Name and targetAmount are required" },
        { status: 400 }
      )
    }

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        name,
        targetAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        monthlyContribution,
        priority: priority || 'medium',
        color,
        icon,
        accountId,
        includeInSpendingPlan: includeInSpendingPlan ?? true,
        notes,
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("Error creating goal:", error)
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    )
  }
}
