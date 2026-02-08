import type { Metadata } from "next"
import type React from "react"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { AppProvider } from "../contexts/AppContext"
import { MobileNav } from "../components/MobileNav"
import { SessionProvider } from "../components/providers/SessionProvider"
import { LazySaathiChat } from "../components/LazySaathiChat"

export const metadata: Metadata = {
  title: "Money Tracker - Manage Your Finances",
  description: "A comprehensive money management application to track expenses, manage budgets, and achieve financial goals.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-mono antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AppProvider>
              <div className="pb-16 md:pb-0">
                {children}
              </div>
              <MobileNav />
              <LazySaathiChat />
              <Toaster position="top-right" richColors closeButton />
            </AppProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
