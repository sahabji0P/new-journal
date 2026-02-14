"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PageLayout } from "@/components/PageLayout"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Overview", href: "/transactions" },
  { label: "History", href: "/transactions/history" },
  { label: "Budget", href: "/transactions/budget" },
  { label: "Recurring", href: "/transactions/recurring" },
  { label: "Templates", href: "/transactions/templates" },
  { label: "Settlements", href: "/transactions/settlements" },
]

export default function TransactionsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage overview, history, budget, recurring entries, templates, and settlements.
          </p>
        </div>

        <nav className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => {
            const isActive = pathname === tab.href

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "shrink-0 rounded-md border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 border-primary/50 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {children}
      </div>
    </PageLayout>
  )
}
