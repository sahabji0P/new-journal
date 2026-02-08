"use client"

import { useTheme } from "next-themes"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { AppSidebar } from "./AppSidebar"

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

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden md:block w-64 border-r border-border/60 bg-background/95 sticky top-0 h-screen">
          <AppSidebar />
        </aside>

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-24 md:pb-10">
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

          <footer className="hidden md:block border-t border-border/50">
            <div className="max-w-6xl mx-auto px-8 py-4 flex justify-end">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0M17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414M4 11a1 1 0 100-2H3a1 1 0 000 2h1"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
