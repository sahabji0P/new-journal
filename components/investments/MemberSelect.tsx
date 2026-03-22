"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInvestments } from "@/contexts/InvestmentsContext"

interface MemberSelectProps {
  value: string
  onChange: (memberId: string) => void
  label?: string
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

export function MemberSelect({ value, onChange, label }: MemberSelectProps) {
  const { familyMembers } = useInvestments()

  return (
    <div className="grid gap-2">
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}
      {familyMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add a family member first
        </p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a family member" />
          </SelectTrigger>
          <SelectContent>
            {familyMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
                {member.relationship
                  ? ` (${relationshipLabels[member.relationship] ?? member.relationship})`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
