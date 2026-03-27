"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import to avoid SSR issues with framer-motion overlay
const TerminalMode = dynamic(() => import("./terminal-mode"), { ssr: false })

export default function TerminalToggle() {
  const [isOpen, setIsOpen] = useState(false)

  // Register Ctrl+` global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      {/* Keyboard hint — subtle, shown in bottom-right corner */}
      <div
        className="fixed bottom-4 right-4 z-40 pointer-events-none select-none hidden sm:flex items-center gap-1.5"
        aria-hidden="true"
      >
        <kbd className="font-mono text-[10px] text-muted-foreground/40 bg-muted/10 border border-border/20 rounded px-1.5 py-0.5">
          ctrl
        </kbd>
        <span className="text-muted-foreground/30 text-[10px]">+</span>
        <kbd className="font-mono text-[10px] text-muted-foreground/40 bg-muted/10 border border-border/20 rounded px-1.5 py-0.5">
          `
        </kbd>
        <span className="text-muted-foreground/30 text-[10px] ml-1">terminal</span>
      </div>

      <TerminalMode isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
