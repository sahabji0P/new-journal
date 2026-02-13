import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized: ({ req, token }) => {
      if (req.nextUrl.pathname === "/") return true
      return !!token
    },
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handle auth in route handlers)
     * - auth routes (signin, error, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api|auth).*)",
  ],
}
