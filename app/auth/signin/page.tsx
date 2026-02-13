"use client"

import { signIn, useSession, getProviders } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Loader2, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function SignInContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasProviders, setHasProviders] = useState(true)
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const errorParam = searchParams.get("error")

  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  useEffect(() => {
    // Check if providers are configured
    getProviders().then(providers => {
      if (!providers || Object.keys(providers).length === 0) {
        setHasProviders(false)
      }
    }).catch(() => {
      setHasProviders(false)
    })
  }, [])

  useEffect(() => {
    if (errorParam) {
      setError(errorParam)
    }
  }, [errorParam])

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn("google", { callbackUrl, redirect: false })
      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Welcome to CORE</h1>
          <p className="text-muted-foreground">
            Sign in to access your CORE dashboard, AI insights, and Saathi — your financial companion.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!hasProviders ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
              <h3 className="font-semibold mb-2">OAuth Not Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Google OAuth credentials are not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  Continue to Dashboard
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              Your data is securely stored and never shared.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h3 className="font-semibold mb-3">What you&apos;ll get:</h3>
          <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 justify-center">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span>AI-powered financial insights</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span>Saathi - your personal finance companion</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <ArrowRight className="w-4 h-4 text-orange-400" />
              <span>Cloud-synced data across devices</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignInContent />
    </Suspense>
  )
}
