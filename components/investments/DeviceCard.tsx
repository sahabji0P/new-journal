"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/investments/StatusBadge"
import { cn } from "@/lib/utils"
import type { DeviceRecord } from "@/lib/types"
import { CalendarClock, ShieldCheck, ShieldX, ShieldOff } from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICE_CATEGORY_LABELS: Record<string, string> = {
  phone: "Phone",
  laptop: "Laptop",
  tablet: "Tablet",
  desktop: "Desktop",
  tv: "TV",
  appliance: "Appliance",
  camera: "Camera",
  wearable: "Wearable",
  audio: "Audio",
  gaming: "Gaming",
  other: "Other",
}

const DEVICE_CATEGORY_COLORS: Record<string, string> = {
  phone: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  laptop: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  tablet: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  desktop: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  tv: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  appliance: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  camera: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  wearable: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  audio: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  gaming: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  other: "bg-muted text-muted-foreground",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeviceCardProps {
  device: DeviceRecord
  onClick: () => void
  formatCurrency: (n: number) => string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWarrantyStatus(warrantyEndDate?: string, extWarrantyEnd?: string) {
  if (!warrantyEndDate && !extWarrantyEnd) {
    return { label: "No Warranty", variant: "muted" as const, icon: ShieldOff }
  }

  const endDate = extWarrantyEnd ?? warrantyEndDate!
  const now = new Date()
  const end = new Date(endDate)

  if (end > now) {
    return { label: "In Warranty", variant: "green" as const, icon: ShieldCheck }
  }

  return { label: "Warranty Expired", variant: "red" as const, icon: ShieldX }
}

const warrantyColorMap = {
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  muted: "bg-muted text-muted-foreground",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export { DEVICE_CATEGORY_LABELS, DEVICE_CATEGORY_COLORS }

export function DeviceCard({
  device,
  onClick,
  formatCurrency,
}: DeviceCardProps) {
  const warranty = getWarrantyStatus(device.warrantyEndDate, device.extWarrantyEnd)
  const WarrantyIcon = warranty.icon

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm">
              {device.name}
            </CardTitle>
            {(device.brand || device.model) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {[device.brand, device.model].filter(Boolean).join(" ")}
              </p>
            )}
          </div>
          <StatusBadge status={device.status} />
        </div>

        {/* Category badge + member */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              DEVICE_CATEGORY_COLORS[device.category] ?? DEVICE_CATEGORY_COLORS.other
            )}
          >
            {DEVICE_CATEGORY_LABELS[device.category] ?? device.category}
          </span>
          {device.memberName && (
            <span className="text-xs text-muted-foreground">
              {device.memberName}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {device.purchasePrice != null && (
            <div>
              <p className="text-xs text-muted-foreground">Purchase Price</p>
              <p className="text-sm font-mono font-medium">
                {formatCurrency(device.purchasePrice)}
              </p>
            </div>
          )}
          {device.purchaseDate && (
            <div>
              <p className="text-xs text-muted-foreground">Purchased</p>
              <p className="text-sm font-medium">
                {new Date(device.purchaseDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Warranty status */}
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              warrantyColorMap[warranty.variant]
            )}
          >
            <WarrantyIcon className="size-3" />
            {warranty.label}
          </span>
          {device.extWarrantyEnd && warranty.variant === "green" && (
            <span className="text-xs text-muted-foreground">
              (Extended)
            </span>
          )}
        </div>

        {/* Bottom row: warranty end date */}
        {device.warrantyEndDate && (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" />
              Warranty ends{" "}
              {new Date(device.warrantyEndDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
