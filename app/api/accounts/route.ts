import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/accounts - Get all accounts for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const accounts = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.accounts,
      revalidateSeconds: 20,
      loader: async () => prisma.financialAccount.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
    })

    return NextResponse.json(accounts)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching accounts:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create a new account
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { name, balance, type, color, icon } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      )
    }

    const account = await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name,
        balance: balance || 0,
        type,
        color,
        icon,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.accounts, USER_CACHE_SCOPES.syncCore, USER_CACHE_SCOPES.chatContext])

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating account:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}

// PUT /api/accounts - Update an account
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    const account = await prisma.financialAccount.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.accounts, USER_CACHE_SCOPES.syncCore, USER_CACHE_SCOPES.chatContext])

    return NextResponse.json(account)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating account:", error)
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts - Delete an account
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    await prisma.financialAccount.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.accounts,
      USER_CACHE_SCOPES.transactions,
      USER_CACHE_SCOPES.budgets,
      USER_CACHE_SCOPES.budgetSummary,
      USER_CACHE_SCOPES.syncCore,
      USER_CACHE_SCOPES.chatContext,
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
