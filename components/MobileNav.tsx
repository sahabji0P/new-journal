"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, ArrowRightLeft, Settings, BarChart3 } from "lucide-react"

const navItems = [
  {
    icon: Sparkles,
    label: "Saathi",
    href: "/dashboard",
  },
  {
    icon: ArrowRightLeft,
    label: "Transactions",
    href: "/transactions",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    href: "/analytics",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const shouldHide = pathname === "/" || pathname.startsWith("/auth")

  if (shouldHide) {
    return null
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-mono">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
