"use client"

import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Pencil, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"
import { iconForTransaction, transactionTimeLabel } from "./transaction-utils"

interface TransactionRowProps {
  transaction: Transaction
  formatCurrency: (amount: number) => string
  onClick: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  onEdit?: (transaction: Transaction) => void
  isSelected?: boolean
  isFocused?: boolean
  variant?: "default" | "compact"
  isUpcoming?: boolean
}

export function TransactionRow({
  transaction,
  formatCurrency,
  onClick,
  onDelete,
  onEdit,
  isSelected = false,
  isFocused = false,
  variant = "default",
  isUpcoming = false,
}: TransactionRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const Icon = iconForTransaction(transaction)
  const isIncome = transaction.type === "income"
  const isCompact = variant === "compact"

  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [isFocused])

  const secondaryParts = isUpcoming ? ["Upcoming"] : []
  secondaryParts.push(transaction.category)
  if (transaction.party) secondaryParts.push(transaction.party)
  secondaryParts.push(transactionTimeLabel(transaction.date))
  const secondaryText = secondaryParts.join(" \u00B7 ")

  return (
    <button
      ref={rowRef}
      type="button"
      data-transaction-card="true"
      onClick={() => onClick(transaction)}
      className={cn(
        "group/row w-full text-left transition-colors rounded-lg relative",
        isCompact ? "py-2.5 px-2" : "py-3 px-2",
        "glass-row",
        isSelected && "glass-subtle",
        isUpcoming && "border border-dashed border-amber-500/30 opacity-65"
      )}
      style={isFocused ? {
        boxShadow: "inset 3px 0 0 0 oklch(0.71 0.17 56)",
        backgroundColor: "oklch(0.71 0.17 56 / 0.08)",
      } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full",
              isCompact ? "h-8 w-8" : "h-9 w-9",
              isUpcoming
                ? "bg-amber-500/15 text-amber-500"
                : isIncome
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>

          <div className="min-w-0">
            <p className={cn(
              "truncate font-semibold text-foreground",
              isCompact ? "text-[13px]" : "text-sm"
            )}>
              {transaction.description}
            </p>
            <p className={cn(
              "truncate text-muted-foreground",
              isCompact ? "text-[11px]" : "text-xs"
            )}>
              {secondaryText}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right relative">
          <div className={cn(
            "transition-opacity duration-150",
            (onDelete || onEdit) && "group-hover/row:opacity-0"
          )}>
            <p className={cn(
              "font-semibold whitespace-nowrap",
              isCompact ? "text-[13px]" : "text-sm",
              isIncome ? "text-emerald-500" : "text-foreground"
            )}>
              {formatCurrency(transaction.amount)}
            </p>
            <p className={cn(
              "text-muted-foreground whitespace-nowrap",
              isCompact ? "text-[10px]" : "text-[11px]"
            )}>
              {transaction.accountName || "Unknown account"}
            </p>
          </div>

          {(onDelete || onEdit) && (
            <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
              {onEdit && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); onEdit(transaction) }}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md glass text-muted-foreground shadow-sm transition-colors hover:text-foreground",
                    isCompact ? "h-7 w-7" : "h-8 w-8"
                  )}
                >
                  <Pencil className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                </span>
              )}
              {onDelete && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); onDelete(transaction) }}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 shadow-sm transition-colors hover:bg-red-100 hover:text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20",
                    isCompact ? "h-7 w-7" : "h-8 w-8"
                  )}
                >
                  <Trash2 className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
