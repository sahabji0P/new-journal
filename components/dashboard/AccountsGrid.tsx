"use client"

import type { Account } from "@/lib/types"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { useRef } from "react"
import {
  CreditCard,
  Landmark,
  MoreVertical,
  PiggyBank,
  Wallet,
} from "lucide-react"

interface AccountsGridProps {
  accounts: Account[]
  formatCurrency: (amount: number) => string
}

const accountTypeConfig: Record<string, { icon: typeof Wallet; color: string; label: string }> = {
  checking: { icon: Wallet, color: "text-blue-400", label: "Checking" },
  savings: { icon: PiggyBank, color: "text-emerald-400", label: "Savings" },
  credit: { icon: CreditCard, color: "text-amber-400", label: "Credit" },
  general: { icon: Landmark, color: "text-purple-400", label: "General" },
}

export function AccountsGrid({ accounts, formatCurrency }: AccountsGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-account-card]",
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.06, ease: "power2.out" }
      )
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="space-y-4">
      <h3 className="font-semibold">Accounts & Cards</h3>
      <div className="grid grid-cols-2 gap-3">
        {accounts.slice(0, 4).map(account => {
          const config = accountTypeConfig[account.type] || accountTypeConfig.general
          const Icon = config.icon
          return (
            <div
              data-account-card
              key={account.id}
              className="glass glass-hover rounded-xl p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg glass-subtle ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <div>
                <p className="font-medium text-sm truncate">{account.name}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
              <p className="text-sm font-bold mt-auto">{formatCurrency(account.balance)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
