"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightLeft,
  BarChart3,
  Landmark,
  LayoutDashboard,
  Search,
  Settings,
  UserCog,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CommandItem = {
  label: string
  href: string
  keywords: string[]
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

type CommandGroup = {
  heading: string
  items: CommandItem[]
}

const GROUPS: CommandGroup[] = [
  {
    heading: "Main",
    items: [
      {
        label: "Saathi",
        href: "/dashboard",
        keywords: ["chat", "assistant", "home"],
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/analytics",
        keywords: ["charts", "trends", "insights"],
        icon: BarChart3,
      },
    ],
  },
  {
    heading: "Transactions",
    items: [
      {
        label: "Overview",
        href: "/transactions",
        keywords: ["summary", "overview", "home"],
        icon: ArrowRightLeft,
      },
      {
        label: "History",
        href: "/transactions/history",
        keywords: ["transactions", "history", "list"],
        icon: ArrowRightLeft,
      },
      {
        label: "Budget",
        href: "/transactions/budget",
        keywords: ["spending", "limit", "allocation"],
        icon: Landmark,
      },
      {
        label: "Recurring",
        href: "/transactions/recurring",
        keywords: ["bills", "subscriptions", "repeat"],
        icon: ArrowRightLeft,
      },
      {
        label: "Templates",
        href: "/transactions/templates",
        keywords: ["quick add", "saved"],
        icon: ArrowRightLeft,
      },
      {
        label: "Settlements",
        href: "/transactions/settlements",
        keywords: ["split", "owed", "debt"],
        icon: ArrowRightLeft,
      },
    ],
  },
  {
    heading: "Settings",
    items: [
      {
        label: "Accounts",
        href: "/settings?tab=accounts",
        keywords: ["bank", "wallet", "card"],
        icon: Settings,
      },
      {
        label: "Categories",
        href: "/settings?tab=categories",
        keywords: ["labels", "types"],
        icon: Settings,
      },
      {
        label: "Preferences",
        href: "/settings?tab=preferences",
        keywords: ["preferences", "currency", "format"],
        icon: UserCog,
      },
      {
        label: "Advanced Tools",
        href: "/settings?tab=advanced",
        keywords: ["goals", "watchlists"],
        icon: Settings,
      },
    ],
  },
]

type FlatCommand = {
  id: string
  heading: string
  item: CommandItem
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

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
      setSelectedIndex(0)
    }
  }, [open])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GROUPS

    return GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => {
        const text = `${item.label} ${item.keywords.join(" ")}`.toLowerCase()
        return text.includes(q)
      }),
    })).filter(group => group.items.length > 0)
  }, [query])

  const flatCommands = useMemo<FlatCommand[]>(
    () =>
      filteredGroups.flatMap(group =>
        group.items.map(item => ({
          id: `${group.heading}:${item.href}`,
          heading: group.heading,
          item,
        }))
      ),
    [filteredGroups]
  )

  useEffect(() => {
    if (selectedIndex > flatCommands.length - 1) {
      setSelectedIndex(0)
    }
  }, [flatCommands, selectedIndex])

  const navigateTo = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatCommands.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setSelectedIndex(prev => (prev + 1) % flatCommands.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length)
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const selected = flatCommands[selectedIndex]
      if (selected) navigateTo(selected.item.href)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search and navigate across app pages.</DialogDescription>
        </DialogHeader>

        <div className="border-b px-3 py-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Type a command or search..."
              className="pl-9 border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.heading} className="mb-2 last:mb-0">
                <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {group.heading}
                </p>
                <div className="space-y-1">
                  {group.items.map(item => {
                    const index = flatCommands.findIndex(cmd => cmd.id === `${group.heading}:${item.href}`)
                    const selected = index === selectedIndex
                    const Icon = item.icon

                    return (
                      <button
                        key={`${group.heading}:${item.href}`}
                        type="button"
                        onClick={() => navigateTo(item.href)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors",
                          selected ? "bg-accent text-foreground" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {item.label}
                        </span>
                        {item.shortcut && (
                          <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
