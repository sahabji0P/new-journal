"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/investments/StatusBadge"
import { cn } from "@/lib/utils"
import type { VehicleRecord } from "@/lib/types"
import { Fuel } from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Car",
  motorcycle: "Motorcycle",
  scooter: "Scooter",
  bicycle: "Bicycle",
  auto: "Auto-rickshaw",
  other: "Other",
}

const VEHICLE_TYPE_COLORS: Record<string, string> = {
  car: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  motorcycle: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  scooter: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  bicycle: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  auto: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  other: "bg-muted text-muted-foreground",
}

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  electric: "Electric",
  hybrid: "Hybrid",
  cng: "CNG",
}

const FUEL_TYPE_COLORS: Record<string, string> = {
  petrol: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  diesel: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  electric: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  hybrid: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  cng: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VehicleCardProps {
  vehicle: VehicleRecord
  onClick: () => void
  formatCurrency: (n: number) => string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPucStatus(pucExpiryDate?: string) {
  if (!pucExpiryDate) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(pucExpiryDate)
  end.setHours(0, 0, 0, 0)

  if (end >= now) {
    return {
      label: "PUC Valid",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    }
  }

  return {
    label: "PUC Expired",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_COLORS }

export function VehicleCard({
  vehicle,
  onClick,
  formatCurrency,
}: VehicleCardProps) {
  const pucStatus = getPucStatus(vehicle.pucExpiryDate)

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">
              {vehicle.name}
            </CardTitle>
            {(vehicle.make || vehicle.vehicleModel || vehicle.year) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[vehicle.make, vehicle.vehicleModel, vehicle.year].filter(Boolean).join(" ")}
              </p>
            )}
          </div>
          <StatusBadge status={vehicle.status} />
        </div>

        {/* Type badge + registration + member */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              VEHICLE_TYPE_COLORS[vehicle.type] ?? VEHICLE_TYPE_COLORS.other
            )}
          >
            {VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type}
          </span>
          {vehicle.registrationNo && (
            <span className="text-xs text-muted-foreground font-mono">
              {vehicle.registrationNo}
            </span>
          )}
          {vehicle.memberName && (
            <span className="text-xs text-muted-foreground">
              {vehicle.memberName}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {vehicle.purchasePrice != null && (
            <div>
              <p className="text-xs text-muted-foreground">Purchase Price</p>
              <p className="text-sm font-mono font-medium">
                {formatCurrency(vehicle.purchasePrice)}
              </p>
            </div>
          )}
        </div>

        {/* Fuel type + PUC status */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {vehicle.fuelType && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                FUEL_TYPE_COLORS[vehicle.fuelType] ?? "bg-muted text-muted-foreground"
              )}
            >
              <Fuel className="size-3" />
              {FUEL_TYPE_LABELS[vehicle.fuelType] ?? vehicle.fuelType}
            </span>
          )}
          {pucStatus && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                pucStatus.className
              )}
            >
              {pucStatus.label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
