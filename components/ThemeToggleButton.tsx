"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

interface ThemeToggleButtonProps {
  compact?: boolean
}

export function ThemeToggleButton({ compact = false }: ThemeToggleButtonProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-border/70 bg-card/80 hover:bg-muted transition-colors"
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {isDark ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"} Mode</span>
    </button>
  )
}
