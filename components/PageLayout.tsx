"use client"

import { useTheme } from "next-themes"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { AppSidebar } from "./AppSidebar"
import { Command, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react"

interface PageLayoutProps {
  children: ReactNode
  showHero?: boolean
  heroTitle?: string
  heroDescription?: string
  heroActions?: ReactNode
}

export function PageLayout({
  children,
  showHero = false,
  heroTitle,
  heroDescription,
  heroActions,
}: PageLayoutProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = window.localStorage.getItem("sidebar-hidden")
    if (saved === "true") {
      setSidebarHidden(true)
    }
  }, [])

  useEffect(() => {
    const onToggleSidebar = () => {
      setSidebarHidden(prev => {
        const next = !prev
        window.localStorage.setItem("sidebar-hidden", String(next))
        return next
      })
    }

    window.addEventListener("toggle-app-sidebar", onToggleSidebar)
    return () => window.removeEventListener("toggle-app-sidebar", onToggleSidebar)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const toggleSidebar = () => {
    const next = !sidebarHidden
    setSidebarHidden(next)
    window.localStorage.setItem("sidebar-hidden", String(next))
  }

  const openCommandPalette = () => {
    window.dispatchEvent(new Event("open-command-palette"))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {!sidebarHidden && (
          <aside className="hidden md:block w-64 border-r border-border/60 bg-background/95 sticky top-0 h-screen">
            <AppSidebar />
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24 md:pb-10">
            <section className="mb-6 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
              >
                {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                <span className="hidden lg:inline">{sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}</span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCommandPalette}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                  aria-label="Open command menu"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Search</span>
                  <span className="hidden md:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    <Command className="w-3 h-3" />
                    K
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </section>

            {showHero && (
              <section className="mb-8">
                <div className="bg-gradient-to-r from-background via-muted/10 to-background p-6 md:p-8 rounded-2xl border border-border/50">
                  <div className="max-w-3xl">
                    {heroTitle && (
                      <h2 className="text-2xl md:text-3xl font-bold mb-3">{heroTitle}</h2>
                    )}
                    {heroDescription && (
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        {heroDescription}
                      </p>
                    )}
                    {heroActions && (
                      <div className="flex flex-wrap items-center gap-3 mt-5">{heroActions}</div>
                    )}
                  </div>
                </div>
              </section>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
