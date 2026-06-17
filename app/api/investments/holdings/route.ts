import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/holdings - Get all investments for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const investments = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.investmentsHoldings,
      revalidateSeconds: 20,
      loader: async () => prisma.investment.findMany({
        where: { userId: user.id },
        include: { member: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(investments)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching investments:", error)
    return NextResponse.json(
      { error: "Failed to fetch investments" },
      { status: 500 }
    )
  }
}

// POST /api/investments/holdings - Create a new investment
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      memberId, name, type, institution, investedAmount, currentValue,
      startDate, maturityDate, interestRate, status,
      // Mutual Fund fields
      folioNumber, sipAmount, sipDay, sipFrequency, fundCategory,
      // Stock fields
      ticker, quantity, buyPrice, dematAccount, broker,
      // FD / RD / PPF fields
      accountNumber, compoundingFreq, autoRenew,
      // NPS / EPF fields
      pranNumber, uanNumber,
      // Gold fields
      goldForm, weightGrams, purity,
      // Real Estate fields
      propertyAddress, propertyArea, registrationNo,
      // Common
      nominee, taxSection, portfolioGroup, tags, notes, color,
    } = body

    if (!memberId || !name || !type || !institution) {
      return NextResponse.json(
        { error: "Member, name, type, and institution are required" },
        { status: 400 }
      )
    }

    const investment = await prisma.investment.create({
      data: {
        userId: user.id,
        memberId,
        name,
        type,
        institution,
        investedAmount: investedAmount || 0,
        currentValue: currentValue || 0,
        startDate: new Date(startDate),
        maturityDate: maturityDate ? new Date(maturityDate) : undefined,
        interestRate,
        status,
        folioNumber,
        sipAmount,
        sipDay,
        sipFrequency,
        fundCategory,
        ticker,
        quantity,
        buyPrice,
        dematAccount,
        broker,
        accountNumber,
        compoundingFreq,
        autoRenew,
        pranNumber,
        uanNumber,
        goldForm,
        weightGrams,
        purity,
        propertyAddress,
        propertyArea,
        registrationNo,
        nominee,
        taxSection,
        portfolioGroup,
        tags,
        notes,
        color,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.investmentsHoldings])

    return NextResponse.json(investment, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating investment:", error)
    return NextResponse.json(
      { error: "Failed to create investment" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/holdings - Update an investment
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Investment ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.investment.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      )
    }

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }
    if (updateData.maturityDate) {
      updateData.maturityDate = new Date(updateData.maturityDate)
    }

    const investment = await prisma.investment.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.investmentsHoldings])

    return NextResponse.json(investment)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating investment:", error)
    return NextResponse.json(
      { error: "Failed to update investment" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/holdings - Delete an investment
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Investment ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.investment.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      )
    }

    await prisma.investment.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.investmentsHoldings])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting investment:", error)
    return NextResponse.json(
      { error: "Failed to delete investment" },
      { status: 500 }
    )
  }
}
