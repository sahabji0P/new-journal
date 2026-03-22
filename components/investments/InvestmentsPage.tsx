"use client"

import { useState, useMemo } from "react"
import { Plus, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { EmptyState } from "@/components/investments/EmptyState"
import { InvestmentGroupFilter, INVESTMENT_TYPE_LABELS, INVESTMENT_STATUS_LABELS } from "@/components/investments/InvestmentGroupFilter"
import { InvestmentsTable } from "@/components/investments/InvestmentsTable"
import { InvestmentCard } from "@/components/investments/InvestmentCard"
import { InvestmentDetail } from "@/components/investments/InvestmentDetail"
import { InvestmentForm } from "@/components/investments/InvestmentForm"
import type { InvestmentRecord } from "@/lib/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export function InvestmentsPage() {
  const { investments, formatCurrency, isLoading } = useInvestments()
  const isMobile = useIsMobile()

  // State
  const [viewMode, setViewMode] = useState<"table" | "cards">(isMobile ? "cards" : "table")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterMember, setFilterMember] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [groupBy, setGroupBy] = useState<"none" | "type" | "member" | "status">("none")

  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentRecord | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<InvestmentRecord | undefined>(undefined)

  // -----------------------------------------------------------------------
  // Filter logic
  // -----------------------------------------------------------------------

  const filteredInvestments = useMemo(() => {
    let result = investments

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (inv) =>
          inv.name.toLowerCase().includes(q) ||
          (inv.institution && inv.institution.toLowerCase().includes(q)) ||
          (inv.memberName && inv.memberName.toLowerCase().includes(q)) ||
          (inv.ticker && inv.ticker.toLowerCase().includes(q)) ||
          (inv.folioNumber && inv.folioNumber.toLowerCase().includes(q))
      )
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((inv) => inv.type === filterType)
    }

    // Member filter
    if (filterMember !== "all") {
      result = result.filter((inv) => inv.memberId === filterMember)
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((inv) => inv.status === filterStatus)
    }

    return result
  }, [investments, searchQuery, filterType, filterMember, filterStatus])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSelect = (inv: InvestmentRecord) => {
    setSelectedInvestment(inv)
  }

  const handleEdit = (inv: InvestmentRecord) => {
    setEditingInvestment(inv)
    setShowForm(true)
  }

  const handleAddNew = () => {
    setEditingInvestment(undefined)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingInvestment(undefined)
  }

  const handleCloseDetail = () => {
    setSelectedInvestment(null)
  }

  const handleEditFromDetail = () => {
    if (selectedInvestment) {
      setEditingInvestment(selectedInvestment)
      setSelectedInvestment(null)
      setShowForm(true)
    }
  }

  // -----------------------------------------------------------------------
  // Card grid rendering (with optional groups)
  // -----------------------------------------------------------------------

  const renderCardView = () => {
    if (filteredInvestments.length === 0) {
      return (
        <EmptyState
          icon={TrendingUp}
          title="No investments found"
          description={
            investments.length === 0
              ? "Start tracking your investments by adding one."
              : "Try adjusting your filters or search query."
          }
          actionLabel={investments.length === 0 ? "Add Investment" : undefined}
          onAction={investments.length === 0 ? handleAddNew : undefined}
        />
      )
    }

    if (groupBy !== "none") {
      const groups = groupInvestments(filteredInvestments, groupBy)

      return (
        <div className="flex flex-col gap-6">
          {Array.from(groups.entries()).map(([groupName, items]) => (
            <div key={groupName}>
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-sm font-semibold">{groupName}</h3>
                <span className="text-xs text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    onClick={() => handleSelect(inv)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInvestments.map((inv) => (
          <InvestmentCard
            key={inv.id}
            investment={inv}
            onClick={() => handleSelect(inv)}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading investments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
        <Button onClick={handleAddNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Investment</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <InvestmentGroupFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterMember={filterMember}
        onFilterMemberChange={setFilterMember}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        groupBy={groupBy}
        onGroupByChange={(g) => setGroupBy(g as typeof groupBy)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {viewMode === "table" ? (
        investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Start tracking your investments by adding one."
            actionLabel="Add Investment"
            onAction={handleAddNew}
          />
        ) : (
          <InvestmentsTable
            investments={filteredInvestments}
            groupBy={groupBy}
            onSelect={handleSelect}
            onEdit={handleEdit}
          />
        )
      ) : (
        renderCardView()
      )}

      {/* Detail panel */}
      {selectedInvestment && (
        <InvestmentDetail
          investment={selectedInvestment}
          open={!!selectedInvestment}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* Form */}
      <InvestmentForm
        investment={editingInvestment}
        open={showForm}
        onClose={handleCloseForm}
      />
    </div>
  )
}
