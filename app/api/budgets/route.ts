import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/budgets - Get all budgets for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const budgets = await prisma.budget.findMany({
      where: { userId: user.id },
      include: {
        subBudgets: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(budgets)
  } catch (error) {
    console.error("Error fetching budgets:", error)
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    )
  }
}

// POST /api/budgets - Create a new budget
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { name, type, totalAllocated, subBudgets, startDate, endDate, rollover } = body

    if (!name || !type || !totalAllocated) {
      return NextResponse.json(
        { error: "Name, type, and totalAllocated are required" },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.create({
      data: {
        userId: user.id,
        name,
        type,
        totalAllocated,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        rollover: rollover || false,
        subBudgets: {
          create: subBudgets?.map((sub: { category: string; allocated: number; alertThreshold?: number }) => ({
            category: sub.category,
            allocated: sub.allocated,
            alertThreshold: sub.alertThreshold || 80,
          })) || [],
        },
      },
      include: {
        subBudgets: true,
      },
    })

    return NextResponse.json(budget, { status: 201 })
  } catch (error) {
    console.error("Error creating budget:", error)
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    )
  }
}

// PUT /api/budgets - Update an existing budget
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, name, type, totalAllocated, subBudgets, startDate, endDate, rollover } = body

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      )
    }

    if (existingBudget.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Update budget: delete old subBudgets and create new ones
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingBudget.name,
        type: type !== undefined ? type : existingBudget.type,
        totalAllocated: totalAllocated !== undefined ? totalAllocated : existingBudget.totalAllocated,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : existingBudget.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingBudget.endDate,
        rollover: rollover !== undefined ? rollover : existingBudget.rollover,
        subBudgets: subBudgets !== undefined ? {
          deleteMany: {},
          create: subBudgets.map((sub: { category: string; allocated: number; alertThreshold?: number }) => ({
            category: sub.category,
            allocated: sub.allocated,
            alertThreshold: sub.alertThreshold || 80,
          })),
        } : undefined,
      },
      include: {
        subBudgets: true,
      },
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets - Delete a budget
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Budget id is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    })

    if (!existingBudget) {
      return NextResponse.json(
        { error: "Budget not found" },
        { status: 404 }
      )
    }

    if (existingBudget.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Delete budget (subBudgets will cascade delete due to Prisma relations)
    await prisma.budget.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
