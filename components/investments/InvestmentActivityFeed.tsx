"use client"

import { useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  TrendingUp,
  Shield,
  Smartphone,
  Car,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type ActivityItem = {
  id: string
  name: string
  type: "member" | "investment" | "policy" | "device" | "vehicle"
  typeLabel: string
  createdAt: string
}

const TYPE_ICON_MAP = {
  member: Users,
  investment: TrendingUp,
  policy: Shield,
  device: Smartphone,
  vehicle: Car,
}

const TYPE_LABEL_MAP = {
  member: "Family Member",
  investment: "Investment",
  policy: "Insurance",
  device: "Device",
  vehicle: "Vehicle",
}

export function InvestmentActivityFeed() {
  const { familyMembers, investments, policies, devices, vehicles } =
    useInvestments()

  const recentActivity = useMemo(() => {
    const items: ActivityItem[] = []

    familyMembers.forEach((m) => {
      if (m.createdAt) {
        items.push({
          id: `member-${m.id}`,
          name: m.name,
          type: "member",
          typeLabel: TYPE_LABEL_MAP.member,
          createdAt: m.createdAt,
        })
      }
    })

    investments.forEach((inv) => {
      if (inv.createdAt) {
        items.push({
          id: `inv-${inv.id}`,
          name: inv.name,
          type: "investment",
          typeLabel: TYPE_LABEL_MAP.investment,
          createdAt: inv.createdAt,
        })
      }
    })

    policies.forEach((p) => {
      if (p.createdAt) {
        items.push({
          id: `policy-${p.id}`,
          name: p.name,
          type: "policy",
          typeLabel: TYPE_LABEL_MAP.policy,
          createdAt: p.createdAt,
        })
      }
    })

    devices.forEach((d) => {
      if (d.createdAt) {
        items.push({
          id: `device-${d.id}`,
          name: d.name,
          type: "device",
          typeLabel: TYPE_LABEL_MAP.device,
          createdAt: d.createdAt,
        })
      }
    })

    vehicles.forEach((v) => {
      if (v.createdAt) {
        items.push({
          id: `vehicle-${v.id}`,
          name: v.name,
          type: "vehicle",
          typeLabel: TYPE_LABEL_MAP.vehicle,
          createdAt: v.createdAt,
        })
      }
    })

    return items
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10)
  }, [familyMembers, investments, policies, devices, vehicles])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest additions across all entities</CardDescription>
      </CardHeader>
      <CardContent>
        {recentActivity.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-mono text-sm">
              No activity yet
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentActivity.map((item) => {
              const Icon = TYPE_ICON_MAP[item.type]
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.typeLabel}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
