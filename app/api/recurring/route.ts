import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/recurring - Get all recurring transactions for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
    })

    return NextResponse.json(recurring)
  } catch (error) {
    console.error("Error fetching recurring transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring transactions" },
      { status: 500 }
    )
  }
}

// POST /api/recurring - Create a new recurring transaction
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      description,
      amount,
      category,
      type,
      accountId,
      frequency,
      startDate,
      endDate,
      nextDueDate,
      autoCreate,
      reminderDays,
      notes,
      tags,
    } = body

    if (!description || !amount || !category || !type || !accountId || !frequency || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: user.id,
        description,
        amount,
        category,
        type,
        accountId,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextDueDate: new Date(nextDueDate || startDate),
        autoCreate: autoCreate ?? false,
        reminderDays: reminderDays || 3,
        notes,
        tags: tags || [],
      },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    console.error("Error creating recurring transaction:", error)
    return NextResponse.json(
      { error: "Failed to create recurring transaction" },
      { status: 500 }
    )
  }
}
