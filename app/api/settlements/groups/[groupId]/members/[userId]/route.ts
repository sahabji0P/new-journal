import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { broadcastToGroup } from "@/lib/pusher"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

function resolveDisplayName(
  user: { name: string | null; email: string | null },
  fallback: string
): string {
  return user.name?.trim() || user.email?.trim() || fallback
}

// DELETE /api/settlements/groups/[groupId]/members/[userId] - Remove a member or leave a group
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  try {
    const caller = await requireAuth()
    const { groupId, userId: targetUserId } = await params

    // Verify caller is a group member
    const callerMembership = await prisma.settlementGroupMember.findFirst({
      where: { groupId, userId: caller.id },
      select: { id: true, role: true },
    })

    if (!callerMembership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 })
    }

    const isSelf = targetUserId === caller.id

    if (isSelf) {
      // Leave group mode
      if (callerMembership.role === "owner") {
        return NextResponse.json(
          { error: "Group owner cannot leave the group. Transfer ownership or delete the group instead." },
          { status: 400 }
        )
      }

      // Find the target member record (self)
      const targetMembership = await prisma.settlementGroupMember.findFirst({
        where: { groupId, userId: targetUserId },
        select: { id: true },
      })

      if (!targetMembership) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
      }

      // Fetch target user info for system message
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, email: true },
      })

      const targetName = resolveDisplayName(
        { name: targetUser?.name ?? null, email: targetUser?.email ?? null },
        "A member"
      )

      // Delete membership
      await prisma.settlementGroupMember.delete({
        where: { id: targetMembership.id },
      })

      // Collect remaining member userIds for cache invalidation
      const remainingMembers = await prisma.settlementGroupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })

      const systemContent = `${targetName} left the group`

      // Create system message
      try {
        await prisma.settlementGroupMessage.create({
          data: {
            groupId,
            senderId: caller.id,
            type: "system",
            content: systemContent,
          },
        })
      } catch (msgError) {
        console.error("Failed to create system message for member leaving:", msgError)
      }

      // Broadcast via Pusher (non-critical)
      try {
        await broadcastToGroup(groupId, "member-left", {
          userId: targetUserId,
          name: targetName,
          content: systemContent,
        })
      } catch (pusherError) {
        console.error("Pusher broadcast failed:", pusherError)
      }

      // Invalidate cache for removed user and remaining members
      invalidateUserCache(targetUserId, [USER_CACHE_SCOPES.syncAdvanced])
      for (const member of remainingMembers) {
        invalidateUserCache(member.userId, [USER_CACHE_SCOPES.syncAdvanced])
      }

      return NextResponse.json({ success: true })
    } else {
      // Remove member mode — caller must be owner
      if (callerMembership.role !== "owner") {
        return NextResponse.json(
          { error: "Only the group owner can remove other members" },
          { status: 403 }
        )
      }

      // Find the target member record
      const targetMembership = await prisma.settlementGroupMember.findFirst({
        where: { groupId, userId: targetUserId },
        select: { id: true },
      })

      if (!targetMembership) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 })
      }

      // Fetch target user info for system message
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true, email: true },
      })

      const targetName = resolveDisplayName(
        { name: targetUser?.name ?? null, email: targetUser?.email ?? null },
        "A member"
      )

      // Delete membership
      await prisma.settlementGroupMember.delete({
        where: { id: targetMembership.id },
      })

      // Collect remaining member userIds for cache invalidation
      const remainingMembers = await prisma.settlementGroupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })

      const systemContent = `${targetName} was removed`

      // Create system message
      try {
        await prisma.settlementGroupMessage.create({
          data: {
            groupId,
            senderId: caller.id,
            type: "system",
            content: systemContent,
          },
        })
      } catch (msgError) {
        console.error("Failed to create system message for member removal:", msgError)
      }

      // Broadcast via Pusher (non-critical)
      try {
        await broadcastToGroup(groupId, "member-removed", {
          userId: targetUserId,
          name: targetName,
          content: systemContent,
        })
      } catch (pusherError) {
        console.error("Pusher broadcast failed:", pusherError)
      }

      // Invalidate cache for removed user and remaining members
      invalidateUserCache(targetUserId, [USER_CACHE_SCOPES.syncAdvanced])
      for (const member of remainingMembers) {
        invalidateUserCache(member.userId, [USER_CACHE_SCOPES.syncAdvanced])
      }

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error("Error removing group member:", error)
    return NextResponse.json({ error: "Failed to remove group member" }, { status: 500 })
  }
}
