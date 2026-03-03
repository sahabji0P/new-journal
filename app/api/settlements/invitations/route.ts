import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { broadcastToGroup } from "@/lib/pusher"

function isSchemaOutOfDateError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  )
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function resolveDisplayName(user: { name: string | null; email: string | null }, fallback: string): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

function mapInvitation(invitation: {
  id: string
  groupId: string
  invitedById: string
  invitedEmail: string
  status: string
  createdAt: Date
  respondedAt: Date | null
  group: {
    name: string
  }
  invitedBy: {
    name: string | null
    email: string | null
  }
}) {
  return {
    id: invitation.id,
    groupId: invitation.groupId,
    groupName: invitation.group.name,
    invitedById: invitation.invitedById,
    invitedByName: resolveDisplayName(invitation.invitedBy, "Member"),
    invitedEmail: invitation.invitedEmail,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
    respondedAt: invitation.respondedAt?.toISOString(),
  }
}

async function hasGroupAccess(groupId: string, userId: string) {
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

// GET /api/settlements/invitations - Pending + recent invitations for current user
export async function GET() {
  try {
    const user = await requireAuth()

    const invitations = await prisma.settlementGroupInvitation.findMany({
      where: {
        invitedUserId: user.id,
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(invitations.map(mapInvitation))
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      console.warn("Settlement invitations table not ready yet. Returning empty invitations list.")
      return NextResponse.json([])
    }

    console.error("Error fetching settlement invitations:", error)
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 })
  }
}

// POST /api/settlements/invitations - Invite existing user by email
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const groupId = typeof body.groupId === "string" ? body.groupId : ""
    const rawEmail = typeof body.email === "string" ? body.email : ""
    const normalizedEmail = normalizeEmail(rawEmail)

    if (!groupId || !normalizedEmail) {
      return NextResponse.json({ error: "Group ID and email are required" }, { status: 400 })
    }

    const canInvite = await hasGroupAccess(groupId, user.id)
    if (!canInvite) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const invitedUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
      },
    })

    if (!invitedUser) {
      return NextResponse.json(
        { error: "That email is not registered on this platform" },
        { status: 404 }
      )
    }

    if (invitedUser.id === user.id) {
      return NextResponse.json({ error: "You are already in this group" }, { status: 400 })
    }

    const existingMember = await prisma.settlementGroupMember.findFirst({
      where: {
        groupId,
        userId: invitedUser.id,
      },
      select: {
        id: true,
      },
    })

    if (existingMember) {
      return NextResponse.json({ error: "This user is already a group member" }, { status: 400 })
    }

    const invitation = await prisma.settlementGroupInvitation.upsert({
      where: {
        groupId_invitedUserId: {
          groupId,
          invitedUserId: invitedUser.id,
        },
      },
      update: {
        invitedById: user.id,
        invitedEmail: invitedUser.email || normalizedEmail,
        status: "pending",
        respondedAt: null,
      },
      create: {
        groupId,
        invitedById: user.id,
        invitedUserId: invitedUser.id,
        invitedEmail: invitedUser.email || normalizedEmail,
        status: "pending",
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    await prisma.notification.create({
      data: {
        userId: invitedUser.id,
        type: "info",
        title: "Settlement group invite",
        message: `${resolveDisplayName({ name: user.name || null, email: user.email || null }, "A member")} invited you to join "${invitation.group.name}"`,
        actionLink: "/settlements",
      },
    })

    invalidateUserCache(invitedUser.id, [USER_CACHE_SCOPES.notifications, USER_CACHE_SCOPES.syncCore])

    return NextResponse.json(mapInvitation(invitation), { status: 201 })
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Invitations are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating settlement invitation:", error)
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
  }
}

// PUT /api/settlements/invitations - Respond to invitation (accept/decline)
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const invitationId = typeof body.invitationId === "string" ? body.invitationId : ""
    const action = typeof body.action === "string" ? body.action : ""

    if (!invitationId || (action !== "accept" && action !== "decline")) {
      return NextResponse.json(
        { error: "Invitation ID and valid action are required" },
        { status: 400 }
      )
    }

    const invitation = await prisma.settlementGroupInvitation.findFirst({
      where: {
        id: invitationId,
        invitedUserId: user.id,
      },
      select: {
        id: true,
        groupId: true,
        status: true,
      },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const nextStatus = action === "accept" ? "accepted" : "declined"

    const updatedInvitation = await prisma.$transaction(async (tx) => {
      const updated = await tx.settlementGroupInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: nextStatus,
          respondedAt: new Date(),
        },
        include: {
          group: {
            select: {
              name: true,
            },
          },
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      if (nextStatus === "accepted") {
        await tx.settlementGroupMember.upsert({
          where: {
            groupId_userId: {
              groupId: invitation.groupId,
              userId: user.id,
            },
          },
          create: {
            groupId: invitation.groupId,
            userId: user.id,
            role: "member",
          },
          update: {},
        })
      }

      return updated
    })

    // Create system message when member joins
    if (nextStatus === "accepted") {
      try {
        const userName = user.name || user.email || "A member"
        const sysMessage = await prisma.settlementGroupMessage.create({
          data: {
            groupId: invitation.groupId,
            senderId: user.id,
            type: "system",
            content: `${userName} joined the group`,
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        })

        const messagePayload = {
          id: sysMessage.id,
          groupId: sysMessage.groupId,
          senderId: sysMessage.senderId,
          senderName: userName,
          senderImage: sysMessage.sender.image || undefined,
          type: sysMessage.type,
          content: sysMessage.content,
          createdAt: sysMessage.createdAt.toISOString(),
        }

        await broadcastToGroup(
          invitation.groupId,
          "member-joined",
          messagePayload
        )
      } catch (chatError) {
        console.error("Failed to create system message for join:", chatError)
      }
    }

    return NextResponse.json(mapInvitation(updatedInvitation))
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Invitations are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error responding to settlement invitation:", error)
    return NextResponse.json({ error: "Failed to respond to invitation" }, { status: 500 })
  }
}
