"use client"

import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Heart,
  FileText,
  TrendingUp,
  Shield,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { StatusBadge } from "./StatusBadge"
import type { FamilyMember } from "@/lib/types"

interface FamilyMemberDetailProps {
  member: FamilyMember
  open: boolean
  onClose: () => void
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

const docTypeLabels: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  driving_license: "Driving License",
  voter_id: "Voter ID",
  ration_card: "Ration Card",
  other: "Other",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span>{value}</span>
      </div>
    </div>
  )
}

export function FamilyMemberDetail({
  member,
  open,
  onClose,
  onEdit,
}: FamilyMemberDetailProps) {
  const isMobile = useIsMobile()
  const {
    getMemberInvestments,
    getMemberPolicies,
    deleteFamilyMember,
    formatCurrency,
  } = useInvestments()

  const memberInvestments = getMemberInvestments(member.id)
  const memberPolicies = getMemberPolicies(member.id)

  const handleDelete = async () => {
    await deleteFamilyMember(member.id)
    onClose()
  }

  const content = (
    <div className="grid gap-6 overflow-y-auto flex-1 py-1">
      {/* Avatar + Name header */}
      <div className="flex items-center gap-4">
        {member.photo ? (
          <div className="size-16 rounded-full overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.photo}
              alt={member.name}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
            {getInitials(member.name)}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold">{member.name}</h3>
          {member.relationship && (
            <span className="text-sm text-muted-foreground">
              {relationshipLabels[member.relationship] ?? member.relationship}
            </span>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <section>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <User className="size-4" />
          Personal Information
        </h4>
        <div className="grid gap-2 rounded-lg border p-3">
          <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(member.dateOfBirth)} />
          <InfoRow icon={User} label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : undefined} />
          <InfoRow icon={Heart} label="Blood Group" value={member.bloodGroup} />
          <InfoRow icon={Phone} label="Phone" value={member.phone} />
          <InfoRow icon={Mail} label="Email" value={member.email} />
          <InfoRow icon={MapPin} label="Address" value={member.address} />
          {!member.dateOfBirth && !member.gender && !member.bloodGroup && !member.phone && !member.email && !member.address && (
            <p className="text-sm text-muted-foreground">No additional details.</p>
          )}
        </div>
      </section>

      {/* Identity Documents */}
      <section>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <FileText className="size-4" />
          Identity Documents
        </h4>
        {member.identityDocuments && member.identityDocuments.length > 0 ? (
          <div className="grid gap-2">
            {member.identityDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">
                    {docTypeLabels[doc.type] ?? doc.type}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {doc.documentNumber}
                  </span>
                </div>
                {doc.expiryDate && (
                  <span className="text-xs text-muted-foreground">
                    Exp: {formatDate(doc.expiryDate)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-lg border p-3">
            No identity documents added.
          </p>
        )}
      </section>

      {/* Employment */}
      {(member.employer || member.designation || member.annualIncome) && (
        <section>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Briefcase className="size-4" />
            Employment
          </h4>
          <div className="grid gap-2 rounded-lg border p-3">
            <InfoRow icon={Briefcase} label="Employer" value={member.employer} />
            <InfoRow icon={Briefcase} label="Designation" value={member.designation} />
            {member.annualIncome !== undefined && member.annualIncome !== null && (
              <InfoRow icon={Briefcase} label="Annual Income" value={formatCurrency(member.annualIncome)} />
            )}
          </div>
        </section>
      )}

      {/* Linked Investments */}
      <section>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <TrendingUp className="size-4" />
          Linked Investments ({memberInvestments.length})
        </h4>
        {memberInvestments.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Invested</th>
                  <th className="text-right px-3 py-2 font-medium">Current</th>
                </tr>
              </thead>
              <tbody>
                {memberInvestments.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{inv.name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={inv.type.replace(/_/g, " ")} variant="info" />
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.investedAmount)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(inv.currentValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-lg border p-3">
            No linked investments.
          </p>
        )}
      </section>

      {/* Linked Policies */}
      <section>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Shield className="size-4" />
          Linked Policies ({memberPolicies.length})
        </h4>
        {memberPolicies.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Sum Assured</th>
                  <th className="text-right px-3 py-2 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {memberPolicies.map((policy) => (
                  <tr key={policy.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{policy.name}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={policy.type.replace(/_/g, " ")} variant="info" />
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(policy.sumAssured)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(policy.premiumAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground rounded-lg border p-3">
            No linked policies.
          </p>
        )}
      </section>

      {/* Notes */}
      {(member.notes || member.medicalNotes) && (
        <section>
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <div className="grid gap-2 rounded-lg border p-3 text-sm">
            {member.medicalNotes && (
              <div>
                <span className="font-medium text-muted-foreground">Medical: </span>
                {member.medicalNotes}
              </div>
            )}
            {member.notes && <div>{member.notes}</div>}
          </div>
        </section>
      )}
    </div>
  )

  const footerButtons = (
    <div className="flex items-center justify-between gap-2 w-full">
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        <Trash2 className="size-4" />
        Delete
      </Button>
      <Button onClick={onEdit}>
        <Pencil className="size-4" />
        Edit
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{member.name}</SheetTitle>
            <SheetDescription>
              {relationshipLabels[member.relationship] ?? member.relationship}
            </SheetDescription>
          </SheetHeader>
          {content}
          <SheetFooter>{footerButtons}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{member.name}</DialogTitle>
          <DialogDescription>
            {relationshipLabels[member.relationship] ?? member.relationship}
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
