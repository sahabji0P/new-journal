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
