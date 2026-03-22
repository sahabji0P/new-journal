"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/investments/StatusBadge"
import {
  INVESTMENT_TYPE_LABELS,
  INVESTMENT_TYPE_COLORS,
  INVESTMENT_STATUS_LABELS,
} from "@/components/investments/InvestmentGroupFilter"
import { cn } from "@/lib/utils"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { ArrowUp, ArrowDown, Pencil } from "lucide-react"
import type { InvestmentRecord } from "@/lib/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvestmentsTableProps {
  investments: InvestmentRecord[]
  groupBy: string
  onSelect: (inv: InvestmentRecord) => void
  onEdit: (inv: InvestmentRecord) => void
}

type SortKey =
  | "name"
  | "type"
  | "member"
  | "invested"
  | "currentValue"
  | "returns"
  | "status"
  | "maturityDate"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReturnAmount(inv: InvestmentRecord) {
  return inv.currentValue - inv.investedAmount
}

function getReturnPct(inv: InvestmentRecord) {
  return inv.investedAmount > 0
    ? ((inv.currentValue - inv.investedAmount) / inv.investedAmount) * 100
    : 0
}

function comparator(a: InvestmentRecord, b: InvestmentRecord, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name)
    case "type":
      return a.type.localeCompare(b.type)
    case "member":
      return (a.memberName ?? "").localeCompare(b.memberName ?? "")
    case "invested":
      return a.investedAmount - b.investedAmount
    case "currentValue":
      return a.currentValue - b.currentValue
    case "returns":
      return getReturnAmount(a) - getReturnAmount(b)
    case "status":
      return a.status.localeCompare(b.status)
    case "maturityDate": {
      const aDate = a.maturityDate ? new Date(a.maturityDate).getTime() : 0
      const bDate = b.maturityDate ? new Date(b.maturityDate).getTime() : 0
      return aDate - bDate
    }
    default:
      return 0
  }
}

function groupInvestments(
  investments: InvestmentRecord[],
  groupBy: string,
): Map<string, InvestmentRecord[]> {
  const groups = new Map<string, InvestmentRecord[]>()

  for (const inv of investments) {
    let key: string
    switch (groupBy) {
      case "type":
        key = INVESTMENT_TYPE_LABELS[inv.type] ?? inv.type
        break
      case "member":
        key = inv.memberName ?? "Unknown"
        break
      case "status":
        key = INVESTMENT_STATUS_LABELS[inv.status] ?? inv.status
        break
      default:
        key = ""
    }

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(inv)
  }

  return groups
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestmentsTable({
  investments,
  groupBy,
  onSelect,
  onEdit,
}: InvestmentsTableProps) {
  const { formatCurrency } = useInvestments()
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sorted = [...investments].sort((a, b) => {
    const cmp = comparator(a, b, sortKey)
    return sortDirection === "asc" ? cmp : -cmp
  })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3 inline ml-1" />
    ) : (
      <ArrowDown className="size-3 inline ml-1" />
    )
  }

  const headerButton = (label: string, col: SortKey, align?: "right") => (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-0.5 hover:text-foreground transition-colors",
        align === "right" && "justify-end w-full"
      )}
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </button>
  )

  // Render a single investment row
  const renderRow = (inv: InvestmentRecord) => {
    const ret = getReturnAmount(inv)
    const retPct = getReturnPct(inv)
    const isPositive = ret >= 0

    return (
      <TableRow
        key={inv.id}
        className="cursor-pointer"
        onClick={() => onSelect(inv)}
      >
        <TableCell className="font-medium max-w-[200px] truncate">
          {inv.name}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              INVESTMENT_TYPE_COLORS[inv.type]
            )}
          >
            {INVESTMENT_TYPE_LABELS[inv.type]}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {inv.memberName ?? "-"}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(inv.investedAmount)}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(inv.currentValue)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-col items-end">
            <span
              className={cn(
                "font-mono text-sm",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(ret)}
            </span>
            <span
              className={cn(
                "font-mono text-xs",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              ({isPositive ? "+" : ""}
              {retPct.toFixed(1)}%)
            </span>
          </div>
        </TableCell>
        <TableCell>
          <StatusBadge status={inv.status} />
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {inv.maturityDate
            ? new Date(inv.maturityDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "-"}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(inv)
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    )
  }

  // Render grouped or flat
  const renderBody = () => {
    if (groupBy === "none" || !groupBy) {
      if (sorted.length === 0) {
        return (
          <TableRow>
            <TableCell
              colSpan={9}
              className="h-24 text-center text-muted-foreground"
            >
              No investments found
            </TableCell>
          </TableRow>
        )
      }
      return sorted.map(renderRow)
    }

    const groups = groupInvestments(sorted, groupBy)

    if (groups.size === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={9}
            className="h-24 text-center text-muted-foreground"
          >
            No investments found
          </TableCell>
        </TableRow>
      )
    }

    const rows: React.ReactNode[] = []
    groups.forEach((items, groupName) => {
      rows.push(
        <TableRow key={`group-${groupName}`} className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={9} className="py-2">
            <span className="font-semibold text-sm">{groupName}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({items.length} {items.length === 1 ? "investment" : "investments"})
            </span>
          </TableCell>
        </TableRow>
      )
      items.forEach((inv) => rows.push(renderRow(inv)))
    })

    return rows
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{headerButton("Name", "name")}</TableHead>
          <TableHead>{headerButton("Type", "type")}</TableHead>
          <TableHead>{headerButton("Member", "member")}</TableHead>
          <TableHead className="text-right">
            {headerButton("Invested", "invested", "right")}
          </TableHead>
          <TableHead className="text-right">
            {headerButton("Current Value", "currentValue", "right")}
          </TableHead>
          <TableHead className="text-right">
            {headerButton("Returns", "returns", "right")}
          </TableHead>
          <TableHead>{headerButton("Status", "status")}</TableHead>
          <TableHead>
            {headerButton("Maturity", "maturityDate")}
          </TableHead>
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>
      <TableBody>{renderBody()}</TableBody>
    </Table>
  )
}
