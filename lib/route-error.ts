import { NextResponse } from "next/server"
import { AuthError } from "@/lib/session"

/**
 * Shared route error handler. Returns 401 for auth failures, 500 for everything else.
 * Use in every API route catch block instead of an inline console.error + NextResponse.
 */
export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  console.error(`Error ${context}:`, error)
  return NextResponse.json({ error: `Failed to ${context}` }, { status: 500 })
}
