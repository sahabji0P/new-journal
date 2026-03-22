"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { cn } from "@/lib/utils"
import type { InsuranceType } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIFE_TYPES: InsuranceType[] = [
  "term", "endowment", "ulip", "money_back", "whole_life",
]

const HEALTH_TYPES: InsuranceType[] = [
  "health", "family_floater", "super_topup", "critical_illness",
]

const MOTOR_TYPES: InsuranceType[] = [
  "motor_comprehensive", "motor_tp",
]

const DEFAULT_LIFE_MULTIPLIER = 10
const DEFAULT_LIFE_FALLBACK = 5000000 // 50,00,000
const DEFAULT_HEALTH_RECOMMENDED = 500000 // 5,00,000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProgressColor(percent: number): string {
  if (percent >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (percent >= 50) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function getProgressBarClass(percent: number): string {
  if (percent >= 80) return "[&>div]:bg-emerald-500"
  if (percent >= 50) return "[&>div]:bg-amber-500"
  return "[&>div]:bg-red-500"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoverageAnalysis() {
  const { policies, vehicles, familyMembers, formatCurrency } = useInvestments()

  const analysis = useMemo(() => {
    // -- Life Cover --
    const lifeCover = policies
      .filter((p) => LIFE_TYPES.includes(p.type) && p.status === "active")
      .reduce((sum, p) => sum + (p.sumAssured || 0), 0)

    const selfMember = familyMembers.find((m) => m.relationship === "self")
    const recommendedLife = selfMember?.annualIncome
      ? selfMember.annualIncome * DEFAULT_LIFE_MULTIPLIER
      : DEFAULT_LIFE_FALLBACK

    const lifePercent = recommendedLife > 0
      ? Math.min(100, Math.round((lifeCover / recommendedLife) * 100))
      : 0

    // -- Health Cover --
    const healthCover = policies
      .filter((p) => HEALTH_TYPES.includes(p.type) && p.status === "active")
      .reduce((sum, p) => sum + (p.sumAssured || 0), 0)

    const recommendedHealth = DEFAULT_HEALTH_RECOMMENDED
    const healthPercent = recommendedHealth > 0
      ? Math.min(100, Math.round((healthCover / recommendedHealth) * 100))
      : 0

    // -- Motor Cover --
    const activeVehicles = vehicles.filter((v) => v.status === "active")
    const totalVehicles = activeVehicles.length
    const activeMotorPolicies = policies.filter(
      (p) => MOTOR_TYPES.includes(p.type) && p.status === "active"
    )

    // Count distinct vehicles covered by matching linkedVehicleId
    const coveredVehicleIds = new Set(
      activeMotorPolicies
        .map((p) => p.linkedVehicleId)
        .filter(Boolean)
    )
    // If no linkedVehicleId is set, count total motor policies as coverage proxy
    const insuredCount = coveredVehicleIds.size > 0
      ? coveredVehicleIds.size
      : Math.min(activeMotorPolicies.length, totalVehicles)

    const motorPercent = totalVehicles > 0
      ? Math.min(100, Math.round((insuredCount / totalVehicles) * 100))
      : 100 // No vehicles means no gap

    return {
      life: { actual: lifeCover, recommended: recommendedLife, percent: lifePercent },
      health: { actual: healthCover, recommended: recommendedHealth, percent: healthPercent },
      motor: { insured: insuredCount, total: totalVehicles, percent: motorPercent },
    }
  }, [policies, vehicles, familyMembers])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Coverage Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Life Cover */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Life Cover</span>
            <span className={cn("text-xs font-medium", getProgressColor(analysis.life.percent))}>
              {analysis.life.percent}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(analysis.life.actual)}</span>
            <span>of {formatCurrency(analysis.life.recommended)}</span>
          </div>
          <Progress
            value={analysis.life.percent}
            className={cn("h-2", getProgressBarClass(analysis.life.percent))}
          />
          {analysis.life.actual < analysis.life.recommended && (
            <p className="text-xs text-muted-foreground">
              Consider additional term cover of{" "}
              {formatCurrency(analysis.life.recommended - analysis.life.actual)}
            </p>
          )}
        </div>

        {/* Health Cover */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Health Cover</span>
            <span className={cn("text-xs font-medium", getProgressColor(analysis.health.percent))}>
              {analysis.health.percent}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(analysis.health.actual)}</span>
            <span>of {formatCurrency(analysis.health.recommended)}</span>
          </div>
          <Progress
            value={analysis.health.percent}
            className={cn("h-2", getProgressBarClass(analysis.health.percent))}
          />
          {analysis.health.actual < analysis.health.recommended && (
            <p className="text-xs text-muted-foreground">
              Consider increasing health cover by{" "}
              {formatCurrency(analysis.health.recommended - analysis.health.actual)}
            </p>
          )}
        </div>

        {/* Motor Cover */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Motor Cover</span>
            <span className={cn("text-xs font-medium", getProgressColor(analysis.motor.percent))}>
              {analysis.motor.insured} of {analysis.motor.total} vehicles insured
            </span>
          </div>
          <Progress
            value={analysis.motor.percent}
            className={cn("h-2", getProgressBarClass(analysis.motor.percent))}
          />
          {analysis.motor.insured < analysis.motor.total && (
            <p className="text-xs text-muted-foreground">
              {analysis.motor.total - analysis.motor.insured} vehicle
              {analysis.motor.total - analysis.motor.insured !== 1 ? "s" : ""} uninsured
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
