"use client"

import { useState } from "react"
import {
  Search,
  LayoutGrid,
  TableIcon,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import type { InvestmentType, InvestmentStatus } from "@/lib/types"

// ---------------------------------------------------------------------------
// Investment type display name map
// ---------------------------------------------------------------------------

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  mutual_fund: "Mutual Fund",
  fixed_deposit: "Fixed Deposit",
  ppf: "PPF",
  epf: "EPF",
  nps: "NPS",
  stocks: "Stocks",
  gold: "Gold",
  real_estate: "Real Estate",
  bonds: "Bonds",
  rd: "Recurring Deposit",
  ssy: "SSY",
  elss: "ELSS",
  nsc: "NSC",
  kvp: "KVP",
  scss: "SCSS",
  crypto: "Crypto",
  other: "Other",
}

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  active: "Active",
  matured: "Matured",
  withdrawn: "Withdrawn",
  closed: "Closed",
}

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  mutual_fund: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  fixed_deposit: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ppf: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  epf: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  nps: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  stocks: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  real_estate: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  bonds: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  rd: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  ssy: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  elss: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  nsc: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  kvp: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  scss: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  crypto: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

const ALL_INVESTMENT_TYPES: InvestmentType[] = [
  "mutual_fund", "fixed_deposit", "ppf", "epf", "nps",
  "stocks", "gold", "real_estate", "bonds", "rd",
  "ssy", "elss", "nsc", "kvp", "scss", "crypto", "other",
]

const ALL_STATUSES: InvestmentStatus[] = ["active", "matured", "withdrawn", "closed"]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvestmentGroupFilterProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  filterType: string
  onFilterTypeChange: (t: string) => void
  filterMember: string
  onFilterMemberChange: (m: string) => void
  filterStatus: string
  onFilterStatusChange: (s: string) => void
  groupBy: string
  onGroupByChange: (g: string) => void
  viewMode: "table" | "cards"
  onViewModeChange: (m: "table" | "cards") => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestmentGroupFilter({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterMember,
  onFilterMemberChange,
  filterStatus,
  onFilterStatusChange,
  groupBy,
  onGroupByChange,
  viewMode,
  onViewModeChange,
}: InvestmentGroupFilterProps) {
  const { familyMembers } = useInvestments()
  const isMobile = useIsMobile()
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const filterDropdowns = (
    <>
      {/* Type filter */}
      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {ALL_INVESTMENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {INVESTMENT_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Member filter */}
      <Select value={filterMember} onValueChange={onFilterMemberChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Members</SelectItem>
          {familyMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {ALL_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {INVESTMENT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Group by */}
      <Select value={groupBy} onValueChange={onGroupByChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Group By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Grouping</SelectItem>
          <SelectItem value="type">Group by Type</SelectItem>
          <SelectItem value="member">Group by Member</SelectItem>
          <SelectItem value="status">Group by Status</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Top row: search + view toggle (always visible) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search investments..."
            className="pl-9"
          />
        </div>

        {isMobile && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <Filter className="size-4" />
            {filtersExpanded ? (
              <ChevronUp className="size-3 ml-0.5" />
            ) : (
              <ChevronDown className="size-3 ml-0.5" />
            )}
          </Button>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("table")}
            className="rounded-r-none"
          >
            <TableIcon className="size-4" />
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("cards")}
            className="rounded-l-none"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Filter dropdowns: inline on desktop, collapsible on mobile */}
      {isMobile ? (
        filtersExpanded && (
          <div className="grid grid-cols-2 gap-2">{filterDropdowns}</div>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {filterDropdowns}
        </div>
      )}
    </div>
  )
}
