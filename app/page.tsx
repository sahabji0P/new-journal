import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing/LandingPage"
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <SmoothScrollProvider>
      <LandingPage />
    </SmoothScrollProvider>
  )
}
