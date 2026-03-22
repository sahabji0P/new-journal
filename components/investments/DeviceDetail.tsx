"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/investments/StatusBadge"
import { DEVICE_CATEGORY_LABELS, DEVICE_CATEGORY_COLORS } from "@/components/investments/DeviceCard"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Pencil, Trash2, Plus, Wrench } from "lucide-react"
import type { DeviceRecord, RepairEntry } from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeviceDetailProps {
  device: DeviceRecord
  open: boolean
  onClose: () => void
  onEdit: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string | undefined): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getDaysRemaining(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || value === "-") return null
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeviceDetail({
  device,
  open,
  onClose,
  onEdit,
}: DeviceDetailProps) {
  const { formatCurrency, deleteDevice, updateDevice } = useInvestments()
  const isMobile = useIsMobile()

  // Inline repair form state
  const [showRepairForm, setShowRepairForm] = useState(false)
  const [repairDate, setRepairDate] = useState("")
  const [repairDescription, setRepairDescription] = useState("")
  const [repairCost, setRepairCost] = useState("")
  const [repairProvider, setRepairProvider] = useState("")
  const [isAddingRepair, setIsAddingRepair] = useState(false)

  const handleDelete = async () => {
    await deleteDevice(device.id)
    onClose()
  }

  const handleAddRepair = async () => {
    if (!repairDescription.trim() || !repairDate) return

    setIsAddingRepair(true)
    const newEntry: RepairEntry = {
      id: `repair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: repairDate,
      description: repairDescription.trim(),
      cost: parseFloat(repairCost) || 0,
      provider: repairProvider.trim() || undefined,
    }

    const updatedHistory = [...(device.repairHistory ?? []), newEntry]

    try {
      await updateDevice(device.id, { repairHistory: updatedHistory })
      setShowRepairForm(false)
      setRepairDate("")
      setRepairDescription("")
      setRepairCost("")
      setRepairProvider("")
    } finally {
      setIsAddingRepair(false)
    }
  }

  // Warranty info
  const warrantyDays = device.warrantyEndDate ? getDaysRemaining(device.warrantyEndDate) : null
  const extWarrantyDays = device.extWarrantyEnd ? getDaysRemaining(device.extWarrantyEnd) : null

  // -----------------------------------------------------------------------
  // Content
  // -----------------------------------------------------------------------

  const content = (
    <div className="flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              DEVICE_CATEGORY_COLORS[device.category] ?? "bg-muted text-muted-foreground"
            )}
          >
            {DEVICE_CATEGORY_LABELS[device.category] ?? device.category}
          </span>
          <StatusBadge status={device.status} />
        </div>
        {(device.brand || device.model) && (
          <p className="text-sm text-muted-foreground mt-1">
            {[device.brand, device.model].filter(Boolean).join(" ")}
          </p>
        )}
      </div>

      {/* Basic Info */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Basic Info</h4>
        <div className="divide-y">
          <DetailRow label="Name" value={device.name} />
          <DetailRow label="Brand" value={device.brand} />
          <DetailRow label="Model" value={device.model} />
          <DetailRow label="Serial Number" value={device.serialNumber} />
          <DetailRow label="IMEI Number" value={device.imeiNumber} />
          {device.memberName && <DetailRow label="Owner" value={device.memberName} />}
        </div>
      </div>

      {/* Purchase */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Purchase</h4>
        <div className="divide-y">
          <DetailRow label="Purchase Date" value={formatDate(device.purchaseDate)} />
          <DetailRow
            label="Purchase Price"
            value={
              device.purchasePrice != null ? (
                <span className="font-mono">{formatCurrency(device.purchasePrice)}</span>
              ) : undefined
            }
          />
          <DetailRow label="Purchase Store" value={device.purchaseStore} />
        </div>
      </div>

      {/* Warranty */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Warranty</h4>
        <div className="divide-y">
          <DetailRow label="Warranty End Date" value={formatDate(device.warrantyEndDate)} />
          {warrantyDays != null && (
            <DetailRow
              label="Warranty Status"
              value={
                warrantyDays > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {warrantyDays} days remaining
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Expired {Math.abs(warrantyDays)} days ago
                  </span>
                )
              }
            />
          )}
          <DetailRow label="Extended Warranty End" value={formatDate(device.extWarrantyEnd)} />
          {extWarrantyDays != null && (
            <DetailRow
              label="Ext. Warranty Status"
              value={
                extWarrantyDays > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {extWarrantyDays} days remaining
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Expired {Math.abs(extWarrantyDays)} days ago
                  </span>
                )
              }
            />
          )}
        </div>
      </div>

      {/* Specs */}
      {device.specs && Object.keys(device.specs).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Specifications</h4>
          <div className="divide-y">
            {Object.entries(device.specs).map(([key, value]) => (
              <DetailRow key={key} label={key} value={value} />
            ))}
          </div>
        </div>
      )}

      {/* Repair History */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Repair History</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRepairForm(!showRepairForm)}
          >
            <Plus className="size-3" />
            Add Repair
          </Button>
        </div>

        {showRepairForm && (
          <div className="rounded-lg border p-3 mb-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                placeholder="What was repaired?"
                value={repairDescription}
                onChange={(e) => setRepairDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Service Provider</Label>
              <Input
                placeholder="Provider name"
                value={repairProvider}
                onChange={(e) => setRepairProvider(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRepairForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddRepair}
                disabled={isAddingRepair || !repairDescription.trim() || !repairDate}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {device.repairHistory && device.repairHistory.length > 0 ? (
          <div className="flex flex-col gap-2">
            {device.repairHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3 flex items-start gap-3"
              >
                <Wrench className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(entry.date)}</span>
                    {entry.cost > 0 && (
                      <span className="font-mono">{formatCurrency(entry.cost)}</span>
                    )}
                    {entry.provider && <span>{entry.provider}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showRepairForm && (
            <p className="text-sm text-muted-foreground">No repair history recorded.</p>
          )
        )}
      </div>

      {/* Insurance link */}
      {device.linkedInsuranceId && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Insurance</h4>
          <p className="text-sm text-muted-foreground">
            Linked to insurance policy (ID: {device.linkedInsuranceId})
          </p>
        </div>
      )}

      {/* Tags */}
      {device.tags && device.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {device.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {device.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {device.notes}
          </p>
        </div>
      )}
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onEdit}>
        <Pencil className="size-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        <Trash2 className="size-4" />
        Delete
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{device.name}</SheetTitle>
            <SheetDescription>Device details</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{content}</div>
          <SheetFooter>{footer}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device.name}</DialogTitle>
          <DialogDescription>Device details</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
