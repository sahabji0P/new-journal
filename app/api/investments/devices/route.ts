import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/devices - Get all devices for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const devices = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.devices,
      revalidateSeconds: 20,
      loader: async () => prisma.device.findMany({
        where: { userId: user.id },
        include: { member: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(devices)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching devices:", error)
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    )
  }
}

// POST /api/investments/devices - Create a new device
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      memberId, name, category, brand, model: deviceModel,
      serialNumber, imeiNumber, purchaseDate, purchasePrice,
      purchaseStore, warrantyEndDate, extWarrantyEnd,
      linkedInsuranceId, status, specs, repairHistory,
      tags, notes,
    } = body

    if (!memberId || !name || !category || !brand || !deviceModel) {
      return NextResponse.json(
        { error: "Member, name, category, brand, and model are required" },
        { status: 400 }
      )
    }

    const device = await prisma.device.create({
      data: {
        userId: user.id,
        memberId,
        name,
        category,
        brand,
        model: deviceModel,
        serialNumber,
        imeiNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchasePrice,
        purchaseStore,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : undefined,
        extWarrantyEnd: extWarrantyEnd ? new Date(extWarrantyEnd) : undefined,
        linkedInsuranceId,
        status,
        specs,
        repairHistory,
        tags,
        notes,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.devices])

    return NextResponse.json(device, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating device:", error)
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/devices - Update a device
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.device.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate)
    }
    if (updateData.warrantyEndDate) {
      updateData.warrantyEndDate = new Date(updateData.warrantyEndDate)
    }
    if (updateData.extWarrantyEnd) {
      updateData.extWarrantyEnd = new Date(updateData.extWarrantyEnd)
    }

    const device = await prisma.device.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.devices])

    return NextResponse.json(device)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating device:", error)
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/devices - Delete a device
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.device.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    await prisma.device.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.devices])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting device:", error)
    return NextResponse.json(
      { error: "Failed to delete device" },
      { status: 500 }
    )
  }
}
