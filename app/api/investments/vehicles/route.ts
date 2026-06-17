import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/vehicles - Get all vehicles for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const vehicles = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.vehicles,
      revalidateSeconds: 20,
      loader: async () => prisma.vehicle.findMany({
        where: { userId: user.id },
        include: { member: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching vehicles:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}

// POST /api/investments/vehicles - Create a new vehicle
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      memberId, name, type, make, vehicleModel, variant,
      year, color, fuelType, registrationNo, chassisNumber,
      engineNumber, purchaseDate, purchasePrice, showroomName,
      loanAmount, emiAmount, loanEndDate, linkedInsuranceId,
      pucExpiryDate, fitnessExpiry, status, currentOdometer,
      serviceHistory, fuelLog, tags, notes,
    } = body

    if (!memberId || !name || !type || !make || !vehicleModel || !year || !registrationNo) {
      return NextResponse.json(
        { error: "Member, name, type, make, model, year, and registration number are required" },
        { status: 400 }
      )
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        memberId,
        name,
        type,
        make,
        vehicleModel,
        variant,
        year,
        color,
        fuelType,
        registrationNo,
        chassisNumber,
        engineNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchasePrice,
        showroomName,
        loanAmount,
        emiAmount,
        loanEndDate: loanEndDate ? new Date(loanEndDate) : undefined,
        linkedInsuranceId,
        pucExpiryDate: pucExpiryDate ? new Date(pucExpiryDate) : undefined,
        fitnessExpiry: fitnessExpiry ? new Date(fitnessExpiry) : undefined,
        status,
        currentOdometer,
        serviceHistory,
        fuelLog,
        tags,
        notes,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.vehicles])

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating vehicle:", error)
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/vehicles - Update a vehicle
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate)
    }
    if (updateData.loanEndDate) {
      updateData.loanEndDate = new Date(updateData.loanEndDate)
    }
    if (updateData.pucExpiryDate) {
      updateData.pucExpiryDate = new Date(updateData.pucExpiryDate)
    }
    if (updateData.fitnessExpiry) {
      updateData.fitnessExpiry = new Date(updateData.fitnessExpiry)
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.vehicles])

    return NextResponse.json(vehicle)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating vehicle:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/vehicles - Delete a vehicle
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.vehicle.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    await prisma.vehicle.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.vehicles])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting vehicle:", error)
    return NextResponse.json(
      { error: "Failed to delete vehicle" },
      { status: 500 }
    )
  }
}
