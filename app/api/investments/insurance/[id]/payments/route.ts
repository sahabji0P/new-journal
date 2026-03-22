import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/insurance/[id]/payments - Get all premium payments for a policy
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify the policy belongs to the user
    const policy = await prisma.insurancePolicy.findFirst({
      where: { id, userId: user.id },
    })

    if (!policy) {
      return NextResponse.json(
        { error: "Insurance policy not found" },
        { status: 404 }
      )
    }

    const payments = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.premiumPayments,
      keyParts: ["policy", id],
      revalidateSeconds: 20,
      loader: async () => prisma.premiumPayment.findMany({
        where: { policyId: id },
        orderBy: { dueDate: 'desc' },
      }),
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching premium payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch premium payments" },
      { status: 500 }
    )
  }
}

// POST /api/investments/insurance/[id]/payments - Create a new premium payment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    // Verify the policy belongs to the user
    const policy = await prisma.insurancePolicy.findFirst({
      where: { id, userId: user.id },
    })

    if (!policy) {
      return NextResponse.json(
        { error: "Insurance policy not found" },
        { status: 404 }
      )
    }

    const {
      amount, dueDate, paidDate, status,
      paymentMode, referenceNo, notes,
    } = body

    if (!amount || !dueDate) {
      return NextResponse.json(
        { error: "Amount and due date are required" },
        { status: 400 }
      )
    }

    const payment = await prisma.premiumPayment.create({
      data: {
        policyId: id,
        amount,
        dueDate: new Date(dueDate),
        paidDate: paidDate ? new Date(paidDate) : undefined,
        status,
        paymentMode,
        referenceNo,
        notes,
      },
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.premiumPayments,
      USER_CACHE_SCOPES.insurancePolicies,
    ])

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error creating premium payment:", error)
    return NextResponse.json(
      { error: "Failed to create premium payment" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/insurance/[id]/payments - Update a premium payment
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const { paymentId, ...updateData } = body

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Verify the policy belongs to the user
    const policy = await prisma.insurancePolicy.findFirst({
      where: { id, userId: user.id },
    })

    if (!policy) {
      return NextResponse.json(
        { error: "Insurance policy not found" },
        { status: 404 }
      )
    }

    // Verify the payment belongs to this policy
    const existing = await prisma.premiumPayment.findFirst({
      where: { id: paymentId, policyId: id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Premium payment not found" },
        { status: 404 }
      )
    }

    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate)
    }
    if (updateData.paidDate) {
      updateData.paidDate = new Date(updateData.paidDate)
    }

    const payment = await prisma.premiumPayment.update({
      where: { id: paymentId },
      data: updateData,
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.premiumPayments,
      USER_CACHE_SCOPES.insurancePolicies,
    ])

    return NextResponse.json(payment)
  } catch (error) {
    console.error("Error updating premium payment:", error)
    return NextResponse.json(
      { error: "Failed to update premium payment" },
      { status: 500 }
    )
  }
}
