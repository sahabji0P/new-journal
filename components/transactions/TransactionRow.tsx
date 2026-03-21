"use client"

import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { iconForTransaction, transactionTimeLabel } from "./transaction-utils"

interface TransactionRowProps {
  transaction: Transaction
  formatCurrency: (amount: number) => string
  onClick: (transaction: Transaction) => void
  isSelected?: boolean
  variant?: "default" | "compact"
}

export function TransactionRow({
  transaction,
  formatCurrency,
  onClick,
  isSelected = false,
  variant = "default",
}: TransactionRowProps) {
  const Icon = iconForTransaction(transaction)
  const isIncome = transaction.type === "income"
  const isCompact = variant === "compact"

  const secondaryParts = [transaction.category]
  if (transaction.party) secondaryParts.push(transaction.party)
  secondaryParts.push(transactionTimeLabel(transaction.date))
  const secondaryText = secondaryParts.join(" \u00B7 ")

  return (
    <button
      type="button"
      data-transaction-card="true"
      onClick={() => onClick(transaction)}
      className={cn(
        "w-full text-left transition-colors rounded-lg",
        isCompact ? "py-2.5 px-2" : "py-3 px-2",
        "hover:bg-muted/40",
        isSelected && "bg-muted/25"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full",
              isCompact ? "h-8 w-8" : "h-9 w-9",
              isIncome
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

        <div className="shrink-0 text-right">
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
      </div>
    </button>
  )
}
