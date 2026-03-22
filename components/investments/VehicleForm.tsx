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
import { VEHICLE_TYPE_LABELS } from "@/components/investments/VehicleCard"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { ScanLine, Loader2 } from "lucide-react"
import type { VehicleRecord, VehicleType } from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VehicleFormProps {
  vehicle?: VehicleRecord
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TYPES: VehicleType[] = [
  "car", "motorcycle", "scooter", "bicycle", "auto", "other",
]

const ALL_FUEL_TYPES = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cng", label: "CNG" },
]

const ALL_VEHICLE_STATUSES: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "scrapped", label: "Scrapped" },
  { value: "stolen", label: "Stolen" },
]

// ---------------------------------------------------------------------------
// Helper: Field wrapper
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

export function VehicleForm({ vehicle, open, onClose }: VehicleFormProps) {
  const { addVehicle, updateVehicle } = useInvestments()
  const isMobile = useIsMobile()

  const isEditing = !!vehicle

  // -----------------------------------------------------------------------
  // Form state
  // -----------------------------------------------------------------------

  const [name, setName] = useState("")
  const [type, setType] = useState<VehicleType>("car")
  const [make, setMake] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [variant, setVariant] = useState("")
  const [year, setYear] = useState("")
  const [color, setColor] = useState("")
  const [fuelType, setFuelType] = useState("")
  const [registrationNo, setRegistrationNo] = useState("")
  const [chassisNumber, setChassisNumber] = useState("")
  const [engineNumber, setEngineNumber] = useState("")
  const [memberId, setMemberId] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [showroomName, setShowroomName] = useState("")
  const [loanAmount, setLoanAmount] = useState("")
  const [emiAmount, setEmiAmount] = useState("")
  const [loanEndDate, setLoanEndDate] = useState("")
  const [pucExpiryDate, setPucExpiryDate] = useState("")
  const [fitnessExpiry, setFitnessExpiry] = useState("")
  const [status, setStatus] = useState<VehicleRecord["status"]>("active")
  const [currentOdometer, setCurrentOdometer] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // Scanner
  const [showScanner, setShowScanner] = useState(false)

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -----------------------------------------------------------------------
  // Populate from existing vehicle
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name)
      setType(vehicle.type)
      setMake(vehicle.make)
      setVehicleModel(vehicle.vehicleModel)
      setVariant(vehicle.variant ?? "")
      setYear(vehicle.year?.toString() ?? "")
      setColor(vehicle.color ?? "")
      setFuelType(vehicle.fuelType ?? "")
      setRegistrationNo(vehicle.registrationNo)
      setChassisNumber(vehicle.chassisNumber ?? "")
      setEngineNumber(vehicle.engineNumber ?? "")
      setMemberId(vehicle.memberId)
      setPurchaseDate(vehicle.purchaseDate ?? "")
      setPurchasePrice(vehicle.purchasePrice?.toString() ?? "")
      setShowroomName(vehicle.showroomName ?? "")
      setLoanAmount(vehicle.loanAmount?.toString() ?? "")
      setEmiAmount(vehicle.emiAmount?.toString() ?? "")
      setLoanEndDate(vehicle.loanEndDate ?? "")
      setPucExpiryDate(vehicle.pucExpiryDate ?? "")
      setFitnessExpiry(vehicle.fitnessExpiry ?? "")
      setStatus(vehicle.status)
      setCurrentOdometer(vehicle.currentOdometer?.toString() ?? "")
      setTags(vehicle.tags ?? [])
      setNotes(vehicle.notes ?? "")
    } else {
      // Reset form
      setName("")
      setType("car")
      setMake("")
      setVehicleModel("")
      setVariant("")
      setYear("")
      setColor("")
      setFuelType("")
      setRegistrationNo("")
      setChassisNumber("")
      setEngineNumber("")
      setMemberId("")
      setPurchaseDate("")
      setPurchasePrice("")
      setShowroomName("")
      setLoanAmount("")
      setEmiAmount("")
      setLoanEndDate("")
      setPucExpiryDate("")
      setFitnessExpiry("")
      setStatus("active")
      setCurrentOdometer("")
      setTags([])
      setNotes("")
    }
  }, [vehicle, open])

  // -----------------------------------------------------------------------
  // Scanner callback
  // -----------------------------------------------------------------------

  const handleScanExtracted = useCallback((data: Record<string, unknown>) => {
    if (data.name && typeof data.name === "string") setName(data.name)
    if (data.type && typeof data.type === "string") setType(data.type as VehicleType)
    if (data.make && typeof data.make === "string") setMake(data.make)
    if (data.vehicleModel && typeof data.vehicleModel === "string") setVehicleModel(data.vehicleModel)
    if (data.model && typeof data.model === "string") setVehicleModel(data.model as string)
    if (data.variant && typeof data.variant === "string") setVariant(data.variant)
    if (data.year != null) setYear(String(data.year))
    if (data.color && typeof data.color === "string") setColor(data.color)
    if (data.fuelType && typeof data.fuelType === "string") setFuelType(data.fuelType)
    if (data.registrationNo && typeof data.registrationNo === "string") setRegistrationNo(data.registrationNo)
    if (data.chassisNumber && typeof data.chassisNumber === "string") setChassisNumber(data.chassisNumber)
    if (data.engineNumber && typeof data.engineNumber === "string") setEngineNumber(data.engineNumber)
    if (data.purchaseDate && typeof data.purchaseDate === "string") setPurchaseDate(data.purchaseDate)
    if (data.purchasePrice != null) setPurchasePrice(String(data.purchasePrice))
    setShowScanner(false)
  }, [])

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!name.trim() || !memberId || !registrationNo.trim()) return

    setIsSubmitting(true)

    const payload: Record<string, unknown> = {
      memberId,
      name: name.trim(),
      type,
      make: make.trim(),
      vehicleModel: vehicleModel.trim(),
      variant: variant.trim() || undefined,
      year: year ? parseInt(year) : new Date().getFullYear(),
      color: color.trim() || undefined,
      fuelType: fuelType || undefined,
      registrationNo: registrationNo.trim(),
      chassisNumber: chassisNumber.trim() || undefined,
      engineNumber: engineNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      showroomName: showroomName.trim() || undefined,
      loanAmount: loanAmount ? parseFloat(loanAmount) : undefined,
      emiAmount: emiAmount ? parseFloat(emiAmount) : undefined,
      loanEndDate: loanEndDate || undefined,
      pucExpiryDate: pucExpiryDate || undefined,
      fitnessExpiry: fitnessExpiry || undefined,
      status,
      currentOdometer: currentOdometer ? parseInt(currentOdometer) : undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
    }

    try {
      if (isEditing) {
        await updateVehicle(vehicle.id, payload as Partial<VehicleRecord>)
      } else {
        await addVehicle(payload as Parameters<typeof addVehicle>[0])
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
        Scan RC
      </Button>

      {/* Common fields */}
      <Field label="Vehicle Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Hyundai Creta" />
      </Field>

      <Field label="Type *">
        <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {VEHICLE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Make *">
          <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Hyundai" />
        </Field>
        <Field label="Model *">
          <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="e.g. Creta" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Variant">
          <Input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="e.g. SX(O)" />
        </Field>
        <Field label="Year *">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2024" />
        </Field>
        <Field label="Color">
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. White" />
        </Field>
      </div>

      <Field label="Fuel Type">
        <Select value={fuelType} onValueChange={setFuelType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select fuel type" />
          </SelectTrigger>
          <SelectContent>
            {ALL_FUEL_TYPES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Registration Number *">
        <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="e.g. MH01AB1234" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Chassis Number">
          <Input value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} placeholder="Chassis number" />
        </Field>
        <Field label="Engine Number">
          <Input value={engineNumber} onChange={(e) => setEngineNumber(e.target.value)} placeholder="Engine number" />
        </Field>
      </div>

      <MemberSelect value={memberId} onChange={setMemberId} label="Family Member *" />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase Date">
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field label="Purchase Price">
          <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" />
        </Field>
      </div>

      <Field label="Showroom Name">
        <Input value={showroomName} onChange={(e) => setShowroomName(e.target.value)} placeholder="e.g. ABC Motors" />
      </Field>

      {/* Loan details */}
      <div className="border-t pt-3">
        <p className="text-sm font-semibold mb-3">Loan Details</p>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loan Amount">
              <Input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="EMI Amount">
              <Input type="number" value={emiAmount} onChange={(e) => setEmiAmount(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label="Loan End Date">
            <Input type="date" value={loanEndDate} onChange={(e) => setLoanEndDate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Renewals */}
      <div className="border-t pt-3">
        <p className="text-sm font-semibold mb-3">Renewals</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="PUC Expiry Date">
            <Input type="date" value={pucExpiryDate} onChange={(e) => setPucExpiryDate(e.target.value)} />
          </Field>
          <Field label="Fitness Expiry">
            <Input type="date" value={fitnessExpiry} onChange={(e) => setFitnessExpiry(e.target.value)} />
          </Field>
        </div>
      </div>

      <Field label="Status">
        <Select value={status} onValueChange={(v) => setStatus(v as VehicleRecord["status"])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_VEHICLE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Current Odometer (km)">
        <Input type="number" value={currentOdometer} onChange={(e) => setCurrentOdometer(e.target.value)} placeholder="0" />
      </Field>

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
      <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !memberId || !registrationNo.trim()}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isEditing ? "Update" : "Add"} Vehicle
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const title = isEditing ? "Edit Vehicle" : "Add Vehicle"
  const description = isEditing
    ? "Update the vehicle details below."
    : "Fill in the details to add a new vehicle."

  return (
    <>
      {/* Scanner dialog */}
      {showScanner && (
        <Scanner
          target="vehicle_rc"
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
