"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "./AppSidebar"
import { Command, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggleButton } from "@/components/ThemeToggleButton"

interface PageLayoutProps {
  children: ReactNode
  showHero?: boolean
  showTopBar?: boolean
  fullBleed?: boolean
  heroTitle?: string
  heroDescription?: string
  heroActions?: ReactNode
}

export function PageLayout({
  children,
  showHero = false,
  showTopBar = true,
  fullBleed = false,
  heroTitle,
  heroDescription,
  heroActions,
}: PageLayoutProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = window.localStorage.getItem("sidebar-hidden")
    if (saved === "true") {
      setSidebarHidden(true)
    }
  }, [])

  useEffect(() => {
    const onToggleSidebar = () => {
      if (window.innerWidth < 768) {
        setMobileSidebarOpen(prev => !prev)
        return
      }
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

  const toggleSidebar = () => {
    const next = !sidebarHidden
    setSidebarHidden(next)
    window.localStorage.setItem("sidebar-hidden", String(next))
  }

  const openCommandPalette = () => {
    window.dispatchEvent(new Event("open-command-palette"))
  }

  const mobilePageTitle = pathname === "/dashboard"
    ? "Saathi"
    : pathname.startsWith("/settlements")
      ? "Settlements"
      : pathname.startsWith("/transactions")
        ? "Transactions"
        : pathname.startsWith("/analytics")
          ? "Analytics"
          : pathname.startsWith("/settings")
            ? "Settings"
            : "CORE"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {!sidebarHidden && (
          <aside className="hidden md:block w-64 border-r border-border/60 bg-background/95 sticky top-0 h-screen">
            <AppSidebar />
          </aside>
        )}

        <div className="flex-1 min-w-0">
          <main className={fullBleed ? "" : showTopBar ? "max-w-6xl mx-auto px-3 md:px-8 pt-3 md:py-8 pb-6 md:pb-10" : "max-w-6xl mx-auto px-3 md:px-8 pt-0 md:pt-3 pb-6 md:pb-10"}>
            {showTopBar && <section className="mb-3 md:mb-6">
              <div className="md:hidden grid grid-cols-[2.5rem_1fr_auto] items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/70 bg-card/80 hover:bg-muted transition-colors"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <p className="text-center text-[15px] font-medium tracking-tight">{mobilePageTitle}</p>
                <div className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/70 bg-card/80 hover:bg-muted transition-colors"
                    aria-label="Open command menu"
                  >
                    <Search className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <ThemeToggleButton compact />
                </div>
              </div>

              <div className="hidden md:flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                    aria-label={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
                  >
                    {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    <span className="hidden lg:inline">{sidebarHidden ? "Show Sidebar" : "Hide Sidebar"}</span>
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <ThemeToggleButton />
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
                </div>
              </div>
            </section>}

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

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[18.5rem] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Navigate across your workspace pages.</SheetDescription>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
