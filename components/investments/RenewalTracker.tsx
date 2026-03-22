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
import { differenceInDays, format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RenewalItem {
  vehicleName: string
  renewalType: "PUC" | "Fitness"
  date: string
  daysRemaining: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ITEMS = 10

const RENEWAL_TYPE_COLORS: Record<string, string> = {
  PUC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Fitness: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RenewalTracker() {
  const { vehicles } = useInvestments()

  const items = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const renewals: RenewalItem[] = []

    for (const vehicle of vehicles) {
      if (vehicle.pucExpiryDate) {
        const date = new Date(vehicle.pucExpiryDate)
        date.setHours(0, 0, 0, 0)
        renewals.push({
          vehicleName: vehicle.name,
          renewalType: "PUC",
          date: vehicle.pucExpiryDate,
          daysRemaining: differenceInDays(date, today),
        })
      }

      if (vehicle.fitnessExpiry) {
        const date = new Date(vehicle.fitnessExpiry)
        date.setHours(0, 0, 0, 0)
        renewals.push({
          vehicleName: vehicle.name,
          renewalType: "Fitness",
          date: vehicle.fitnessExpiry,
          daysRemaining: differenceInDays(date, today),
        })
      }
    }

    // Sort by date ascending (soonest first)
    renewals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return renewals.slice(0, MAX_ITEMS)
  }, [vehicles])

  function getStatusColor(daysRemaining: number): string {
    if (daysRemaining < 0) return "text-red-600 dark:text-red-400"
    if (daysRemaining <= 30) return "text-amber-600 dark:text-amber-400"
    return "text-emerald-600 dark:text-emerald-400"
  }

  function getDotColor(daysRemaining: number): string {
    if (daysRemaining < 0) return "bg-red-500"
    if (daysRemaining <= 30) return "bg-amber-500"
    return "bg-emerald-500"
  }

  function getStatusText(daysRemaining: number): string {
    if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)} days ago`
    if (daysRemaining === 0) return "Expires today"
    return `${daysRemaining} days remaining`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Upcoming Renewals</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vehicle renewals to track</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={`${item.vehicleName}-${item.renewalType}-${index}`} className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      getDotColor(item.daysRemaining)
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.vehicleName}</p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap mt-0.5",
                      RENEWAL_TYPE_COLORS[item.renewalType]
                    )}
                  >
                    {item.renewalType}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.date), "dd MMM yyyy")}
                  </p>
                  <p className={cn("text-xs font-medium", getStatusColor(item.daysRemaining))}>
                    {getStatusText(item.daysRemaining)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
