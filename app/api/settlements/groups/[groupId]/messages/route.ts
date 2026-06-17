import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { broadcastToGroup } from "@/lib/pusher"
import {
  invalidateUserCache,
  USER_CACHE_SCOPES,
} from "@/lib/server-cache"

function resolveDisplayName(
  user: { name: string | null; email: string | null },
  fallback: string
): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

// GET /api/settlements/groups/[groupId]/messages - Fetch paginated messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params
    const searchParams = req.nextUrl.searchParams
    const cursor = searchParams.get("cursor")
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)

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

    const messages = await prisma.settlementGroupMessage.findMany({
      where: {
        groupId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
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

    const hasMore = messages.length > limit
    const sliced = hasMore ? messages.slice(0, limit) : messages

    const formatted = sliced.map((msg) => ({
      id: msg.id,
      groupId: msg.groupId,
      senderId: msg.senderId,
      senderName: resolveDisplayName(msg.sender, "Member"),
      senderImage: msg.sender.image || undefined,
      type: msg.type,
      content: msg.content,
      transactionId: msg.transactionId || undefined,
      metadata: msg.metadata || undefined,
      createdAt: msg.createdAt.toISOString(),
    }))

    return NextResponse.json({
      messages: formatted,
      hasMore,
      nextCursor: hasMore
        ? sliced[sliced.length - 1].createdAt.toISOString()
        : null,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching group messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// POST /api/settlements/groups/[groupId]/messages - Send a text message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params
    const body = await req.json().catch(() => ({}))
    const content =
      typeof body.content === "string" ? body.content.trim() : ""

    if (!content) {
      return NextResponse.json(
        { error: "Message content is required" },
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

    const message = await prisma.settlementGroupMessage.create({
      data: {
        groupId,
        senderId: user.id,
        type: "text",
        content,
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
      createdAt: message.createdAt.toISOString(),
    }

    // Broadcast via Pusher
    try {
      await broadcastToGroup(groupId, "new-message", payload)
    } catch (pusherError) {
      console.error("Pusher broadcast failed:", pusherError)
    }

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.settlementGroupMessages])

    return NextResponse.json(payload, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error sending group message:", error)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
