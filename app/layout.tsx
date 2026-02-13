import type { Metadata } from "next"
import type React from "react"
import { IBM_Plex_Sans, IBM_Plex_Mono, Bebas_Neue } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { AppProvider } from "../contexts/AppContext"
import { MobileNav } from "../components/MobileNav"
import { SessionProvider } from "../components/providers/SessionProvider"
import { CommandPalette } from "../components/CommandPalette"
import { SmoothScrollProvider } from "../components/providers/SmoothScrollProvider"

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
})

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
})

export const metadata: Metadata = {
  title: "CORE — Smart Finance Workspace",
  description: "CORE helps you track spending, manage budgets, settle group splits, and stay in control of your money.",
  icons: {
    icon: "/favicon.jpeg",
    shortcut: "/favicon.jpeg",
    apple: "/favicon.jpeg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${bebasNeue.variable} font-sans antialiased overflow-x-hidden`}>
        <SmoothScrollProvider>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              forcedTheme="dark"
              disableTransitionOnChange
            >
              <AppProvider>
                <div className="pb-16 md:pb-0">
                  {children}
                </div>
                <MobileNav />
                <CommandPalette />
                <Toaster position="top-right" richColors closeButton />
              </AppProvider>
            </ThemeProvider>
          </SessionProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  )
}
