"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MemberSelect } from "@/components/investments/MemberSelect"
import { EntityTagsInput } from "@/components/investments/EntityTagsInput"
import { Scanner } from "@/components/investments/Scanner"
import {
  INSURANCE_TYPE_LABELS,
  POLICY_STATUS_LABELS,
} from "@/components/investments/InsurancePage"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { ScanLine, Loader2, Plus, X } from "lucide-react"
import type {
  InsurancePolicyRecord,
  InsuranceType,
  PolicyStatus,
  PremiumFrequency,
  TaxSection,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PolicyFormProps {
  policy?: InsurancePolicyRecord
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TYPES: InsuranceType[] = [
  "term", "endowment", "ulip", "money_back", "whole_life",
  "health", "family_floater", "super_topup", "critical_illness",
  "motor_comprehensive", "motor_tp", "home", "travel",
  "personal_accident", "device_insurance", "other",
]

const ALL_STATUSES: PolicyStatus[] = ["active", "lapsed", "surrendered", "matured", "claimed"]

const PREMIUM_FREQUENCIES: PremiumFrequency[] = ["monthly", "quarterly", "half_yearly", "yearly", "single"]

const FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  single: "Single",
}

const TAX_SECTIONS: TaxSection[] = ["80C", "80CCC", "80CCD", "80D", "10_14", "none"]

const TAX_SECTION_LABELS: Record<TaxSection, string> = {
  "80C": "Section 80C",
  "80CCC": "Section 80CCC",
  "80CCD": "Section 80CCD(1B)",
  "80D": "Section 80D",
  "10_14": "Section 10(14)",
  none: "None",
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? "grid gap-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PolicyForm({ policy, open, onClose }: PolicyFormProps) {
  const { addPolicy, updatePolicy, familyMembers } = useInvestments()
  const isMobile = useIsMobile()

  const isEditing = !!policy

  // -----------------------------------------------------------------------
  // Form state
  // -----------------------------------------------------------------------

  const [name, setName] = useState("")
  const [type, setType] = useState<InsuranceType>("term")
  const [memberId, setMemberId] = useState("")
  const [insurer, setInsurer] = useState("")
  const [policyNumber, setPolicyNumber] = useState("")
  const [premiumAmount, setPremiumAmount] = useState("")
  const [premiumFrequency, setPremiumFrequency] = useState<PremiumFrequency>("yearly")
  const [sumAssured, setSumAssured] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [nextPremiumDate, setNextPremiumDate] = useState("")
  const [status, setStatus] = useState<PolicyStatus>("active")
  const [nominee, setNominee] = useState("")
  const [nomineeRelation, setNomineeRelation] = useState("")
  const [taxSection, setTaxSection] = useState<TaxSection>("none")
  const [riders, setRiders] = useState<string[]>([])
  const [riderInput, setRiderInput] = useState("")
  const [coveredMembers, setCoveredMembers] = useState<string[]>([])
  const [agentName, setAgentName] = useState("")
  const [agentPhone, setAgentPhone] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // Scanner
  const [showScanner, setShowScanner] = useState(false)

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -----------------------------------------------------------------------
  // Populate from existing policy
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (policy) {
      setName(policy.name)
      setType(policy.type)
      setMemberId(policy.memberId)
      setInsurer(policy.insurer ?? "")
      setPolicyNumber(policy.policyNumber ?? "")
      setPremiumAmount(policy.premiumAmount?.toString() ?? "")
      setPremiumFrequency(policy.premiumFrequency ?? "yearly")
      setSumAssured(policy.sumAssured?.toString() ?? "")
      setStartDate(policy.startDate ?? "")
      setEndDate(policy.endDate ?? "")
      setNextPremiumDate(policy.nextPremiumDate ?? "")
      setStatus(policy.status)
      setNominee(policy.nominee ?? "")
      setNomineeRelation(policy.nomineeRelation ?? "")
      setTaxSection(policy.taxSection ?? "none")
      setRiders(policy.riders ?? [])
      setCoveredMembers(policy.coveredMembers ?? [])
      setAgentName(policy.agentName ?? "")
      setAgentPhone(policy.agentPhone ?? "")
      setTags(policy.tags ?? [])
      setNotes(policy.notes ?? "")
      setRiderInput("")
    } else {
      // Reset form
      setName("")
      setType("term")
      setMemberId("")
      setInsurer("")
      setPolicyNumber("")
      setPremiumAmount("")
      setPremiumFrequency("yearly")
      setSumAssured("")
      setStartDate("")
      setEndDate("")
      setNextPremiumDate("")
      setStatus("active")
      setNominee("")
      setNomineeRelation("")
      setTaxSection("none")
      setRiders([])
      setRiderInput("")
      setCoveredMembers([])
      setAgentName("")
      setAgentPhone("")
      setTags([])
      setNotes("")
    }
  }, [policy, open])

  // -----------------------------------------------------------------------
  // Scanner callback
  // -----------------------------------------------------------------------

  const handleScanExtracted = useCallback((data: Record<string, unknown>) => {
    if (data.name && typeof data.name === "string") setName(data.name)
    if (data.type && typeof data.type === "string") setType(data.type as InsuranceType)
    if (data.insurer && typeof data.insurer === "string") setInsurer(data.insurer)
    if (data.policyNumber && typeof data.policyNumber === "string") setPolicyNumber(data.policyNumber)
    if (data.premiumAmount != null) setPremiumAmount(String(data.premiumAmount))
    if (data.sumAssured != null) setSumAssured(String(data.sumAssured))
    if (data.startDate && typeof data.startDate === "string") setStartDate(data.startDate)
    if (data.endDate && typeof data.endDate === "string") setEndDate(data.endDate)
    if (data.nominee && typeof data.nominee === "string") setNominee(data.nominee)
    if (data.nomineeRelation && typeof data.nomineeRelation === "string") setNomineeRelation(data.nomineeRelation)
    if (data.agentName && typeof data.agentName === "string") setAgentName(data.agentName)
    if (data.agentPhone && typeof data.agentPhone === "string") setAgentPhone(data.agentPhone)
    setShowScanner(false)
  }, [])

  // -----------------------------------------------------------------------
  // Riders management
  // -----------------------------------------------------------------------

  const addRider = () => {
    const trimmed = riderInput.trim()
    if (trimmed && !riders.includes(trimmed)) {
      setRiders([...riders, trimmed])
    }
    setRiderInput("")
  }

  const removeRider = (rider: string) => {
    setRiders(riders.filter((r) => r !== rider))
  }

  // -----------------------------------------------------------------------
  // Covered members management
  // -----------------------------------------------------------------------

  const toggleCoveredMember = (id: string) => {
    setCoveredMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!name.trim() || !memberId) return

    setIsSubmitting(true)

    const payload: Record<string, unknown> = {
      memberId,
      name: name.trim(),
      type,
      insurer: insurer.trim(),
      policyNumber: policyNumber.trim(),
      premiumAmount: parseFloat(premiumAmount) || 0,
      premiumFrequency,
      sumAssured: parseFloat(sumAssured) || 0,
      startDate: startDate || new Date().toISOString().split("T")[0],
      endDate: endDate || undefined,
      nextPremiumDate: nextPremiumDate || undefined,
      status,
      nominee: nominee.trim() || undefined,
      nomineeRelation: nomineeRelation.trim() || undefined,
      taxSection: taxSection !== "none" ? taxSection : undefined,
      riders: riders.length > 0 ? riders : undefined,
      coveredMembers: type === "family_floater" && coveredMembers.length > 0 ? coveredMembers : undefined,
      agentName: agentName.trim() || undefined,
      agentPhone: agentPhone.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
    }

    try {
      if (isEditing) {
        await updatePolicy(policy.id, payload as Partial<InsurancePolicyRecord>)
      } else {
        await addPolicy(payload as Parameters<typeof addPolicy>[0])
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Form Content
  // -----------------------------------------------------------------------

  const formContent = (
    <div className="flex flex-col gap-4 overflow-y-auto px-1">
      {/* Scan button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setShowScanner(true)}
      >
        <ScanLine className="size-4" />
        Scan Policy
      </Button>

      {/* Common fields */}
      <Field label="Policy Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Click 2 Protect" />
      </Field>

      <Field label="Type *">
        <Select value={type} onValueChange={(v) => setType(v as InsuranceType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {INSURANCE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <MemberSelect value={memberId} onChange={setMemberId} label="Family Member *" />

      <Field label="Insurer">
        <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="e.g. HDFC Life, LIC" />
      </Field>

      <Field label="Policy Number">
        <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="Policy number" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Premium Amount *">
          <Input type="number" value={premiumAmount} onChange={(e) => setPremiumAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Premium Frequency">
          <Select value={premiumFrequency} onValueChange={(v) => setPremiumFrequency(v as PremiumFrequency)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREMIUM_FREQUENCIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Sum Assured *">
        <Input type="number" value={sumAssured} onChange={(e) => setSumAssured(e.target.value)} placeholder="0" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End Date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Next Premium Date">
          <Input type="date" value={nextPremiumDate} onChange={(e) => setNextPremiumDate(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as PolicyStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {POLICY_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nominee">
          <Input value={nominee} onChange={(e) => setNominee(e.target.value)} placeholder="Nominee name" />
        </Field>
        <Field label="Nominee Relation">
          <Input value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} placeholder="e.g. Spouse" />
        </Field>
      </div>

      <Field label="Tax Section">
        <Select value={taxSection} onValueChange={(v) => setTaxSection(v as TaxSection)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAX_SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {TAX_SECTION_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Riders */}
      <div className="border-t pt-3">
        <Field label="Riders">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {riders.map((rider) => (
              <span
                key={rider}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {rider}
                <button
                  type="button"
                  onClick={() => removeRider(rider)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={riderInput}
              onChange={(e) => setRiderInput(e.target.value)}
              placeholder="Add a rider..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addRider()
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={addRider}>
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>
      </div>

      {/* Covered Members (family_floater) */}
      {type === "family_floater" && (
        <div className="border-t pt-3">
          <Field label="Covered Members">
            <div className="flex flex-col gap-2">
              {familyMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={coveredMembers.includes(member.id)}
                    onChange={() => toggleCoveredMember(member.id)}
                    className="rounded border-input"
                  />
                  {member.name}
                  {member.relationship ? ` (${member.relationship})` : ""}
                </label>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* Agent details */}
      <div className="border-t pt-3">
        <p className="text-sm font-semibold mb-3">Agent Details</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Agent Name">
            <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name" />
          </Field>
          <Field label="Agent Phone">
            <Input value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} placeholder="Phone number" />
          </Field>
        </div>
      </div>

      {/* Tags */}
      <Field label="Tags">
        <EntityTagsInput tags={tags} onChange={setTags} placeholder="Add a tag..." />
      </Field>

      {/* Notes */}
      <Field label="Notes">
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </Field>
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2 justify-end">
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !memberId}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isEditing ? "Update" : "Add"} Policy
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const title = isEditing ? "Edit Policy" : "Add Policy"
  const description = isEditing
    ? "Update the insurance policy details below."
    : "Fill in the details to add a new insurance policy."

  return (
    <>
      {/* Scanner dialog */}
      {showScanner && (
        <Scanner
          target="insurance_policy"
          onExtracted={handleScanExtracted}
          onClose={() => setShowScanner(false)}
        />
      )}

      {isMobile ? (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{formContent}</div>
            <SheetFooter>{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
