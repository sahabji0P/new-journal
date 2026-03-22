"use client"

import { useState, useEffect } from "react"
import { Loader2, ScanLine } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Scanner } from "./Scanner"
import type { IdentityDocumentRecord, IdentityDocumentType } from "@/lib/types"

interface IdentityDocumentFormProps {
  memberId: string
  document?: IdentityDocumentRecord
  open: boolean
  onClose: () => void
}

const DOC_TYPES: { value: IdentityDocumentType; label: string }[] = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "pan", label: "PAN" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "ration_card", label: "Ration Card" },
  { value: "other", label: "Other" },
]

export function IdentityDocumentForm({
  memberId,
  document,
  open,
  onClose,
}: IdentityDocumentFormProps) {
  const { addIdentityDocument, updateIdentityDocument } = useInvestments()

  const isEditing = !!document

  const [type, setType] = useState<IdentityDocumentType>("aadhaar")
  const [documentNumber, setDocumentNumber] = useState("")
  const [nameOnDocument, setNameOnDocument] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [issuingAuthority, setIssuingAuthority] = useState("")
  const [placeOfIssue, setPlaceOfIssue] = useState("")
  const [notes, setNotes] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (document) {
      setType(document.type)
      setDocumentNumber(document.documentNumber)
      setNameOnDocument(document.nameOnDocument ?? "")
      setIssueDate(document.issueDate ?? "")
      setExpiryDate(document.expiryDate ?? "")
      setIssuingAuthority(document.issuingAuthority ?? "")
      setPlaceOfIssue(document.placeOfIssue ?? "")
      setNotes(document.notes ?? "")
    } else {
      resetForm()
    }
  }, [document, open])

  function resetForm() {
    setType("aadhaar")
    setDocumentNumber("")
    setNameOnDocument("")
    setIssueDate("")
    setExpiryDate("")
    setIssuingAuthority("")
    setPlaceOfIssue("")
    setNotes("")
  }

  const handleScanExtracted = (data: Record<string, unknown>) => {
    if (data.type && typeof data.type === "string") setType(data.type as IdentityDocumentType)
    if (data.documentNumber && typeof data.documentNumber === "string") setDocumentNumber(data.documentNumber)
    if (data.nameOnDocument && typeof data.nameOnDocument === "string") setNameOnDocument(data.nameOnDocument)
    if (data.issueDate && typeof data.issueDate === "string") setIssueDate(data.issueDate)
    if (data.expiryDate && typeof data.expiryDate === "string") setExpiryDate(data.expiryDate)
    if (data.issuingAuthority && typeof data.issuingAuthority === "string") setIssuingAuthority(data.issuingAuthority)
    if (data.placeOfIssue && typeof data.placeOfIssue === "string") setPlaceOfIssue(data.placeOfIssue)
    setShowScanner(false)
  }

  const handleSubmit = async () => {
    if (!documentNumber.trim()) return

    setIsSubmitting(true)
    try {
      const docData = {
        memberId,
        type,
        documentNumber: documentNumber.trim(),
        nameOnDocument: nameOnDocument || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        issuingAuthority: issuingAuthority || undefined,
        placeOfIssue: placeOfIssue || undefined,
        notes: notes || undefined,
      }

      if (isEditing && document) {
        await updateIdentityDocument(memberId, document.id, docData)
      } else {
        await addIdentityDocument(memberId, docData)
      }

      resetForm()
      onClose()
    } catch {
      // Errors handled by context via toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Document" : "Add Identity Document"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update document details."
                : "Add an identity document for this family member."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 overflow-y-auto max-h-[60vh]">
            {/* Scan button */}
            <Button
              variant="outline"
              onClick={() => setShowScanner(true)}
              className="w-full"
            >
              <ScanLine className="size-4" />
              Scan Document
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Document Type *</label>
                <Select value={type} onValueChange={(v) => setType(v as IdentityDocumentType)}>
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

              <div className="grid gap-2">
                <label className="text-sm font-medium">Document Number *</label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Name on Document</label>
              <Input
                value={nameOnDocument}
                onChange={(e) => setNameOnDocument(e.target.value)}
                placeholder="Name as printed on document"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Issue Date</label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Issuing Authority</label>
                <Input
                  value={issuingAuthority}
                  onChange={(e) => setIssuingAuthority(e.target.value)}
                  placeholder="e.g., UIDAI, ITD"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Place of Issue</label>
                <Input
                  value={placeOfIssue}
                  onChange={(e) => setPlaceOfIssue(e.target.value)}
                  placeholder="City / Office"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
                className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!documentNumber.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditing ? "Saving..." : "Adding..."}
                </>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showScanner && (
        <Scanner
          target="identity_document"
          onExtracted={handleScanExtracted}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
