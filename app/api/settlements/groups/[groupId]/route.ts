import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// DELETE /api/settlements/groups/[groupId] - Delete a settlement group (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await requireAuth()
    const { groupId } = await params

    // Verify caller is the group owner
    const ownerMembership = await prisma.settlementGroupMember.findFirst({
      where: {
        groupId,
        userId: user.id,
        role: "owner",
      },
      select: { id: true },
    })

    if (!ownerMembership) {
      // Check if the group exists at all to give the right error
      const anyMembership = await prisma.settlementGroupMember.findFirst({
        where: { groupId, userId: user.id },
        select: { id: true },
      })

      if (!anyMembership) {
        const group = await prisma.settlementGroup.findUnique({
          where: { id: groupId },
          select: { id: true },
        })
        if (!group) {
          return NextResponse.json({ error: "Group not found" }, { status: 404 })
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      return NextResponse.json({ error: "Only the group owner can delete this group" }, { status: 403 })
    }

    // Collect all member userIds before deletion (for cache invalidation)
    const members = await prisma.settlementGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })

    const memberUserIds = members.map((m) => m.userId)

    // Delete the group — cascade handles children (members, transactions, messages, etc.)
    await prisma.settlementGroup.delete({
      where: { id: groupId },
    })

    // Invalidate cache for all former members
    for (const memberId of memberUserIds) {
      invalidateUserCache(memberId, [USER_CACHE_SCOPES.syncAdvanced])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting settlement group:", error)
    return NextResponse.json({ error: "Failed to delete settlement group" }, { status: 500 })
  }
}
