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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/investments/StatusBadge"
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_COLORS } from "@/components/investments/VehicleCard"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Pencil, Trash2, Plus, Wrench, Fuel } from "lucide-react"
import type { VehicleRecord, ServiceEntry, FuelEntry } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  electric: "Electric",
  hybrid: "Hybrid",
  cng: "CNG",
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  repair: "Repair",
  accident: "Accident",
  other: "Other",
}

const SERVICE_TYPE_COLORS: Record<string, string> = {
  regular: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  repair: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  accident: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  other: "bg-muted text-muted-foreground",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VehicleDetailProps {
  vehicle: VehicleRecord
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

function getExpiryStatusColor(dateStr: string): string {
  const days = getDaysRemaining(dateStr)
  if (days < 0) return "text-red-600 dark:text-red-400"
  if (days <= 30) return "text-amber-600 dark:text-amber-400"
  return "text-emerald-600 dark:text-emerald-400"
}

function getExpiryStatusText(dateStr: string): string {
  const days = getDaysRemaining(dateStr)
  if (days < 0) return `Expired ${Math.abs(days)} days ago`
  if (days === 0) return "Expires today"
  return `${days} days remaining`
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

export function VehicleDetail({
  vehicle,
  open,
  onClose,
  onEdit,
}: VehicleDetailProps) {
  const { formatCurrency, deleteVehicle, updateVehicle } = useInvestments()
  const isMobile = useIsMobile()

  // Inline service form state
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [serviceDate, setServiceDate] = useState("")
  const [serviceType, setServiceType] = useState<ServiceEntry["type"]>("regular")
  const [serviceDescription, setServiceDescription] = useState("")
  const [serviceCost, setServiceCost] = useState("")
  const [serviceOdometer, setServiceOdometer] = useState("")
  const [serviceProvider, setServiceProvider] = useState("")
  const [isAddingService, setIsAddingService] = useState(false)

  // Inline fuel log form state
  const [showFuelForm, setShowFuelForm] = useState(false)
  const [fuelDate, setFuelDate] = useState("")
  const [fuelQuantity, setFuelQuantity] = useState("")
  const [fuelCost, setFuelCost] = useState("")
  const [fuelOdometer, setFuelOdometer] = useState("")
  const [isAddingFuel, setIsAddingFuel] = useState(false)

  const handleDelete = async () => {
    await deleteVehicle(vehicle.id)
    onClose()
  }

  const handleAddService = async () => {
    if (!serviceDescription.trim() || !serviceDate) return

    setIsAddingService(true)
    const newEntry: ServiceEntry = {
      id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: serviceDate,
      type: serviceType,
      description: serviceDescription.trim(),
      cost: parseFloat(serviceCost) || 0,
      odometerReading: serviceOdometer ? parseInt(serviceOdometer) : undefined,
      provider: serviceProvider.trim() || undefined,
    }

    const updatedHistory = [...(vehicle.serviceHistory ?? []), newEntry]

    try {
      await updateVehicle(vehicle.id, { serviceHistory: updatedHistory })
      setShowServiceForm(false)
      setServiceDate("")
      setServiceType("regular")
      setServiceDescription("")
      setServiceCost("")
      setServiceOdometer("")
      setServiceProvider("")
    } finally {
      setIsAddingService(false)
    }
  }

  const handleAddFuel = async () => {
    if (!fuelDate || !fuelQuantity) return

    setIsAddingFuel(true)
    const newEntry: FuelEntry = {
      id: `fuel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: fuelDate,
      quantity: parseFloat(fuelQuantity) || 0,
      cost: parseFloat(fuelCost) || 0,
      odometerReading: fuelOdometer ? parseInt(fuelOdometer) : undefined,
    }

    const updatedLog = [...(vehicle.fuelLog ?? []), newEntry]

    try {
      await updateVehicle(vehicle.id, { fuelLog: updatedLog })
      setShowFuelForm(false)
      setFuelDate("")
      setFuelQuantity("")
      setFuelCost("")
      setFuelOdometer("")
    } finally {
      setIsAddingFuel(false)
    }
  }

  // Average fuel consumption
  const averageConsumption = (() => {
    const log = vehicle.fuelLog
    if (!log || log.length < 2) return null

    const odometers = log
      .filter((e) => e.odometerReading != null)
      .map((e) => e.odometerReading!)

    if (odometers.length < 2) return null

    const minOdo = Math.min(...odometers)
    const maxOdo = Math.max(...odometers)
    const distance = maxOdo - minOdo

    if (distance <= 0) return null

    const totalQuantity = log.reduce((sum, e) => sum + e.quantity, 0)
    return ((totalQuantity / distance) * 100).toFixed(1)
  })()

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
              VEHICLE_TYPE_COLORS[vehicle.type] ?? "bg-muted text-muted-foreground"
            )}
          >
            {VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type}
          </span>
          <StatusBadge status={vehicle.status} />
        </div>
        {(vehicle.make || vehicle.vehicleModel) && (
          <p className="text-sm text-muted-foreground mt-1">
            {[vehicle.make, vehicle.vehicleModel, vehicle.variant].filter(Boolean).join(" ")}
          </p>
        )}
      </div>

      {/* Basic Info */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Basic Info</h4>
        <div className="divide-y">
          <DetailRow label="Name" value={vehicle.name} />
          <DetailRow label="Type" value={VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type} />
          <DetailRow label="Make" value={vehicle.make} />
          <DetailRow label="Model" value={vehicle.vehicleModel} />
          <DetailRow label="Variant" value={vehicle.variant} />
          <DetailRow label="Year" value={vehicle.year?.toString()} />
          <DetailRow label="Color" value={vehicle.color} />
          <DetailRow
            label="Fuel Type"
            value={vehicle.fuelType ? FUEL_TYPE_LABELS[vehicle.fuelType] ?? vehicle.fuelType : undefined}
          />
        </div>
      </div>

      {/* Registration */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Registration</h4>
        <div className="divide-y">
          <DetailRow label="Registration No." value={vehicle.registrationNo} />
          <DetailRow label="Chassis Number" value={vehicle.chassisNumber} />
          <DetailRow label="Engine Number" value={vehicle.engineNumber} />
        </div>
      </div>

      {/* Purchase */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Purchase</h4>
        <div className="divide-y">
          <DetailRow label="Purchase Date" value={formatDate(vehicle.purchaseDate)} />
          <DetailRow
            label="Purchase Price"
            value={
              vehicle.purchasePrice != null ? (
                <span className="font-mono">{formatCurrency(vehicle.purchasePrice)}</span>
              ) : undefined
            }
          />
          <DetailRow label="Showroom" value={vehicle.showroomName} />
        </div>
      </div>

      {/* Loan Details */}
      {vehicle.loanAmount != null && vehicle.loanAmount > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Loan Details</h4>
          <div className="divide-y">
            <DetailRow
              label="Loan Amount"
              value={<span className="font-mono">{formatCurrency(vehicle.loanAmount)}</span>}
            />
            {vehicle.emiAmount != null && (
              <DetailRow
                label="EMI Amount"
                value={<span className="font-mono">{formatCurrency(vehicle.emiAmount)}</span>}
              />
            )}
            <DetailRow label="Loan End Date" value={formatDate(vehicle.loanEndDate)} />
          </div>
        </div>
      )}

      {/* Renewals */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Renewals</h4>
        <div className="divide-y">
          {vehicle.pucExpiryDate && (
            <>
              <DetailRow label="PUC Expiry" value={formatDate(vehicle.pucExpiryDate)} />
              <DetailRow
                label="PUC Status"
                value={
                  <span className={getExpiryStatusColor(vehicle.pucExpiryDate)}>
                    {getExpiryStatusText(vehicle.pucExpiryDate)}
                  </span>
                }
              />
            </>
          )}
          {vehicle.fitnessExpiry && (
            <>
              <DetailRow label="Fitness Expiry" value={formatDate(vehicle.fitnessExpiry)} />
              <DetailRow
                label="Fitness Status"
                value={
                  <span className={getExpiryStatusColor(vehicle.fitnessExpiry)}>
                    {getExpiryStatusText(vehicle.fitnessExpiry)}
                  </span>
                }
              />
            </>
          )}
          {!vehicle.pucExpiryDate && !vehicle.fitnessExpiry && (
            <p className="text-sm text-muted-foreground py-1.5">No renewal dates recorded.</p>
          )}
        </div>
      </div>

      {/* Service History */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Service History</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowServiceForm(!showServiceForm)}
          >
            <Plus className="size-3" />
            Add Service
          </Button>
        </div>

        {showServiceForm && (
          <div className="rounded-lg border p-3 mb-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceEntry["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="accident">Accident</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                placeholder="What was done?"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Odometer</Label>
                <Input
                  type="number"
                  placeholder="km"
                  value={serviceOdometer}
                  onChange={(e) => setServiceOdometer(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Provider</Label>
                <Input
                  placeholder="Name"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowServiceForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddService}
                disabled={isAddingService || !serviceDescription.trim() || !serviceDate}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {vehicle.serviceHistory && vehicle.serviceHistory.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vehicle.serviceHistory.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3 flex items-start gap-3"
              >
                <Wrench className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{entry.description}</p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                        SERVICE_TYPE_COLORS[entry.type] ?? SERVICE_TYPE_COLORS.other
                      )}
                    >
                      {SERVICE_TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(entry.date)}</span>
                    {entry.cost > 0 && (
                      <span className="font-mono">{formatCurrency(entry.cost)}</span>
                    )}
                    {entry.odometerReading != null && (
                      <span>{entry.odometerReading.toLocaleString()} km</span>
                    )}
                    {entry.provider && <span>{entry.provider}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showServiceForm && (
            <p className="text-sm text-muted-foreground">No service history recorded.</p>
          )
        )}
      </div>

      {/* Fuel Log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Fuel Log</h4>
            {averageConsumption && (
              <span className="text-xs text-muted-foreground">
                Avg: {averageConsumption} L/100km
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFuelForm(!showFuelForm)}
          >
            <Plus className="size-3" />
            Add Entry
          </Button>
        </div>

        {showFuelForm && (
          <div className="rounded-lg border p-3 mb-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Date *</Label>
                <Input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Quantity (L) *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={fuelQuantity}
                  onChange={(e) => setFuelQuantity(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Odometer</Label>
                <Input
                  type="number"
                  placeholder="km"
                  value={fuelOdometer}
                  onChange={(e) => setFuelOdometer(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFuelForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddFuel}
                disabled={isAddingFuel || !fuelDate || !fuelQuantity}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {vehicle.fuelLog && vehicle.fuelLog.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vehicle.fuelLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3 flex items-start gap-3"
              >
                <Fuel className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{entry.quantity} L</span>
                    {entry.cost > 0 && (
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(entry.cost)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(entry.date)}</span>
                    {entry.odometerReading != null && (
                      <span>{entry.odometerReading.toLocaleString()} km</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showFuelForm && (
            <p className="text-sm text-muted-foreground">No fuel entries recorded.</p>
          )
        )}
      </div>

      {/* Tags */}
      {vehicle.tags && vehicle.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {vehicle.tags.map((tag) => (
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
      {vehicle.notes && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {vehicle.notes}
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
            <SheetTitle>{vehicle.name}</SheetTitle>
            <SheetDescription>Vehicle details</SheetDescription>
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
          <DialogTitle>{vehicle.name}</DialogTitle>
          <DialogDescription>Vehicle details</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
