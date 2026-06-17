import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, AuthError } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/family - Get all family members for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const members = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.familyMembers,
      revalidateSeconds: 20,
      loader: async () => prisma.familyMember.findMany({
        where: { userId: user.id },
        include: { identityDocuments: true },
        orderBy: { createdAt: 'asc' },
      }),
    })

    return NextResponse.json(members)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching family members:", error)
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    )
  }
}

// POST /api/investments/family - Create a new family member
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const {
      name, relationship, dateOfBirth, gender, bloodGroup,
      phone, email, address, photo, employer, designation,
      annualIncome, medicalNotes, notes,
    } = body

    if (!name || !relationship) {
      return NextResponse.json(
        { error: "Name and relationship are required" },
        { status: 400 }
      )
    }

    const member = await prisma.familyMember.create({
      data: {
        userId: user.id,
        name,
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        bloodGroup,
        phone,
        email,
        address,
        photo,
        employer,
        designation,
        annualIncome,
        medicalNotes,
        notes,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error creating family member:", error)
    return NextResponse.json(
      { error: "Failed to create family member" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/family - Update a family member
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: "Family member ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth)
    }

    const member = await prisma.familyMember.update({
      where: { id },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json(member)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error updating family member:", error)
    return NextResponse.json(
      { error: "Failed to update family member" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/family - Delete a family member (cascades identity docs)
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Family member ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    await prisma.familyMember.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error deleting family member:", error)
    return NextResponse.json(
      { error: "Failed to delete family member" },
      { status: 500 }
    )
  }
}
