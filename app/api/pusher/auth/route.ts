import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { getPusher } from "@/lib/pusher"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.text()
    const params = new URLSearchParams(body)
    const socketId = params.get("socket_id")
    const channelName = params.get("channel_name")

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "socket_id and channel_name are required" },
        { status: 400 }
      )
    }

    // Parse group ID from channel name: private-group-{groupId}
    const match = channelName.match(/^private-group-(.+)$/)
    if (!match) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 403 }
      )
    }

    const groupId = match[1]

    // Verify user is a member of this group
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

    const pusher = getPusher()
    const authResponse = pusher.authorizeChannel(socketId, channelName)

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error("Pusher auth error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}
