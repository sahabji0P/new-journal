import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { analyzeBillImage } from "@/lib/settlements/bill-analyzer"
import { broadcastToGroup } from "@/lib/pusher"

function resolveDisplayName(
  user: { name: string | null; email: string | null },
  fallback: string
): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

// POST /api/settlements/groups/[groupId]/analyze-bill - Upload and analyze a bill image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params
    const body = await req.json().catch(() => ({}))

    const image = body.image as
      | { mimeType?: string; dataUrl?: string }
      | undefined

    if (!image?.dataUrl) {
      return NextResponse.json(
        { error: "Image data URL is required" },
        { status: 400 }
      )
    }

    // Verify membership
    const membership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: user.id },
      select: { id: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      )
    }

    // Analyze the bill
    const result = await analyzeBillImage(image.dataUrl, image.mimeType)

    if (result.error || result.items.length === 0) {
      // Create a system/bill_analysis message saying we couldn't extract
      const message = await prisma.settlementGroupMessage.create({
        data: {
          groupId,
          senderId: user.id,
          type: "bill_analysis",
          content:
            result.error ||
            "I couldn't detect any splittable items from this image. Try adding the expense manually.",
          metadata: { analysisResult: JSON.parse(JSON.stringify(result)), success: false },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })

      const payload = {
        id: message.id,
        groupId: message.groupId,
        senderId: message.senderId,
        senderName: resolveDisplayName(message.sender, "Member"),
        senderImage: message.sender.image || undefined,
        type: message.type,
        content: message.content,
        metadata: message.metadata,
        createdAt: message.createdAt.toISOString(),
      }

      try {
        await broadcastToGroup(groupId, "new-message", payload)
      } catch (pusherError) {
        console.error("Pusher broadcast failed:", pusherError)
      }

      return NextResponse.json({
        success: false,
        message: payload,
        analysisResult: result,
      })
    }

    // Successful analysis - create a bill_analysis message with the result
    const message = await prisma.settlementGroupMessage.create({
      data: {
        groupId,
        senderId: user.id,
        type: "bill_analysis",
        content: JSON.stringify({
          merchantName: result.merchantName,
          items: result.items,
          total: result.total,
          tax: result.tax,
          subtotal: result.subtotal,
          currency: result.currency,
        }),
        metadata: { analysisResult: JSON.parse(JSON.stringify(result)), success: true },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    const payload = {
      id: message.id,
      groupId: message.groupId,
      senderId: message.senderId,
      senderName: resolveDisplayName(message.sender, "Member"),
      senderImage: message.sender.image || undefined,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt.toISOString(),
    }

    try {
      await broadcastToGroup(groupId, "new-message", payload)
    } catch (pusherError) {
      console.error("Pusher broadcast failed:", pusherError)
    }

    return NextResponse.json({
      success: true,
      message: payload,
      analysisResult: result,
    })
  } catch (error) {
    console.error("Error analyzing bill:", error)
    return NextResponse.json(
      { error: "Failed to analyze bill image" },
      { status: 500 }
    )
  }
}
