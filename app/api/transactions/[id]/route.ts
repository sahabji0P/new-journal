import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

// GET /api/transactions/[id] - Get a specific transaction
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: {
        account: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    )
  }
}

// PATCH /api/transactions/[id] - Update a transaction
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: { account: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Calculate balance adjustment
    const oldAmount = transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount
    const newAmount = (body.type || transaction.type) === 'income'
      ? (body.amount || transaction.amount)
      : -(body.amount || transaction.amount)

    const balanceChange = newAmount - (-oldAmount)

    // Update transaction
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
      },
    })

    // Update account balance if amount or type changed
    if (body.amount !== undefined || body.type !== undefined) {
      await prisma.financialAccount.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.id },
      include: { account: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    // Reverse the balance change
    const balanceChange = transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount

    await prisma.financialAccount.update({
      where: { id: transaction.accountId },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    })

    await prisma.transaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    )
  }
}
