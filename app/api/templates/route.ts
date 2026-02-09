import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/session"
import { getCachedUserData, invalidateUserCache, USER_CACHE_SCOPES } from "@/lib/server-cache"

// GET /api/templates - Get all templates for the user
export async function GET() {
  try {
    const user = await requireAuth()

    const templates = await getCachedUserData({
      userId: user.id,
      scope: USER_CACHE_SCOPES.templates,
      revalidateSeconds: 20,
      loader: async () => prisma.transactionTemplate.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a new template
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()

    const { name, description, amount, type, category, accountId, party, tags, notes } = body

    if (!name || !type || !category) {
      return NextResponse.json(
        { error: "Name, type, and category are required" },
        { status: 400 }
      )
    }

    const template = await prisma.transactionTemplate.create({
      data: {
        userId: user.id,
        name,
        description,
        amount: amount ? parseFloat(amount) : null,
        type,
        category,
        accountId: accountId || null,
        party: party || null,
        tags: tags || [],
        notes: notes || null,
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.templates, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}

// PUT /api/templates - Update a template
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.transactionTemplate.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    const template = await prisma.transactionTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount ? parseFloat(data.amount) : null }),
        ...(data.type && { type: data.type }),
        ...(data.category && { category: data.category }),
        ...(data.accountId !== undefined && { accountId: data.accountId || null }),
        ...(data.party !== undefined && { party: data.party || null }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.templates, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

// DELETE /api/templates - Delete a template
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id') || body.id

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prisma.transactionTemplate.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    await prisma.transactionTemplate.delete({
      where: { id },
    })

    invalidateUserCache(user.id, [USER_CACHE_SCOPES.templates, USER_CACHE_SCOPES.syncAdvanced])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
