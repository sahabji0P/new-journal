"use client"

import { useTheme } from "next-themes"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { MenuBar } from "./menu-bar"

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
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return null
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MenuBar />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 pb-32">
        {showHero && (
          <section className="mb-12 animate-fade-in-up">
            <div className="bg-gradient-to-r from-background via-muted/10 to-background p-8 rounded-2xl border border-border/50">
              <div className="max-w-3xl">
                {heroTitle && (
                  <h2 className="text-3xl font-bold mb-4">{heroTitle}</h2>
                )}
                {heroDescription && (
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {heroDescription}
                  </p>
                )}
                {heroActions && (
                  <div className="flex items-center gap-4 mt-6">{heroActions}</div>
                )}
              </div>
            </div>
          </section>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <p className="text-xs text-muted-foreground">
                {formatDate(currentTime)} • {formatTime(currentTime)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
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
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
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
          </div>
        </div>
      </footer>
    </div>
  )
}
