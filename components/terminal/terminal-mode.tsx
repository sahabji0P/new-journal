"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { executeCommand, type TerminalContext, type TerminalOutput } from "@/lib/terminal/commands"
import { getCompletions } from "@/lib/terminal/tab-complete"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutputEntry {
  type: "input" | "output" | "error"
  lines: string[]
  timestamp: number
}

interface TerminalModeProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME_LINES = [
  "Welcome to shashwat.dev v2.0",
  "Type 'help' to see available commands",
  "",
]

// ─── Empty context (before data loads) ───────────────────────────────────────

const EMPTY_CONTEXT: TerminalContext = {
  projects: [],
  experiences: [],
  thoughts: [],
  research: [],
  history: [],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerminalMode({ isOpen, onClose }: TerminalModeProps) {
  const router = useRouter()
  const { setTheme } = useTheme()

  const [outputs, setOutputs] = useState<OutputEntry[]>([
    { type: "output", lines: WELCOME_LINES, timestamp: Date.now() },
  ])
  const [inputValue, setInputValue] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [context, setContext] = useState<TerminalContext>(EMPTY_CONTEXT)

  const inputRef = useRef<HTMLInputElement>(null)
  const outputEndRef = useRef<HTMLDivElement>(null)

  // ─── Load context on open ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    const loadingEntry: OutputEntry = {
      type: "output",
      lines: ["Loading portfolio data..."],
      timestamp: Date.now(),
    }
    setOutputs((prev) => [...prev, loadingEntry])

    const timestamp = loadingEntry.timestamp

    Promise.all([
      fetch("/api/v1/projects").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/experience").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/thoughts").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/research").then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([projects, experience, thoughts, research]) => {
      const newContext: TerminalContext = {
        projects: (projects.data ?? []).map((p: Record<string, unknown>) => ({
          slug: String(p.slug ?? ""),
          name: String(p.name ?? ""),
          shortDescription: String(p.shortDescription ?? ""),
          tech: Array.isArray(p.tech) ? p.tech.map(String) : [],
          category: p.category ? String(p.category) : undefined,
          liveUrl: p.liveUrl ? String(p.liveUrl) : undefined,
          githubUrl: p.githubUrl ? String(p.githubUrl) : undefined,
          date: p.date ? String(p.date) : undefined,
        })),
        experiences: (experience.data ?? []).map((e: Record<string, unknown>) => ({
          slug: String(e.slug ?? ""),
          company: String(e.company ?? ""),
          role: String(e.role ?? ""),
          type: String(e.type ?? ""),
          startDate: String(e.startDate ?? ""),
          endDate: String(e.endDate ?? ""),
          skills: Array.isArray(e.skills) ? e.skills.map(String) : [],
          location: e.location ? String(e.location) : undefined,
        })),
        thoughts: (thoughts.data ?? []).map((t: Record<string, unknown>) => ({
          slug: String(t.slug ?? ""),
          title: String(t.title ?? ""),
          date: String(t.date ?? ""),
          category: String(t.category ?? ""),
          excerpt: t.excerpt ? String(t.excerpt) : undefined,
        })),
        research: (research.data ?? []).map((r: Record<string, unknown>) => ({
          slug: String(r.slug ?? ""),
          title: String(r.title ?? ""),
          venue: String(r.venue ?? ""),
          year: String(r.year ?? ""),
          tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
        })),
        history: [],
      }
      setContext(newContext)
      // Remove loading message
      setOutputs((prev) =>
        prev.filter((o) => o.timestamp !== timestamp).concat({
          type: "output",
          lines: ["Portfolio data loaded. Ready."],
          timestamp: Date.now(),
        })
      )
      setIsLoading(false)
    }).catch(() => {
      setOutputs((prev) =>
        prev.filter((o) => o.timestamp !== timestamp).concat({
          type: "error",
          lines: ["Warning: Could not load portfolio data. Some commands may show empty results."],
          timestamp: Date.now(),
        })
      )
      setIsLoading(false)
    })
  }, [isOpen])

  // ─── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [outputs])

  // ─── Focus input when opened ──────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // ─── Handle theme navigation marker ──────────────────────────────────────

  const handleOutput = useCallback(
    (result: TerminalOutput, inputLine: string) => {
      if (result.close) {
        onClose()
        return
      }

      if (result.clear) {
        setOutputs([{ type: "output", lines: WELCOME_LINES, timestamp: Date.now() }])
        return
      }

      if (result.navigateTo) {
        // Theme toggle: __theme__:dark|light
        const themeMatch = result.navigateTo.match(/^__theme__:(.+)$/)
        if (themeMatch) {
          setTheme(themeMatch[1])
        } else {
          setOutputs((prev) => [
            ...prev,
            { type: "input", lines: [inputLine], timestamp: Date.now() },
            { type: "output", lines: result.lines, timestamp: Date.now() + 1 },
          ])
          setTimeout(() => {
            router.push(result.navigateTo!)
            onClose()
          }, 400)
          return
        }
      }

      setOutputs((prev) => [
        ...prev,
        { type: "input", lines: [inputLine], timestamp: Date.now() },
        { type: "output", lines: result.lines, timestamp: Date.now() + 1 },
      ])
    },
    [onClose, router, setTheme]
  )

  // ─── Execute command ──────────────────────────────────────────────────────

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return

      const newHistory = [trimmed, ...history].slice(0, 100)
      setHistory(newHistory)
      setHistoryIndex(-1)

      const ctxWithHistory: TerminalContext = { ...context, history: newHistory }

      const resultOrPromise = executeCommand(trimmed, ctxWithHistory)

      if (resultOrPromise instanceof Promise) {
        setIsProcessing(true)
        setOutputs((prev) => [
          ...prev,
          { type: "input", lines: [trimmed], timestamp: Date.now() },
          { type: "output", lines: ["⠋ Loading..."], timestamp: Date.now() + 1 },
        ])
        const loadingTs = Date.now() + 1
        try {
          const result = await resultOrPromise
          setOutputs((prev) =>
            prev
              .filter((o) => o.timestamp !== loadingTs)
              .concat({ type: "output", lines: result.lines, timestamp: Date.now() })
          )
          if (result.close) onClose()
        } catch {
          setOutputs((prev) =>
            prev
              .filter((o) => o.timestamp !== loadingTs)
              .concat({ type: "error", lines: ["Error executing command."], timestamp: Date.now() })
          )
        } finally {
          setIsProcessing(false)
        }
      } else {
        handleOutput(resultOrPromise, trimmed)
      }
    },
    [context, history, handleOutput, onClose]
  )

  // ─── Keyboard handling ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        const val = inputValue
        setInputValue("")
        runCommand(val)
        return
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        const next = Math.min(historyIndex + 1, history.length - 1)
        setHistoryIndex(next)
        setInputValue(history[next] ?? "")
        return
      }

      if (e.key === "ArrowDown") {
        e.preventDefault()
        const next = Math.max(historyIndex - 1, -1)
        setHistoryIndex(next)
        setInputValue(next === -1 ? "" : (history[next] ?? ""))
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === "Tab") {
        e.preventDefault()
        const completions = getCompletions(inputValue, context)
        if (completions.length === 1) {
          setInputValue(completions[0])
        } else if (completions.length > 1) {
          // Show completions as output
          setOutputs((prev) => [
            ...prev,
            { type: "output", lines: completions, timestamp: Date.now() },
          ])
        }
        return
      }
    },
    [inputValue, history, historyIndex, context, onClose, runCommand]
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="terminal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: "rgba(13, 13, 15, 0.97)", backdropFilter: "blur(16px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col w-full max-w-4xl h-[80vh] rounded-xl overflow-hidden shadow-2xl border border-border/20"
            style={{ backgroundColor: "#0d0d0f" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border/30 select-none shrink-0"
              style={{ backgroundColor: "#1a1a1f" }}
            >
              <div className="flex items-center gap-2">
                {/* Traffic lights */}
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
                  aria-label="Close terminal"
                />
                <div className="w-3 h-3 rounded-full bg-amber-500 opacity-60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-60" />
              </div>

              <span className="font-mono text-xs text-muted-foreground">
                shashwat.dev — Terminal
              </span>

              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors text-xs font-mono"
                aria-label="Close"
              >
                esc
              </button>
            </div>

            {/* Output area */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
              {outputs.map((entry) => (
                <div key={entry.timestamp}>
                  {entry.type === "input" && (
                    <div className="flex items-start gap-2">
                      <span className="text-lime-400 shrink-0">shashwat.dev ~ $</span>
                      <span className="text-foreground">{entry.lines[0]}</span>
                    </div>
                  )}
                  {(entry.type === "output" || entry.type === "error") && (
                    <div className="pl-0">
                      {entry.lines.map((line, i) => (
                        <div
                          key={i}
                          className={
                            entry.type === "error"
                              ? "text-red-400"
                              : "text-muted-foreground"
                          }
                          style={{ whiteSpace: "pre" }}
                        >
                          {line || "\u00A0"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>

            {/* Input line */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-t border-border/30 shrink-0"
              style={{ backgroundColor: "#0d0d0f" }}
            >
              <span className="font-mono text-sm text-lime-400 shrink-0 select-none">
                shashwat.dev ~ $
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing || isLoading}
                className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none caret-lime-400 disabled:opacity-50"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
