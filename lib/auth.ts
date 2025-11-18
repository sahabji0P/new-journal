import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// Check if database is available
const isDatabaseAvailable = process.env.DATABASE_URL && process.env.DATABASE_URL !== ""

// Check if Google OAuth is configured
const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET

// Build providers array
const providers: NextAuthOptions["providers"] = []

if (isGoogleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  )
}

// Determine session strategy - use JWT if no database or no adapter
const useJwtStrategy = !isDatabaseAvailable

export const authOptions: NextAuthOptions = {
  // Only use Prisma adapter if database is configured
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(isDatabaseAvailable && { adapter: PrismaAdapter(prisma) as any }),
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token, user }) {
      if (session.user) {
        // For JWT strategy, use token.id; for database strategy, use user.id
        session.user.id = (token?.id as string) || user?.id || ""
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: useJwtStrategy ? "jwt" : "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
  debug: process.env.NODE_ENV === "development",
}
