import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

function isSchemaOutOfDateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  )
}

function resolveDisplayName(user: { name: string | null; email: string | null }, fallback: string): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

async function hasGroupAccess(groupId: string, userId: string): Promise<boolean> {
  const membership = await prisma.settlementGroupMember.findFirst({
    where: {
      groupId,
      userId,
    },
    select: {
      id: true,
    },
  })

  return Boolean(membership)
}

// POST /api/settlements/groups/[groupId]/reminders - Send reminder notification to a debtor
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await context.params
    const body = await req.json().catch(() => ({}))
    const toUserId = typeof body.toUserId === "string" ? body.toUserId : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const amount = Number(body.amount)

    if (!toUserId) {
      return NextResponse.json({ error: "Recipient user ID is required" }, { status: 400 })
    }

    if (toUserId === user.id) {
      return NextResponse.json({ error: "Cannot send reminder to yourself" }, { status: 400 })
    }

    const hasAccess = await hasGroupAccess(groupId, user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const [group, sender, recipientMembership] = await Promise.all([
      prisma.settlementGroup.findUnique({
        where: {
          id: groupId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          name: true,
          email: true,
        },
      }),
      prisma.settlementGroupMember.findFirst({
        where: {
          groupId,
          userId: toUserId,
        },
        select: {
          id: true,
        },
      }),
    ])

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (!recipientMembership) {
      return NextResponse.json({ error: "Recipient is not a group member" }, { status: 400 })
    }

    const senderName = resolveDisplayName(
      { name: sender?.name || null, email: sender?.email || null },
      "A group member"
    )

    const amountText =
      Number.isFinite(amount) && amount > 0 ? ` for ${amount.toFixed(2)}` : ""
    const defaultMessage = `${senderName} sent a settlement reminder${amountText} in ${group.name}.`

    const notification = await prisma.notification.create({
      data: {
        userId: toUserId,
        type: "warning",
        title: "Settlement reminder",
        message: message || defaultMessage,
        actionLink: `/settlements?group=${groupId}`,
      },
    })

    invalidateUserCache(toUserId, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json(
      {
        id: notification.id,
        success: true,
      },
      { status: 201 }
    )
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating settlement reminder:", error)
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 })
  }
}
