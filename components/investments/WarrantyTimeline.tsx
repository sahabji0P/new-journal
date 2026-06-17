"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { cn } from "@/lib/utils"
import { differenceInDays, isPast, format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WarrantyItem {
  deviceName: string
  brand?: string
  model?: string
  warrantyEndDate: string | null
  daysRemaining: number | null
  status: "expired" | "expiring_soon" | "active" | "no_warranty"
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_DOT_COLORS: Record<WarrantyItem["status"], string> = {
  expired: "bg-red-500",
  expiring_soon: "bg-amber-500",
  active: "bg-emerald-500",
  no_warranty: "bg-gray-400",
}

const STATUS_TEXT_COLORS: Record<WarrantyItem["status"], string> = {
  expired: "text-red-600 dark:text-red-400",
  expiring_soon: "text-amber-600 dark:text-amber-400",
  active: "text-emerald-600 dark:text-emerald-400",
  no_warranty: "text-muted-foreground",
}

const MAX_ITEMS = 10

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WarrantyTimeline() {
  const { devices } = useInvestments()

  const items = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mapped: WarrantyItem[] = devices.map((device) => {
      // Use extended warranty end if available, otherwise regular warranty
      const endDateStr = device.extWarrantyEnd ?? device.warrantyEndDate

      if (!endDateStr) {
        return {
          deviceName: device.name,
          brand: device.brand,
          model: device.model,
          warrantyEndDate: null,
          daysRemaining: null,
          status: "no_warranty" as const,
        }
      }

      const endDate = new Date(endDateStr)
      endDate.setHours(0, 0, 0, 0)
      const days = differenceInDays(endDate, today)

      let status: WarrantyItem["status"]
      if (isPast(endDate) && days < 0) {
        status = "expired"
      } else if (days <= 30) {
        status = "expiring_soon"
      } else {
        status = "active"
      }

      return {
        deviceName: device.name,
        brand: device.brand,
        model: device.model,
        warrantyEndDate: endDateStr,
        daysRemaining: days,
        status,
      }
    })

    // Sort: expiring soon first, then active (soonest), then expired (most recent), then no warranty
    const statusOrder: Record<WarrantyItem["status"], number> = {
      expiring_soon: 0,
      active: 1,
      expired: 2,
      no_warranty: 3,
    }

    mapped.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status]
      if (orderDiff !== 0) return orderDiff

      // Within same status group, sort by days remaining
      if (a.status === "expiring_soon" || a.status === "active") {
        return (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity)
      }
      if (a.status === "expired") {
        // Most recently expired first (higher daysRemaining = more recent)
        return (b.daysRemaining ?? -Infinity) - (a.daysRemaining ?? -Infinity)
      }
      return 0
    })

    return mapped.slice(0, MAX_ITEMS)
  }, [devices])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Warranty Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices tracked yet</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warranty data available</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      STATUS_DOT_COLORS[item.status]
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.deviceName}</p>
                  {(item.brand || item.model) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[item.brand, item.model].filter(Boolean).join(" ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {item.warrantyEndDate ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.warrantyEndDate), "dd MMM yyyy")}
                      </p>
                      <p className={cn("text-xs font-medium", STATUS_TEXT_COLORS[item.status])}>
                        {item.daysRemaining != null && item.daysRemaining < 0
                          ? `Expired ${Math.abs(item.daysRemaining)} days ago`
                          : item.daysRemaining === 0
                            ? "Expires today"
                            : `${item.daysRemaining} days remaining`}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No warranty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
