import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/insurance - Get all insurance policies for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const policies = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.insurancePolicies,
      revalidateSeconds: 20,
      loader: async () => prisma.insurancePolicy.findMany({
        where: { userId: user.id },
        include: {
          member: { select: { name: true } },
          premiumPayments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error("Error fetching insurance policies:", error)
    return NextResponse.json(
      { error: "Failed to fetch insurance policies" },
      { status: 500 }
    )
  }
}

// POST /api/investments/insurance - Create a new insurance policy
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      memberId, name, type, insurer, policyNumber,
      premiumAmount, premiumFrequency, sumAssured,
      startDate, endDate, nextPremiumDate, status,
      nominee, nomineeRelation, taxSection, riders,
      coveredMembers, linkedVehicleId, linkedDeviceId,
      claimHistory, agentName, agentPhone, tags, notes,
    } = body

    if (!memberId || !name || !type || !insurer || !policyNumber) {
      return NextResponse.json(
        { error: "Member, name, type, insurer, and policy number are required" },
        { status: 400 }
      )
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        userId: user.id,
        memberId,
        name,
        type,
        insurer,
        policyNumber,
        premiumAmount: premiumAmount || 0,
        premiumFrequency: premiumFrequency || "yearly",
        sumAssured: sumAssured || 0,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        nextPremiumDate: nextPremiumDate ? new Date(nextPremiumDate) : undefined,
        status,
        nominee,
        nomineeRelation,
        taxSection,
        riders,
        coveredMembers,
        linkedVehicleId,
        linkedDeviceId,
        claimHistory,
        agentName,
        agentPhone,
        tags,
        notes,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.insurancePolicies])

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error("Error creating insurance policy:", error)
    return NextResponse.json(
      { error: "Failed to create insurance policy" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/insurance - Update an insurance policy
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Policy ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.insurancePolicy.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance policy not found" },
        { status: 404 }
      )
    }

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate)
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate)
    }
    if (updateData.nextPremiumDate) {
      updateData.nextPremiumDate = new Date(updateData.nextPremiumDate)
    }

    const policy = await prisma.insurancePolicy.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.insurancePolicies])

    return NextResponse.json(policy)
  } catch (error) {
    console.error("Error updating insurance policy:", error)
    return NextResponse.json(
      { error: "Failed to update insurance policy" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/insurance - Delete an insurance policy (cascades premium payments)
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Policy ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.insurancePolicy.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Insurance policy not found" },
        { status: 404 }
      )
    }

    await prisma.insurancePolicy.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [
      USER_CACHE_SCOPES.insurancePolicies,
      USER_CACHE_SCOPES.premiumPayments,
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting insurance policy:", error)
    return NextResponse.json(
      { error: "Failed to delete insurance policy" },
      { status: 500 }
    )
  }
}
