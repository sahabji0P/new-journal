"use client"

import { useState, useMemo } from "react"
import { Plus, Search, LayoutGrid, List, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { EmptyState } from "./EmptyState"
import { FamilyMemberCard } from "./FamilyMemberCard"
import { FamilyMemberForm } from "./FamilyMemberForm"
import { FamilyMemberDetail } from "./FamilyMemberDetail"
import type { FamilyMember } from "@/lib/types"

export function FamilyMembersPage() {
  const {
    familyMembers,
    getMemberInvestments,
    getMemberPolicies,
  } = useInvestments()

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return familyMembers
    const q = searchQuery.toLowerCase()
    return familyMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.relationship?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q)
    )
  }, [familyMembers, searchQuery])

  const memberStats = useMemo(() => {
    const stats = new Map<
      string,
      { investmentCount: number; policyCount: number; totalInvested: number }
    >()
    for (const member of familyMembers) {
      const memberInvestments = getMemberInvestments(member.id)
      const memberPolicies = getMemberPolicies(member.id)
      const totalInvested = memberInvestments.reduce(
        (sum, inv) => sum + inv.investedAmount,
        0
      )
      stats.set(member.id, {
        investmentCount: memberInvestments.length,
        policyCount: memberPolicies.length,
        totalInvested,
      })
    }
    return stats
  }, [familyMembers, getMemberInvestments, getMemberPolicies])

  const handleEdit = (member: FamilyMember) => {
    setSelectedMember(null)
    setEditingMember(member)
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Family Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage family members and their linked investments
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Add Member
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="size-4" />
            <span className="sr-only">Grid view</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
            <span className="sr-only">List view</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredMembers.length === 0 ? (
        familyMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add family members to start tracking investments, policies, and documents for your household."
            actionLabel="Add Member"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No results found"
            description={`No members matching "${searchQuery}". Try a different search term.`}
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const stats = memberStats.get(member.id) ?? {
              investmentCount: 0,
              policyCount: 0,
              totalInvested: 0,
            }
            return (
              <FamilyMemberCard
                key={member.id}
                member={member}
                investmentCount={stats.investmentCount}
                policyCount={stats.policyCount}
                totalInvested={stats.totalInvested}
                onClick={() => setSelectedMember(member)}
                onEdit={() => handleEdit(member)}
              />
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredMembers.map((member) => {
            const stats = memberStats.get(member.id) ?? {
              investmentCount: 0,
              policyCount: 0,
              totalInvested: 0,
            }
            return (
              <FamilyMemberCard
                key={member.id}
                member={member}
                investmentCount={stats.investmentCount}
                policyCount={stats.policyCount}
                totalInvested={stats.totalInvested}
                onClick={() => setSelectedMember(member)}
                onEdit={() => handleEdit(member)}
              />
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <FamilyMemberForm
        open={showForm || !!editingMember}
        onClose={() => {
          setShowForm(false)
          setEditingMember(null)
        }}
        member={editingMember ?? undefined}
      />

      {/* Detail Dialog */}
      {selectedMember && (
        <FamilyMemberDetail
          member={selectedMember}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onEdit={() => handleEdit(selectedMember)}
        />
      )}
    </div>
  )
}
