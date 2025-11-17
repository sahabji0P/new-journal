import type { Metadata } from "next"
import type React from "react"
import { Toaster } from "sonner"
import "./globals.css"
import { ThemeProvider } from "../components/theme-provider"
import { AppProvider } from "../contexts/AppContext"

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
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
