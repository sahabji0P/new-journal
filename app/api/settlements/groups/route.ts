import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"

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

type StoredShare = {
  userId: string
  name: string
  amount: number
  isPaid: boolean
  paidAt?: string
}

function parseStoredShares(input: unknown): StoredShare[] {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null
      const candidate = entry as Record<string, unknown>
      const amount = Number(candidate.amount)

      if (typeof candidate.userId !== "string" || !Number.isFinite(amount)) {
        return null
      }

      return {
        userId: candidate.userId,
        name: typeof candidate.name === "string" ? candidate.name : "Member",
        amount,
        isPaid: Boolean(candidate.isPaid),
        ...(typeof candidate.paidAt === "string" ? { paidAt: candidate.paidAt } : {}),
      }
    })
    .filter((share): share is StoredShare => share !== null)
}

type SettlementGroupPayload = Prisma.SettlementGroupGetPayload<{
  include: {
    createdBy: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    members: {
      orderBy: {
        createdAt: "asc"
      }
      include: {
        user: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
    transactions: {
      orderBy: {
        createdAt: "desc"
      }
      include: {
        paidBy: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
  }
}>

function mapGroup(group: SettlementGroupPayload) {
  return {
    id: group.id,
    name: group.name,
    description: group.description || undefined,
    createdById: group.createdById,
    createdByName: resolveDisplayName(group.createdBy, "Creator"),
    members: group.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: resolveDisplayName(member.user, "Member"),
      email: member.user.email || "",
      role: member.role,
      joinedAt: member.createdAt.toISOString(),
    })),
    transactions: group.transactions.map((transaction) => ({
      id: transaction.id,
      groupId: transaction.groupId,
      description: transaction.description,
      totalAmount: transaction.totalAmount,
      paidByUserId: transaction.paidByUserId,
      paidByName: resolveDisplayName(transaction.paidBy, "Member"),
      shares: parseStoredShares(transaction.splitData),
      notes: transaction.notes || undefined,
      createdAt: transaction.createdAt.toISOString(),
    })),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

async function fetchGroupsForUser(userId: string) {
  const groups = await prisma.settlementGroup.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          paidBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return groups.map(mapGroup)
}

// GET /api/settlements/groups - List groups where user is a member
export async function GET() {
  try {
    const user = await requireAuth()
    const groups = await fetchGroupsForUser(user.id)
    return NextResponse.json(groups)
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      console.warn("Settlement groups table not ready yet. Returning empty groups list.")
      return NextResponse.json([])
    }

    console.error("Error fetching settlement groups:", error)
    return NextResponse.json({ error: "Failed to fetch settlement groups" }, { status: 500 })
  }
}

// POST /api/settlements/groups - Create a new settlement group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    const createdGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.settlementGroup.create({
        data: {
          name,
          description: description || null,
          createdById: user.id,
        },
      })

      await tx.settlementGroupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
          role: "owner",
        },
      })

      return group
    })

    const groups = await fetchGroupsForUser(user.id)
    const created = groups.find((group) => group.id === createdGroup.id)

    return NextResponse.json(created || null, { status: 201 })
  } catch (error) {
    if (isSchemaOutOfDateError(error)) {
      return NextResponse.json(
        { error: "Settlement groups are not available yet. Please run `npm run db:push`." },
        { status: 503 }
      )
    }

    console.error("Error creating settlement group:", error)
    return NextResponse.json({ error: "Failed to create settlement group" }, { status: 500 })
  }
}
