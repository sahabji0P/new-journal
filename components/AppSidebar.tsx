"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
]

const transactionItems = [
  { label: "Overview", href: "/transactions" },
  { label: "History", href: "/transactions/history" },
  { label: "Budget", href: "/transactions/budget" },
  { label: "Recurring", href: "/transactions/recurring" },
  { label: "Templates", href: "/transactions/templates" },
  { label: "Settlements", href: "/transactions/settlements" },
]

const settingItems = [
  { label: "Accounts", href: "/settings?tab=accounts", tab: "accounts" },
  { label: "Categories", href: "/settings?tab=categories", tab: "categories" },
  { label: "Parties", href: "/settings?tab=parties", tab: "parties" },
  { label: "Preferences", href: "/settings?tab=preferences", tab: "preferences" },
  { label: "Advanced", href: "/settings?tab=advanced", tab: "advanced" },
  { label: "Profile", href: "/settings?tab=profile", tab: "profile" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [transactionsOpen, setTransactionsOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (pathname.startsWith("/transactions")) {
      setTransactionsOpen(true)
    }
    if (pathname.startsWith("/settings")) {
      setSettingsOpen(true)
    }
  }, [pathname])

  const activeSettingsTab = searchParams.get("tab") || "accounts"

  return (
    <div className="h-full p-4 flex flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Wallet className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Money Tracker</p>
          <p className="text-xs text-muted-foreground">Personal Finance</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {primaryItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setTransactionsOpen(prev => !prev)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/transactions")
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Transactions</span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", transactionsOpen && "rotate-180")}
            />
          </button>
          {transactionsOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l border-border/60 pl-2">
              {transactionItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(prev => !prev)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", settingsOpen && "rotate-180")}
            />
          </button>
          {settingsOpen && (
            <div className="mt-1 ml-2 space-y-1 border-l border-border/60 pl-2">
              {settingItems.map(item => {
                const active = pathname.startsWith("/settings") && activeSettingsTab === item.tab
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
