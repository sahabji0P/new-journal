import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, stableSearchParamsKey, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/notifications - Get all notifications for the user
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const notifications = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.notifications,
      keyParts: [stableSearchParamsKey(searchParams)],
      revalidateSeconds: 15,
      loader: async () => prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { type, title, message, actionLink } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Type, title, and message are required" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title,
        message,
        actionLink,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications/mark-read - Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      )
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    )
  }
}

// PUT /api/notifications - Mark a single notification as read
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { id, isRead } = body

    if (!id || isRead !== true) {
      return NextResponse.json(
        { error: "id and isRead=true are required" },
        { status: 400 }
      )
    }

    await prisma.notification.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating notification:", error)
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))

    const { id, all } = body

    if (all === true) {
      await prisma.notification.deleteMany({
        where: { userId: user.id },
      })
      invalidateUserCache(user.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])
      return NextResponse.json({ success: true })
    }

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.notification.findUnique({
      where: { id },
    })

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}
