import type { Metadata } from "next"
import type React from "react"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { AppProvider } from "../contexts/AppContext"
import { MobileNav } from "../components/MobileNav"
import { SessionProvider } from "../components/providers/SessionProvider"
import { CommandPalette } from "../components/CommandPalette"

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
      <body className="font-sans antialiased">
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
              <CommandPalette />
              <Toaster position="top-right" richColors closeButton />
            </AppProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
