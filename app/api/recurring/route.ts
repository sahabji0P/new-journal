import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/recurring - Get all recurring transactions for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const recurring = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.recurring,
      revalidateSeconds: 20,
      loader: async () => prisma.recurringTransaction.findMany({
        where: { userId: user.id },
        include: {
          account: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { nextDueDate: 'asc' },
      }),
    })

    return NextResponse.json(recurring)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
        nextDueDate: new Date(nextDueDate || startDate),
        autoCreate: autoCreate ?? false,
        reminderDays: reminderDays || 3,
        notes,
        tags: tags || [],
      },
      include: { account: { select: { name: true } } },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.recurring, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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
      frequency,
      startDate,
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

    // Build update data object
    const updateData: Record<string, unknown> = {}

    if (description !== undefined) updateData.description = description
    if (amount !== undefined) updateData.amount = amount
    if (category !== undefined) updateData.category = category
    if (type !== undefined) updateData.type = type
    if (frequency !== undefined) updateData.frequency = frequency
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (nextDueDate !== undefined) updateData.nextDueDate = nextDueDate ? new Date(nextDueDate) : undefined
    if (isActive !== undefined) updateData.isActive = isActive
    if (autoCreate !== undefined) updateData.autoCreate = autoCreate
    if (reminderDays !== undefined) updateData.reminderDays = reminderDays
    if (notes !== undefined) updateData.notes = notes
    if (tags !== undefined) updateData.tags = tags

    // Handle account relation update
    if (accountId !== undefined) {
      updateData.account = { connect: { id: accountId } }
    }

    const recurring = await prisma.recurringTransaction.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: { name: true },
        },
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.recurring, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(recurring)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.recurring, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting recurring transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete recurring transaction" },
      { status: 500 }
    )
  }
}
