"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, User, Mail, Shield, LogIn } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function UserAccount() {
  const { data: session, status } = useSession()

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOut({ callbackUrl: "/dashboard" })
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign in to sync your data and access AI features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Not Signed In</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to access Saathi AI chatbot, cloud sync, and personalized insights.
            </p>
            <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-400">
              <Link href="/">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In with Google
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{session.user?.name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{session.user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span>{session.user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Provider:</span>
              <span>Google</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Manage your account data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-sm">Cloud Sync</p>
              <p className="text-xs text-muted-foreground">Your data is synced to the cloud</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground">
            Your financial data is stored securely and is only accessible by you.
            We never share your data with third parties.
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-500">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
