import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export class AuthError extends Error {
  constructor() { super("Unauthorized") }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError()
  }
  return user
}
