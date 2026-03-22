"use client"

import { Pencil, TrendingUp, Shield, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useInvestments } from "@/contexts/InvestmentsContext"
import type { FamilyMember } from "@/lib/types"

interface FamilyMemberCardProps {
  member: FamilyMember
  investmentCount: number
  policyCount: number
  totalInvested: number
  onClick: () => void
  onEdit: () => void
}

const relationshipLabels: Record<string, string> = {
  self: "Self",
  spouse: "Spouse",
  father: "Father",
  mother: "Mother",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  other: "Other",
}

const relationshipColors: Record<string, string> = {
  self: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  spouse: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  father: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  mother: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  son: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  daughter: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  brother: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  sister: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  other: "bg-muted text-muted-foreground",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function FamilyMemberCard({
  member,
  investmentCount,
  policyCount,
  totalInvested,
  onClick,
  onEdit,
}: FamilyMemberCardProps) {
  const { formatCurrency } = useInvestments()

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="grid gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {member.photo ? (
              <div className="size-10 rounded-full overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.photo}
                  alt={member.name}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                {getInitials(member.name)}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="font-medium leading-tight truncate">{member.name}</h3>
              {member.relationship && (
                <span
                  className={cn(
                    "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    relationshipColors[member.relationship] ?? relationshipColors.other
                  )}
                >
                  {relationshipLabels[member.relationship] ?? member.relationship}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        </div>

        {/* Contact info */}
        {(member.phone || member.email) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {member.phone && <p>{member.phone}</p>}
            {member.email && <p className="truncate">{member.email}</p>}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            <span>
              {investmentCount} {investmentCount === 1 ? "investment" : "investments"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="size-3.5" />
            <span>
              {policyCount} {policyCount === 1 ? "policy" : "policies"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1 font-medium text-foreground">
            <Wallet className="size-3.5" />
            <span>{formatCurrency(totalInvested)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
