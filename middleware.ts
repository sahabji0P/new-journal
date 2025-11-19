import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow access to auth-related pages
        if (pathname.startsWith("/auth")) {
          return true
        }

        // Allow access to API auth routes
        if (pathname.startsWith("/api/auth")) {
          return true
        }

        // For other API routes, require authentication
        // The middleware will return 401 for API routes when not authenticated
        if (pathname.startsWith("/api")) {
          return !!token
        }

        // Require authentication for all other routes (pages)
        return !!token
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handle auth in route handlers)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
}
