import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/",
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
    // Protect app routes only. Skip Next internals, auth/api routes, and all static files.
    "/((?!api|auth|_next/static|_next/image|favicon.ico|favicon.jpeg|.*\\..*).*)",
  ],
}
