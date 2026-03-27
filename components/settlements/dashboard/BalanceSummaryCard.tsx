"use client"

import { useState, useRef } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { gsap, useGSAP } from "@/lib/gsap-init"

export interface BalanceItem {
  personName: string
  groupName: string
  amount: number
  userId: string
  groupId: string
}

interface BalanceSummaryCardProps {
  title: string
  totalAmount: number
  items: BalanceItem[]
  variant: "owe" | "owed"
  formatCurrency: (n: number) => string
  onSettle?: (item: BalanceItem) => void
  onRemind?: (item: BalanceItem) => void
  onResolve?: (item: BalanceItem) => void
}

export function BalanceSummaryCard({
  title,
  totalAmount,
  items,
  variant,
  formatCurrency,
  onSettle,
  onRemind,
  onResolve,
}: BalanceSummaryCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  useGSAP(() => {
    if (!expanded) return
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-balance-item]",
        { y: 8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.2, stagger: 0.03, ease: "power2.out" }
      )
    })
  }, { scope: containerRef, dependencies: [expanded], revertOnUpdate: true })

  const isOwe = variant === "owe"

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl border p-4",
        isOwe
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {totalAmount === 0 ? (
            <p className="text-sm text-muted-foreground">All settled up</p>
          ) : (
            <p
              className={cn(
                "text-xl sm:text-2xl font-bold truncate",
                isOwe
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatCurrency(totalAmount)}
            </p>
          )}
        </div>

        {totalAmount > 0 && items.length > 0 && (
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.groupId}-${item.userId}-${index}`}
              data-balance-item
              className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.personName}{" "}
                  <span className="font-normal text-muted-foreground text-xs">
                    ({item.groupName})
                  </span>
                </p>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isOwe
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {formatCurrency(item.amount)}
                </p>
              </div>
              {isOwe ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0 self-start sm:self-auto"
                  onClick={() => onSettle?.(item)}
                >
                  Settle
                </Button>
              ) : (
                <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
                  {onResolve && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      onClick={() => onResolve(item)}
                    >
                      Resolve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => onRemind?.(item)}
                  >
                    Remind
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
