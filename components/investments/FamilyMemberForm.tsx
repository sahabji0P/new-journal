"use client"

import { useState, useEffect } from "react"
import {
  User,
  FileText,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  ScanLine,
  Trash2,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Scanner } from "./Scanner"
import { cn } from "@/lib/utils"
import type {
  FamilyMember,
  IdentityDocumentType,
} from "@/lib/types"

interface FamilyMemberFormProps {
  member?: FamilyMember
  open: boolean
  onClose: () => void
}

interface DocDraft {
  localId: string
  type: IdentityDocumentType
  documentNumber: string
  nameOnDocument: string
  expiryDate: string
}

const STEPS = [
  { label: "Basic Info", icon: User },
  { label: "Documents", icon: FileText },
  { label: "Additional", icon: Briefcase },
]

const RELATIONSHIPS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "other", label: "Other" },
]

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const DOC_TYPES: { value: IdentityDocumentType; label: string }[] = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "pan", label: "PAN" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "ration_card", label: "Ration Card" },
  { value: "other", label: "Other" },
]

function createEmptyDoc(): DocDraft {
  return {
    localId: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "aadhaar",
    documentNumber: "",
    nameOnDocument: "",
    expiryDate: "",
  }
}

export function FamilyMemberForm({ member, open, onClose }: FamilyMemberFormProps) {
  const isMobile = useIsMobile()
  const { addFamilyMember, updateFamilyMember, addIdentityDocument } = useInvestments()

  const isEditing = !!member

  // Step state
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Basic Info
  const [name, setName] = useState("")
  const [relationship, setRelationship] = useState<string>("self")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [gender, setGender] = useState<string>("")
  const [bloodGroup, setBloodGroup] = useState<string>("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")

  // Step 2: Identity Documents
  const [docs, setDocs] = useState<DocDraft[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanTargetDocIndex, setScanTargetDocIndex] = useState<number | null>(null)

  // Step 3: Additional
  const [employer, setEmployer] = useState("")
  const [designation, setDesignation] = useState("")
  const [annualIncome, setAnnualIncome] = useState("")
  const [medicalNotes, setMedicalNotes] = useState("")
  const [photo, setPhoto] = useState("")
  const [notes, setNotes] = useState("")

  // Initialize form with member data when editing
  useEffect(() => {
    if (member) {
      setName(member.name)
      setRelationship(member.relationship ?? "self")
      setDateOfBirth(member.dateOfBirth ?? "")
      setGender(member.gender ?? "")
      setBloodGroup(member.bloodGroup ?? "")
      setPhone(member.phone ?? "")
      setEmail(member.email ?? "")
      setAddress(member.address ?? "")
      setEmployer(member.employer ?? "")
      setDesignation(member.designation ?? "")
      setAnnualIncome(member.annualIncome ? String(member.annualIncome) : "")
      setMedicalNotes(member.medicalNotes ?? "")
      setPhoto(member.photo ?? "")
      setNotes(member.notes ?? "")
      setDocs(
        (member.identityDocuments ?? []).map((d) => ({
          localId: d.id,
          type: d.type,
          documentNumber: d.documentNumber,
          nameOnDocument: d.nameOnDocument ?? "",
          expiryDate: d.expiryDate ?? "",
        }))
      )
    } else {
      resetForm()
    }
    setStep(0)
  }, [member, open])

  function resetForm() {
    setName("")
    setRelationship("self")
    setDateOfBirth("")
    setGender("")
    setBloodGroup("")
    setPhone("")
    setEmail("")
    setAddress("")
    setDocs([])
    setEmployer("")
    setDesignation("")
    setAnnualIncome("")
    setMedicalNotes("")
    setPhoto("")
    setNotes("")
    setStep(0)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      const memberData = {
        name: name.trim(),
        relationship: relationship as FamilyMember["relationship"],
        dateOfBirth: dateOfBirth || undefined,
        gender: (gender || undefined) as FamilyMember["gender"],
        bloodGroup: bloodGroup || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        employer: employer || undefined,
        designation: designation || undefined,
        annualIncome: annualIncome ? Number(annualIncome) : undefined,
        medicalNotes: medicalNotes || undefined,
        photo: photo || undefined,
        notes: notes || undefined,
      }

      if (isEditing && member) {
        await updateFamilyMember(member.id, memberData)

        // Add any new docs (ones without an existing ID)
        const existingDocIds = new Set(
          (member.identityDocuments ?? []).map((d) => d.id)
        )
        for (const doc of docs) {
          if (!existingDocIds.has(doc.localId) && doc.documentNumber.trim()) {
            await addIdentityDocument(member.id, {
              memberId: member.id,
              type: doc.type,
              documentNumber: doc.documentNumber,
              nameOnDocument: doc.nameOnDocument || undefined,
              expiryDate: doc.expiryDate || undefined,
            })
          }
        }
      } else {
        const created = await addFamilyMember(memberData)
        if (created) {
          // Add identity documents for the new member
          for (const doc of docs) {
            if (doc.documentNumber.trim()) {
              await addIdentityDocument(created.id, {
                memberId: created.id,
                type: doc.type,
                documentNumber: doc.documentNumber,
                nameOnDocument: doc.nameOnDocument || undefined,
                expiryDate: doc.expiryDate || undefined,
              })
            }
          }
        }
      }

      resetForm()
      onClose()
    } catch {
      // Errors are handled by context via toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScanExtracted = (data: Record<string, unknown>) => {
    if (scanTargetDocIndex !== null && scanTargetDocIndex < docs.length) {
      setDocs((prev) => {
        const updated = [...prev]
        const doc = { ...updated[scanTargetDocIndex] }
        if (data.documentNumber) doc.documentNumber = String(data.documentNumber)
        if (data.nameOnDocument) doc.nameOnDocument = String(data.nameOnDocument)
        if (data.expiryDate) doc.expiryDate = String(data.expiryDate)
        if (data.type) doc.type = String(data.type) as IdentityDocumentType
        updated[scanTargetDocIndex] = doc
        return updated
      })
    }
    setShowScanner(false)
    setScanTargetDocIndex(null)
  }

  const addDoc = () => {
    setDocs((prev) => [...prev, createEmptyDoc()])
  }

  const removeDoc = (index: number) => {
    setDocs((prev) => prev.filter((_, i) => i !== index))
  }

  const updateDoc = (index: number, field: keyof DocDraft, value: string) => {
    setDocs((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center gap-1 mb-4">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const isActive = i === step
        const isCompleted = i < step
        return (
          <button
            key={s.label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : isCompleted
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? (
              <Check className="size-3" />
            ) : (
              <Icon className="size-3" />
            )}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        )
      })}
    </div>
  )

  // Step 1: Basic Info
  const Step1 = () => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Relationship</label>
          <Select value={relationship} onValueChange={setRelationship}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Date of Birth</label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Gender</label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Blood Group</label>
          <Select value={bloodGroup} onValueChange={setBloodGroup}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {bg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Phone</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address"
          rows={2}
          className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  )

  // Step 2: Documents
  const Step2 = () => (
    <div className="grid gap-4">
      {docs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No identity documents added yet.
        </p>
      )}

      {docs.map((doc, index) => (
        <div
          key={doc.localId}
          className="rounded-lg border p-3 grid gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Document {index + 1}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setScanTargetDocIndex(index)
                  setShowScanner(true)
                }}
              >
                <ScanLine className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeDoc(index)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Type</label>
              <Select
                value={doc.type}
                onValueChange={(v) => updateDoc(index, "type", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Document Number</label>
              <Input
                value={doc.documentNumber}
                onChange={(e) => updateDoc(index, "documentNumber", e.target.value)}
                placeholder="XXXX XXXX XXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Name on Document</label>
              <Input
                value={doc.nameOnDocument}
                onChange={(e) => updateDoc(index, "nameOnDocument", e.target.value)}
                placeholder="Name as printed"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Expiry Date</label>
              <Input
                type="date"
                value={doc.expiryDate}
                onChange={(e) => updateDoc(index, "expiryDate", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addDoc} className="w-full">
        <Plus className="size-4" />
        Add Document
      </Button>
    </div>
  )

  // Step 3: Additional
  const Step3 = () => (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Employer</label>
          <Input
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            placeholder="Company name"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Designation</label>
          <Input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Job title"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Annual Income</label>
        <Input
          type="number"
          value={annualIncome}
          onChange={(e) => setAnnualIncome(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Medical Notes</label>
        <textarea
          value={medicalNotes}
          onChange={(e) => setMedicalNotes(e.target.value)}
          placeholder="Allergies, conditions, etc."
          rows={2}
          className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Photo URL</label>
        <Input
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={3}
          className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  )

  const currentStepContent = (
    <div className="overflow-y-auto flex-1 px-1">
      {step === 0 && <Step1 />}
      {step === 1 && <Step2 />}
      {step === 2 && <Step3 />}
    </div>
  )

  const navigationButtons = (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
        disabled={isSubmitting}
      >
        <ChevronLeft className="size-4" />
        {step > 0 ? "Back" : "Cancel"}
      </Button>

      {step < STEPS.length - 1 ? (
        <Button onClick={() => setStep(step + 1)}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      ) : (
        <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEditing ? "Saving..." : "Adding..."}
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Add Member"
          )}
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent side="bottom" className="h-[90dvh] flex flex-col">
            <SheetHeader>
              <SheetTitle>{isEditing ? "Edit Member" : "Add Family Member"}</SheetTitle>
              <SheetDescription>
                {isEditing
                  ? "Update family member details."
                  : "Add a new family member to track their investments and documents."}
              </SheetDescription>
            </SheetHeader>
            <StepIndicator />
            {currentStepContent}
            <SheetFooter>{navigationButtons}</SheetFooter>
          </SheetContent>
        </Sheet>

        {showScanner && (
          <Scanner
            target="identity_document"
            onExtracted={handleScanExtracted}
            onClose={() => {
              setShowScanner(false)
              setScanTargetDocIndex(null)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Member" : "Add Family Member"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update family member details."
                : "Add a new family member to track their investments and documents."}
            </DialogDescription>
          </DialogHeader>
          <StepIndicator />
          {currentStepContent}
          <DialogFooter>{navigationButtons}</DialogFooter>
        </DialogContent>
      </Dialog>

      {showScanner && (
        <Scanner
          target="identity_document"
          onExtracted={handleScanExtracted}
          onClose={() => {
            setShowScanner(false)
            setScanTargetDocIndex(null)
          }}
        />
      )}
    </>
  )
}
