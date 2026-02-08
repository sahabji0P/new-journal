import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

function normalizeTransactionAmount(amount: number, type: string): number {
  const absAmount = Math.abs(amount)
  return type === "expense" ? -absAmount : absAmount
}

function parseAmount(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

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
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const limit = limitParam ? Number.parseInt(limitParam, 10) : null
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0

    const where: {
      userId: string
      accountId?: string
      category?: string
      type?: string
      date?: { gte?: Date; lte?: Date }
    } = { userId: user.id }

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
      ...(limit && limit > 0 ? { take: limit + 1, skip: Math.max(0, offset) } : {}),
    })

    const formatted = transactions.map(transaction => {
      const { account, ...rest } = transaction
      return {
        ...rest,
        accountName: account.name,
      }
    })

    if (limit && limit > 0) {
      const hasMore = formatted.length > limit
      const items = hasMore ? formatted.slice(0, limit) : formatted
      const nextOffset = hasMore ? Math.max(0, offset) + limit : null

      return NextResponse.json({
        items,
        hasMore,
        nextOffset,
      })
    }

    return NextResponse.json(formatted)
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

    if (!description || amount === undefined || !date || !category || !type || !accountId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      )
    }

    const parsedAmount = parseAmount(amount)
    if (parsedAmount === null || parsedAmount === 0) {
      return NextResponse.json(
        { error: "Amount must be a valid non-zero number" },
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

    const normalizedAmount = normalizeTransactionAmount(parsedAmount, type)

    const transaction = await prisma.$transaction(async tx => {
      const created = await tx.transaction.create({
        data: {
          userId: user.id,
          description,
          amount: normalizedAmount,
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

      await tx.financialAccount.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: normalizedAmount,
          },
        },
      })

      if (party && party.trim()) {
        await tx.party.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: party.trim(),
            },
          },
          create: {
            userId: user.id,
            name: party.trim(),
          },
          update: {},
        })
      }

      return created
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    )
  }
}

// PUT /api/transactions - Update a transaction
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const nextType = updateData.type ?? existingTransaction.type
    if (nextType !== 'income' && nextType !== 'expense') {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      )
    }

    let nextAmount = existingTransaction.amount
    if (updateData.amount !== undefined) {
      const parsedAmount = parseAmount(updateData.amount)
      if (parsedAmount === null || parsedAmount === 0) {
        return NextResponse.json(
          { error: "Amount must be a valid non-zero number" },
          { status: 400 }
        )
      }
      nextAmount = normalizeTransactionAmount(parsedAmount, nextType)
    } else if (nextType !== existingTransaction.type) {
      nextAmount = normalizeTransactionAmount(existingTransaction.amount, nextType)
    }

    const nextAccountId = updateData.accountId ?? existingTransaction.accountId

    if (nextAccountId !== existingTransaction.accountId) {
      const nextAccount = await prisma.financialAccount.findFirst({
        where: { id: nextAccountId, userId: user.id },
      })

      if (!nextAccount) {
        return NextResponse.json(
          { error: "New account not found" },
          { status: 404 }
        )
      }
    }

    const updatedTransaction = await prisma.$transaction(async tx => {
      await tx.financialAccount.update({
        where: { id: existingTransaction.accountId },
        data: {
          balance: {
            decrement: existingTransaction.amount,
          },
        },
      })

      await tx.financialAccount.update({
        where: { id: nextAccountId },
        data: {
          balance: {
            increment: nextAmount,
          },
        },
      })

      const dataToUpdate: {
        description?: string
        amount?: number
        date?: Date
        category?: string
        type?: string
        accountId?: string
        party?: string | null
        notes?: string | null
        tags?: string[]
        recurringId?: string | null
      } = {}

      if (updateData.description !== undefined) dataToUpdate.description = updateData.description
      dataToUpdate.amount = nextAmount
      if (updateData.date !== undefined) dataToUpdate.date = new Date(updateData.date)
      if (updateData.category !== undefined) dataToUpdate.category = updateData.category
      dataToUpdate.type = nextType
      dataToUpdate.accountId = nextAccountId
      if (updateData.party !== undefined) dataToUpdate.party = updateData.party
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes
      if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags
      if (updateData.recurringId !== undefined) dataToUpdate.recurringId = updateData.recurringId

      const updated = await tx.transaction.update({
        where: { id },
        data: dataToUpdate,
      })

      const partyValue = updateData.party
      if (typeof partyValue === "string" && partyValue.trim()) {
        await tx.party.upsert({
          where: {
            userId_name: {
              userId: user.id,
              name: partyValue.trim(),
            },
          },
          create: {
            userId: user.id,
            name: partyValue.trim(),
          },
          update: {},
        })
      }

      return updated
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions - Delete a transaction
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    const account = await prisma.financialAccount.findFirst({
      where: { id: transaction.accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async tx => {
      await tx.financialAccount.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount,
          },
        },
      })

      await tx.transaction.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
