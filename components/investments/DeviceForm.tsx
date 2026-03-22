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
import { DEVICE_CATEGORY_LABELS } from "@/components/investments/DeviceCard"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { ScanLine, Loader2, Plus, X } from "lucide-react"
import type { DeviceRecord, DeviceCategory } from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeviceFormProps {
  device?: DeviceRecord
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: DeviceCategory[] = [
  "phone", "laptop", "tablet", "desktop", "tv",
  "appliance", "camera", "wearable", "audio", "gaming", "other",
]

const ALL_DEVICE_STATUSES: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "in_repair", label: "In Repair" },
  { value: "retired", label: "Retired" },
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

export function DeviceForm({ device, open, onClose }: DeviceFormProps) {
  const { addDevice, updateDevice } = useInvestments()
  const isMobile = useIsMobile()

  const isEditing = !!device

  // -----------------------------------------------------------------------
  // Form state
  // -----------------------------------------------------------------------

  const [name, setName] = useState("")
  const [category, setCategory] = useState<DeviceCategory>("phone")
  const [brand, setBrand] = useState("")
  const [model, setModel] = useState("")
  const [serialNumber, setSerialNumber] = useState("")
  const [imeiNumber, setImeiNumber] = useState("")
  const [memberId, setMemberId] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [purchaseStore, setPurchaseStore] = useState("")
  const [warrantyEndDate, setWarrantyEndDate] = useState("")
  const [extWarrantyEnd, setExtWarrantyEnd] = useState("")
  const [status, setStatus] = useState<DeviceRecord["status"]>("active")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // Specs key-value pairs
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([])
  const [newSpecKey, setNewSpecKey] = useState("")
  const [newSpecValue, setNewSpecValue] = useState("")

  // Scanner
  const [showScanner, setShowScanner] = useState(false)

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -----------------------------------------------------------------------
  // Populate from existing device
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (device) {
      setName(device.name)
      setCategory(device.category)
      setBrand(device.brand)
      setModel(device.model)
      setSerialNumber(device.serialNumber ?? "")
      setImeiNumber(device.imeiNumber ?? "")
      setMemberId(device.memberId)
      setPurchaseDate(device.purchaseDate ?? "")
      setPurchasePrice(device.purchasePrice?.toString() ?? "")
      setPurchaseStore(device.purchaseStore ?? "")
      setWarrantyEndDate(device.warrantyEndDate ?? "")
      setExtWarrantyEnd(device.extWarrantyEnd ?? "")
      setStatus(device.status)
      setTags(device.tags ?? [])
      setNotes(device.notes ?? "")
      setSpecs(
        device.specs
          ? Object.entries(device.specs).map(([key, value]) => ({ key, value }))
          : []
      )
    } else {
      // Reset form
      setName("")
      setCategory("phone")
      setBrand("")
      setModel("")
      setSerialNumber("")
      setImeiNumber("")
      setMemberId("")
      setPurchaseDate("")
      setPurchasePrice("")
      setPurchaseStore("")
      setWarrantyEndDate("")
      setExtWarrantyEnd("")
      setStatus("active")
      setTags([])
      setNotes("")
      setSpecs([])
      setNewSpecKey("")
      setNewSpecValue("")
    }
  }, [device, open])

  // -----------------------------------------------------------------------
  // Scanner callback
  // -----------------------------------------------------------------------

  const handleScanExtracted = useCallback((data: Record<string, unknown>) => {
    if (data.name && typeof data.name === "string") setName(data.name)
    if (data.category && typeof data.category === "string") setCategory(data.category as DeviceCategory)
    if (data.brand && typeof data.brand === "string") setBrand(data.brand)
    if (data.model && typeof data.model === "string") setModel(data.model)
    if (data.serialNumber && typeof data.serialNumber === "string") setSerialNumber(data.serialNumber)
    if (data.imeiNumber && typeof data.imeiNumber === "string") setImeiNumber(data.imeiNumber)
    if (data.purchaseDate && typeof data.purchaseDate === "string") setPurchaseDate(data.purchaseDate)
    if (data.purchasePrice != null) setPurchasePrice(String(data.purchasePrice))
    if (data.purchaseStore && typeof data.purchaseStore === "string") setPurchaseStore(data.purchaseStore)
    if (data.warrantyEndDate && typeof data.warrantyEndDate === "string") setWarrantyEndDate(data.warrantyEndDate)
    setShowScanner(false)
  }, [])

  // -----------------------------------------------------------------------
  // Specs management
  // -----------------------------------------------------------------------

  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return
    setSpecs((prev) => [...prev, { key: newSpecKey.trim(), value: newSpecValue.trim() }])
    setNewSpecKey("")
    setNewSpecValue("")
  }

  const handleRemoveSpec = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!name.trim() || !memberId) return

    setIsSubmitting(true)

    const specsObj: Record<string, string> = {}
    for (const s of specs) {
      specsObj[s.key] = s.value
    }

    const payload: Record<string, unknown> = {
      memberId,
      name: name.trim(),
      category,
      brand: brand.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim() || undefined,
      imeiNumber: imeiNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseStore: purchaseStore.trim() || undefined,
      warrantyEndDate: warrantyEndDate || undefined,
      extWarrantyEnd: extWarrantyEnd || undefined,
      status,
      specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
    }

    try {
      if (isEditing) {
        await updateDevice(device.id, payload as Partial<DeviceRecord>)
      } else {
        await addDevice(payload as Parameters<typeof addDevice>[0])
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
        Scan Invoice
      </Button>

      {/* Common fields */}
      <Field label="Device Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone 15 Pro" />
      </Field>

      <Field label="Category *">
        <Select value={category} onValueChange={(v) => setCategory(v as DeviceCategory)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {DEVICE_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand *">
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Apple" />
        </Field>
        <Field label="Model *">
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 15 Pro" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Serial Number">
          <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Serial number" />
        </Field>
        <Field label="IMEI Number">
          <Input value={imeiNumber} onChange={(e) => setImeiNumber(e.target.value)} placeholder="IMEI number" />
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

      <Field label="Purchase Store">
        <Input value={purchaseStore} onChange={(e) => setPurchaseStore(e.target.value)} placeholder="e.g. Amazon, Apple Store" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Warranty End Date">
          <Input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} />
        </Field>
        <Field label="Extended Warranty End">
          <Input type="date" value={extWarrantyEnd} onChange={(e) => setExtWarrantyEnd(e.target.value)} />
        </Field>
      </div>

      <Field label="Status">
        <Select value={status} onValueChange={(v) => setStatus(v as DeviceRecord["status"])}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_DEVICE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Specs section */}
      <div className="border-t pt-3">
        <p className="text-sm font-semibold mb-3">Specifications</p>
        <div className="flex flex-col gap-3">
          {/* Existing specs */}
          {specs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                  <span className="font-medium">{spec.key}:</span>
                  <span className="flex-1 text-muted-foreground">{spec.value}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new spec */}
          <div className="flex items-end gap-2">
            <div className="grid gap-1.5 flex-1">
              <Label className="text-xs">Key</Label>
              <Input
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="e.g. RAM"
              />
            </div>
            <div className="grid gap-1.5 flex-1">
              <Label className="text-xs">Value</Label>
              <Input
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="e.g. 8GB"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddSpec}
              disabled={!newSpecKey.trim() || !newSpecValue.trim()}
              className="shrink-0"
            >
              <Plus className="size-4" />
            </Button>
          </div>
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
        {isEditing ? "Update" : "Add"} Device
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const title = isEditing ? "Edit Device" : "Add Device"
  const description = isEditing
    ? "Update the device details below."
    : "Fill in the details to add a new device."

  return (
    <>
      {/* Scanner dialog */}
      {showScanner && (
        <Scanner
          target="device_invoice"
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
