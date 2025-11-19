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

// PUT /api/recurring - Update a recurring transaction
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      id,
      description,
      amount,
      category,
      type,
      accountId,
      accountName,
      frequency,
      startDate,
      endDate,
      nextDueDate,
      isActive,
      autoCreate,
      reminderDays,
      notes,
      tags,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Recurring transaction ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.recurringTransaction.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Recurring transaction not found" },
        { status: 404 }
      )
    }

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        description,
        amount,
        category,
        type,
        accountId,
        accountName,
        frequency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        isActive,
        autoCreate,
        reminderDays,
        notes,
        tags,
      },
    })

    return NextResponse.json(recurring)
  } catch (error) {
    console.error("Error updating recurring transaction:", error)
    return NextResponse.json(
      { error: "Failed to update recurring transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/recurring - Delete a recurring transaction
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Recurring transaction ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.recurringTransaction.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Recurring transaction not found" },
        { status: 404 }
      )
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting recurring transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete recurring transaction" },
      { status: 500 }
    )
  }
}
