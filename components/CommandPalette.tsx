"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

type CommandItem = {
  label: string
  description: string
  href: string
  keywords: string[]
}

const COMMANDS: CommandItem[] = [
  {
    label: "Dashboard",
    description: "Overview and action items",
    href: "/dashboard",
    keywords: ["home", "overview", "summary"],
  },
  {
    label: "History",
    description: "Transaction history",
    href: "/transactions/history",
    keywords: ["transactions", "list", "history"],
  },
  {
    label: "Recurring",
    description: "Recurring transactions",
    href: "/transactions/recurring",
    keywords: ["subscriptions", "bills", "repeat"],
  },
  {
    label: "Templates",
    description: "Transaction templates",
    href: "/transactions/templates",
    keywords: ["quick add", "saved"],
  },
  {
    label: "Settlements",
    description: "Track who owes whom",
    href: "/transactions/settlements",
    keywords: ["split", "debt", "friends"],
  },
  {
    label: "Budget",
    description: "Budgets and allocations",
    href: "/budget",
    keywords: ["spending plan", "limits"],
  },
  {
    label: "Analytics",
    description: "Spending insights",
    href: "/analytics",
    keywords: ["charts", "trends", "reports"],
  },
  {
    label: "Settings",
    description: "App configuration",
    href: "/settings",
    keywords: ["preferences", "account"],
  },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(prev => !prev)
      }
    }

    const onOpen = () => setOpen(true)

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("open-command-palette", onOpen)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("open-command-palette", onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS

    return COMMANDS.filter(item => {
      const haystack = `${item.label} ${item.description} ${item.keywords.join(" ")}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [query])

  const openItem = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pages..."
              className="pl-9 border-0 focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
              No results found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(item => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openItem(item.href)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
