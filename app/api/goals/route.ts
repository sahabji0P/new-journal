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

// PUT /api/goals - Update a goal
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      id,
      name,
      targetAmount,
      currentAmount,
      targetDate,
      monthlyContribution,
      priority,
      accountId,
      notes,
      includeInSpendingPlan,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.goal.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      )
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        name,
        targetAmount,
        currentAmount,
        targetDate: targetDate ? new Date(targetDate) : null,
        monthlyContribution,
        priority,
        accountId,
        notes,
        includeInSpendingPlan,
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error updating goal:", error)
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    )
  }
}

// DELETE /api/goals - Delete a goal
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.goal.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      )
    }

    await prisma.goal.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting goal:", error)
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    )
  }
}
