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

    // Find the existing transaction and verify ownership
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Get the current account
    const currentAccount = await prisma.financialAccount.findFirst({
      where: { id: existingTransaction.accountId, userId: user.id },
    })

    if (!currentAccount) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Check if amount or type is changing
    const newAmount = updateData.amount !== undefined ? updateData.amount : existingTransaction.amount
    const newType = updateData.type !== undefined ? updateData.type : existingTransaction.type
    const newAccountId = updateData.accountId !== undefined ? updateData.accountId : existingTransaction.accountId

    // Calculate balance adjustments if amount, type, or account changes
    const amountOrTypeChanged =
      newAmount !== existingTransaction.amount ||
      newType !== existingTransaction.type ||
      newAccountId !== existingTransaction.accountId

    if (amountOrTypeChanged) {
      // Reverse the old transaction's effect on the old account
      const oldBalanceChange = existingTransaction.type === 'income'
        ? -existingTransaction.amount
        : existingTransaction.amount

      await prisma.financialAccount.update({
        where: { id: existingTransaction.accountId },
        data: { balance: currentAccount.balance + oldBalanceChange },
      })

      // Apply the new transaction's effect
      let targetAccount = currentAccount
      if (newAccountId !== existingTransaction.accountId) {
        // If account changed, get the new account
        const newAccount = await prisma.financialAccount.findFirst({
          where: { id: newAccountId, userId: user.id },
        })

        if (!newAccount) {
          return NextResponse.json(
            { error: "New account not found" },
            { status: 404 }
          )
        }
        targetAccount = newAccount
      } else {
        // Refresh the current account balance after reversal
        const refreshedAccount = await prisma.financialAccount.findFirst({
          where: { id: existingTransaction.accountId },
        })
        if (refreshedAccount) {
          targetAccount = refreshedAccount
        }
      }

      const newBalanceChange = newType === 'income'
        ? newAmount
        : -newAmount

      await prisma.financialAccount.update({
        where: { id: newAccountId },
        data: { balance: targetAccount.balance + newBalanceChange },
      })
    }

    // Prepare update data
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
    if (updateData.amount !== undefined) dataToUpdate.amount = updateData.amount
    if (updateData.date !== undefined) dataToUpdate.date = new Date(updateData.date)
    if (updateData.category !== undefined) dataToUpdate.category = updateData.category
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type
    if (updateData.accountId !== undefined) dataToUpdate.accountId = updateData.accountId
    if (updateData.party !== undefined) dataToUpdate.party = updateData.party
    if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes
    if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags
    if (updateData.recurringId !== undefined) dataToUpdate.recurringId = updateData.recurringId

    // Update the transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: dataToUpdate,
    })

    // Auto-create party if new
    if (updateData.party) {
      await prisma.party.upsert({
        where: {
          userId_name: {
            userId: user.id,
            name: updateData.party,
          },
        },
        create: {
          userId: user.id,
          name: updateData.party,
        },
        update: {},
      })
    }

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

    // Find the transaction and verify ownership
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Get the account to update balance
    const account = await prisma.financialAccount.findFirst({
      where: { id: transaction.accountId, userId: user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Reverse the balance change
    const balanceAdjustment = transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount

    await prisma.financialAccount.update({
      where: { id: transaction.accountId },
      data: { balance: account.balance + balanceAdjustment },
    })

    // Delete the transaction
    await prisma.transaction.delete({
      where: { id },
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
