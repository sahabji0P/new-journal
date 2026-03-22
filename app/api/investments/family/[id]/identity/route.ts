import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/investments/family/[id]/identity - Get all identity documents for a family member
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify the family member belongs to the user
    const member = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    const documents = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.familyMembers,
      keyParts: ["identity", id],
      revalidateSeconds: 20,
      loader: async () => prisma.identityDocument.findMany({
        where: { memberId: id },
        orderBy: { createdAt: 'asc' },
      }),
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching identity documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch identity documents" },
      { status: 500 }
    )
  }
}

// POST /api/investments/family/[id]/identity - Create a new identity document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    // Verify the family member belongs to the user
    const member = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    const {
      type, documentNumber, nameOnDocument, issueDate,
      expiryDate, issuingAuthority, placeOfIssue, notes,
    } = body

    if (!type || !documentNumber) {
      return NextResponse.json(
        { error: "Document type and number are required" },
        { status: 400 }
      )
    }

    const document = await prisma.identityDocument.create({
      data: {
        memberId: id,
        type,
        documentNumber,
        nameOnDocument,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        issuingAuthority,
        placeOfIssue,
        notes,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Error creating identity document:", error)
    return NextResponse.json(
      { error: "Failed to create identity document" },
      { status: 500 }
    )
  }
}

// PUT /api/investments/family/[id]/identity - Update an identity document
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const { docId, ...updateData } = body

    if (!docId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    // Verify the family member belongs to the user
    const member = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    // Verify the document belongs to this member
    const existing = await prisma.identityDocument.findFirst({
      where: { id: docId, memberId: id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Identity document not found" },
        { status: 404 }
      )
    }

    if (updateData.issueDate) {
      updateData.issueDate = new Date(updateData.issueDate)
    }
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate)
    }

    const document = await prisma.identityDocument.update({
      where: { id: docId },
      data: updateData,
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error updating identity document:", error)
    return NextResponse.json(
      { error: "Failed to update identity document" },
      { status: 500 }
    )
  }
}

// DELETE /api/investments/family/[id]/identity - Delete an identity document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const { docId } = body

    if (!docId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      )
    }

    // Verify the family member belongs to the user
    const member = await prisma.familyMember.findFirst({
      where: { id, userId: user.id },
    })

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      )
    }

    // Verify the document belongs to this member
    const existing = await prisma.identityDocument.findFirst({
      where: { id: docId, memberId: id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Identity document not found" },
        { status: 404 }
      )
    }

    await prisma.identityDocument.delete({
      where: { id: docId },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.familyMembers])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting identity document:", error)
    return NextResponse.json(
      { error: "Failed to delete identity document" },
      { status: 500 }
    )
  }
}
