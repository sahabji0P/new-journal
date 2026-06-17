import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, stableSearchParamsKey, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/receipts - Get all receipts for the user
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const transactionId = searchParams.get('transactionId')

    const where: { userId: string; transactionId?: string } = { userId: user.id }
    if (transactionId) {
      where.transactionId = transactionId
    }

    const formatted = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.receipts,
      keyParts: [stableSearchParamsKey(searchParams)],
      revalidateSeconds: 20,
      loader: async () => {
        const receipts = await prisma.receipt.findMany({
          where,
          orderBy: { createdAt: 'desc' },
        })

        return receipts.map(receipt => ({
          ...receipt,
          imageData: receipt.fileUrl,
          uploadDate: receipt.uploadedAt,
        }))
      },
    })

    return NextResponse.json(formatted)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching receipts:", error)
    return NextResponse.json(
      { error: "Failed to fetch receipts" },
      { status: 500 }
    )
  }
}

// POST /api/receipts - Create a new receipt
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { transactionId, fileName, fileUrl, imageData, fileType, fileSize } = body

    const resolvedFileUrl = fileUrl || imageData

    if (!fileName || !resolvedFileUrl) {
      return NextResponse.json(
        { error: "File name and URL are required" },
        { status: 400 }
      )
    }

    const receipt = await prisma.receipt.create({
      data: {
        userId: user.id,
        transactionId: transactionId || null,
        fileName,
        fileUrl: resolvedFileUrl,
        fileType: fileType || null,
        fileSize: fileSize || null,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.receipts, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({
      ...receipt,
      imageData: receipt.fileUrl,
      uploadDate: receipt.uploadedAt,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating receipt:", error)
    return NextResponse.json(
      { error: "Failed to create receipt" },
      { status: 500 }
    )
  }
}

// DELETE /api/receipts - Delete a receipt
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || body.id

    if (!id) {
      return NextResponse.json(
        { error: "Receipt ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.receipt.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      )
    }

    await prisma.receipt.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.receipts, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting receipt:", error)
    return NextResponse.json(
      { error: "Failed to delete receipt" },
      { status: 500 }
    )
  }
}
