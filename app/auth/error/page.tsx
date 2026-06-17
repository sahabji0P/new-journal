"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense, useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error") ?? null

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please contact support."
      case "AccessDenied":
        return "Access was denied. You may not have permission to sign in."
      case "Verification":
        return "The verification token has expired or has already been used."
      case "OAuthSignin":
        return "Error occurred while trying to sign in with OAuth."
      case "OAuthCallback":
        return "Error occurred while handling the OAuth callback."
      case "OAuthCreateAccount":
        return "Could not create OAuth provider user in the database."
      case "EmailCreateAccount":
        return "Could not create email provider user in the database."
      case "Callback":
        return "Error occurred in the OAuth callback handler."
      case "OAuthAccountNotLinked":
        return "This email is already associated with another account."
      case "EmailSignin":
        return "Error sending the email for sign in."
      case "CredentialsSignin":
        return "The credentials you provided are invalid."
      case "SessionRequired":
        return "You must be signed in to access this page."
      default:
        return "An unexpected error occurred during authentication."
    }
  }

  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-error-content]", {
        y: 20, autoAlpha: 0, duration: 0.4, ease: "power3.out",
      })
      gsap.from("[data-error-icon]", {
        scale: 0, duration: 0.5, ease: "back.out(1.7)", delay: 0.2,
      })
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="min-h-screen flex items-center justify-center bg-background p-4">
      <div data-error-content className="w-full max-w-md text-center">
        <div
          data-error-icon
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center"
        >
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-muted-foreground mb-6">
          {getErrorMessage(error)}
        </p>

        {error && (
          <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted p-2 rounded">
            Error code: {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <RefreshCw className="w-4 h-4 mr-2" />
              Back To Landing
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthErrorContent />
    </Suspense>
  )
}
