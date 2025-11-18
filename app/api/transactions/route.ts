import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/transactions - Get all transactions for the user with optional filters
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const accountId = searchParams.get('accountId')
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: { userId: string; accountId?: string; category?: string; type?: string; date?: { gte?: Date; lte?: Date } } = { userId: user.id }

    if (accountId) where.accountId = accountId
    if (category) where.category = category
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      description,
      amount,
      date,
      category,
      type,
      accountId,
      party,
      notes,
      tags,
      recurringId,
    } = body

    if (!description || !amount || !date || !category || !type || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        description,
        amount,
        date: new Date(date),
        category,
        type,
        accountId,
        party,
        notes,
        tags: tags || [],
        recurringId,
      },
    })

    // Update account balance
    const newBalance = type === 'income'
      ? account.balance + amount
      : account.balance - amount

    await prisma.financialAccount.update({
      where: { id: accountId },
      data: { balance: newBalance },
    })

    // Auto-create party if new
    if (party) {
      await prisma.party.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: party,
          },
        },
        create: {
          userId: user.id,
          name: party,
        },
        update: {},
      })
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}
