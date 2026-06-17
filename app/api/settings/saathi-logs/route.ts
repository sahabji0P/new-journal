import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, USER_CACHE_SCOPES } from "@/lib/server-cache"
import { inferSaathiLogOperation, inferSaathiLogResource, getMatchingCardDetailsForLog, type SaathiLogOperation } from "@/lib/saathi/audit-log"
import { SaathiAssistantMetadataSchema } from "@/lib/saathi/schema"

interface SaathiLogEntry {
  id: string
  timestamp: string
  tool: string
  operation: SaathiLogOperation
  resource: string
  status: "success" | "error"
  summary: string
  userRequest: string
  details: string[]
}

// GET /api/settings/saathi-logs - Get Saathi operation logs
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "120", 10)
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 300)
      : 120
    const messageTake = Math.min(Math.max(limit * 8, 120), 1000)

    const logs = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.chatHistory,
      keyParts: [`saathi-logs:v2:limit=${limit}`],
      revalidateSeconds: 10,
      loader: async () => {
        try {
          const persistedLogs = await prisma.saathiAuditLog.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: limit,
            select: {
              id: true,
              createdAt: true,
              tool: true,
              operation: true,
              resource: true,
              status: true,
              summary: true,
              userRequest: true,
              details: true,
            },
          })

          if (persistedLogs.length > 0) {
            return persistedLogs.map(item => ({
              id: item.id,
              timestamp: item.createdAt.toISOString(),
              tool: item.tool,
              operation: item.operation as SaathiLogOperation,
              resource: item.resource,
              status: item.status === "error" ? "error" : "success",
              summary: item.summary,
              userRequest: item.userRequest,
              details: Array.isArray(item.details)
                ? item.details.filter((detail): detail is string => typeof detail === "string")
                : [],
            }))
          }
        } catch (error) {
          if (error instanceof AuthError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
          }
          console.warn("Saathi audit table not available yet. Falling back to legacy chat-metadata logs.", error)
        }

        const messagesDesc = await prisma.chatMessage.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: messageTake,
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        })

        const messages = messagesDesc.reverse()
        let latestUserRequest = ""
        const entries: SaathiLogEntry[] = []

        for (const message of messages) {
          if (message.role === "user") {
            latestUserRequest = message.content.trim()
            continue
          }

          if (message.role !== "assistant") continue

          const parsedMetadata = SaathiAssistantMetadataSchema.safeParse(message.metadata)
          if (!parsedMetadata.success || parsedMetadata.data.executedTools.length === 0) continue

          const metadata = parsedMetadata.data

          metadata.executedTools.forEach((execution, index) => {
            const operation = inferSaathiLogOperation(execution.tool)
            const resource = inferSaathiLogResource(execution.tool)
            const details = getMatchingCardDetailsForLog(metadata.cards, operation, resource)

            entries.push({
              id: `${message.id}:${index}`,
              timestamp: message.createdAt.toISOString(),
              tool: execution.tool,
              operation,
              resource,
              status: execution.status,
              summary: execution.summary,
              userRequest: latestUserRequest || "No user request captured",
              details,
            })
          })
        }

        return entries.reverse().slice(0, limit)
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching Saathi logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch Saathi logs" },
      { status: 500 }
    )
  }
}
