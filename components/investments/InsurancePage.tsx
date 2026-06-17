"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, Shield, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { EmptyState } from "@/components/investments/EmptyState"
import { PolicyCard } from "@/components/investments/PolicyCard"
import { PolicyDetail } from "@/components/investments/PolicyDetail"
import { PolicyForm } from "@/components/investments/PolicyForm"
import { PremiumPaymentForm } from "@/components/investments/PremiumPaymentForm"
import type { InsurancePolicyRecord, InsuranceType, PolicyStatus } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  term: "Term Life",
  endowment: "Endowment",
  ulip: "ULIP",
  money_back: "Money Back",
  whole_life: "Whole Life",
  health: "Health",
  family_floater: "Family Floater",
  super_topup: "Super Top-up",
  critical_illness: "Critical Illness",
  motor_comprehensive: "Motor Comprehensive",
  motor_tp: "Motor Third-party",
  home: "Home",
  travel: "Travel",
  personal_accident: "Personal Accident",
  device_insurance: "Device Insurance",
  other: "Other",
}

export const INSURANCE_TYPE_COLORS: Record<InsuranceType, string> = {
  term: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  endowment: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  ulip: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  money_back: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  whole_life: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  health: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  family_floater: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  super_topup: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  critical_illness: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  motor_comprehensive: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  motor_tp: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  home: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  travel: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  personal_accident: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  device_insurance: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  active: "Active",
  lapsed: "Lapsed",
  surrendered: "Surrendered",
  matured: "Matured",
  claimed: "Claimed",
}

const ALL_INSURANCE_TYPES: InsuranceType[] = [
  "term", "endowment", "ulip", "money_back", "whole_life",
  "health", "family_floater", "super_topup", "critical_illness",
  "motor_comprehensive", "motor_tp", "home", "travel",
  "personal_accident", "device_insurance", "other",
]

const ALL_POLICY_STATUSES: PolicyStatus[] = ["active", "lapsed", "surrendered", "matured", "claimed"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsurancePage() {
  const { policies, familyMembers, formatCurrency, isLoading } = useInvestments()
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterMember, setFilterMember] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicyRecord | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicyRecord | undefined>(undefined)
  const [paymentPolicy, setPaymentPolicy] = useState<InsurancePolicyRecord | null>(null)

  // Auto-open form via query param
  useEffect(() => {
    if (searchParams?.get("action") === "add") {
      setEditingPolicy(undefined)
      setShowForm(true)
    }
  }, [searchParams])

  // -----------------------------------------------------------------------
  // Filter logic
  // -----------------------------------------------------------------------

  const filteredPolicies = useMemo(() => {
    let result = policies

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.insurer && p.insurer.toLowerCase().includes(q)) ||
          (p.memberName && p.memberName.toLowerCase().includes(q)) ||
          (p.policyNumber && p.policyNumber.toLowerCase().includes(q))
      )
    }

    if (filterType !== "all") {
      result = result.filter((p) => p.type === filterType)
    }

    if (filterMember !== "all") {
      result = result.filter((p) => p.memberId === filterMember)
    }

    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus)
    }

    return result
  }, [policies, searchQuery, filterType, filterMember, filterStatus])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSelect = (policy: InsurancePolicyRecord) => {
    setSelectedPolicy(policy)
  }

  const handleAddNew = () => {
    setEditingPolicy(undefined)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingPolicy(undefined)
  }

  const handleCloseDetail = () => {
    setSelectedPolicy(null)
  }

  const handleEditFromDetail = () => {
    if (selectedPolicy) {
      setEditingPolicy(selectedPolicy)
      setSelectedPolicy(null)
      setShowForm(true)
    }
  }

  const handleRecordPayment = (policy: InsurancePolicyRecord) => {
    setPaymentPolicy(policy)
    setSelectedPolicy(null)
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading insurance policies...</span>
        </div>
      </div>
    )
  }

  const filterDropdowns = (
    <>
      {/* Type filter */}
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {ALL_INSURANCE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {INSURANCE_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Member filter */}
      <Select value={filterMember} onValueChange={setFilterMember}>
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
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {ALL_POLICY_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {POLICY_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Insurance Policies</h1>
        <Button onClick={handleAddNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Policy</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies..."
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
        </div>

        {/* Filter dropdowns */}
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

      {/* Content */}
      {filteredPolicies.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No policies found"
          description={
            policies.length === 0
              ? "Start tracking your insurance policies by adding one."
              : "Try adjusting your filters or search query."
          }
          actionLabel={policies.length === 0 ? "Add Policy" : undefined}
          onAction={policies.length === 0 ? handleAddNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onClick={() => handleSelect(policy)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedPolicy && (
        <PolicyDetail
          policy={selectedPolicy}
          open={!!selectedPolicy}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
          onRecordPayment={() => handleRecordPayment(selectedPolicy)}
        />
      )}

      {/* Form */}
      <PolicyForm
        policy={editingPolicy}
        open={showForm}
        onClose={handleCloseForm}
      />

      {/* Premium Payment Form */}
      {paymentPolicy && (
        <PremiumPaymentForm
          policyId={paymentPolicy.id}
          policyName={paymentPolicy.name}
          premiumAmount={paymentPolicy.premiumAmount}
          open={!!paymentPolicy}
          onClose={() => setPaymentPolicy(null)}
        />
      )}
    </div>
  )
}
