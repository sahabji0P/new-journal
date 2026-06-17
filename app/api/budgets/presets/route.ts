import { NextResponse } from "next/server"
import { requireAuth, AuthError } from "@/lib/session"

const PRESETS = [
  {
    key: "fifty_thirty_twenty",
    label: "50 / 30 / 20",
    description: "Needs, wants, and savings split for balanced monthly planning.",
    split: { needs: 50, wants: 30, savings: 20 },
  },
  {
    key: "zero_based_starter",
    label: "Zero-Based Starter",
    description: "Assign every unit of income with a practical starter split.",
    split: { needs: 60, wants: 25, savings: 15 },
  },
  {
    key: "essentials_focus",
    label: "Essentials Focus",
    description: "Higher allocation to essentials for tighter spending control.",
    split: { needs: 70, wants: 20, savings: 10 },
  },
] as const

// GET /api/budgets/presets - List supported budget presets
export async function GET() {
  try {
    await requireAuth()
    return NextResponse.json(PRESETS)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching budget presets:", error)
    return NextResponse.json(
      { error: "Failed to fetch budget presets" },
      { status: 500 }
    )
  }
}
