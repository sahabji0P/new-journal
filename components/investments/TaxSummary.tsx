"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Tax section configuration
// ---------------------------------------------------------------------------

interface TaxSectionConfig {
  key: string
  label: string
  limit: number
  description: string
  investmentTaxValues: string[]   // taxSection values to match from investments
  policyTaxValues: string[]       // taxSection values to match from policies
}

const TAX_SECTIONS: TaxSectionConfig[] = [
  {
    key: "80C",
    label: "Section 80C",
    limit: 150000,
    description: "PPF, ELSS, Life Insurance premium, NSC, SCSS, SSY, NPS (partial)",
    investmentTaxValues: ["80C"],
    policyTaxValues: ["80C"],
  },
  {
    key: "80CCD",
    label: "Section 80CCD(1B)",
    limit: 50000,
    description: "Additional NPS contribution",
    investmentTaxValues: ["80CCD"],
    policyTaxValues: [],
  },
  {
    key: "80D_self",
    label: "Section 80D (Self & Family)",
    limit: 25000,
    description: "Health insurance premiums for self, spouse & children",
    investmentTaxValues: [],
    policyTaxValues: ["80D"],
  },
  {
    key: "80D_senior",
    label: "Section 80D (Senior Citizen Parents)",
    limit: 50000,
    description: "Health insurance premiums for senior citizen parents",
    investmentTaxValues: [],
    policyTaxValues: [],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaxSummary() {
  const { investments, policies, formatCurrency } = useInvestments()

  const computeUtilized = (config: TaxSectionConfig): number => {
    let total = 0

    // Sum from investments
    for (const inv of investments) {
      if (
        inv.taxSection &&
        config.investmentTaxValues.includes(inv.taxSection) &&
        inv.status === "active"
      ) {
        // Use invested amount for lump-sum, or SIP amount * 12 for MFs with SIPs
        if (inv.sipAmount && inv.sipAmount > 0) {
          const multiplier = inv.sipFrequency === "quarterly" ? 4 : 12
          total += inv.sipAmount * multiplier
        } else {
          total += inv.investedAmount
        }
      }
    }

    // Sum from insurance policies
    for (const policy of policies) {
      if (
        policy.taxSection &&
        config.policyTaxValues.includes(policy.taxSection) &&
        (policy.status === "active")
      ) {
        // Annualize premium
        let annualPremium = policy.premiumAmount
        switch (policy.premiumFrequency) {
          case "monthly":
            annualPremium = policy.premiumAmount * 12
            break
          case "quarterly":
            annualPremium = policy.premiumAmount * 4
            break
          case "half_yearly":
            annualPremium = policy.premiumAmount * 2
            break
          case "yearly":
          case "single":
            annualPremium = policy.premiumAmount
            break
        }
        total += annualPremium
      }
    }

    return total
  }

  const getProgressColor = (utilized: number, limit: number): string => {
    const pct = (utilized / limit) * 100
    if (pct >= 100) return "text-emerald-600 dark:text-emerald-400"
    if (pct >= 80) return "text-amber-600 dark:text-amber-400"
    return "text-emerald-600 dark:text-emerald-400"
  }

  const getProgressBarClass = (utilized: number, limit: number): string => {
    const pct = (utilized / limit) * 100
    if (pct >= 100) return "[&>[data-slot=progress-indicator]]:bg-emerald-500"
    if (pct >= 80) return "[&>[data-slot=progress-indicator]]:bg-amber-500"
    return "[&>[data-slot=progress-indicator]]:bg-emerald-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tax Deductions Summary</CardTitle>
        <CardDescription>
          Track your tax-saving investments across sections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {TAX_SECTIONS.map((section) => {
            const utilized = computeUtilized(section)
            const pct = Math.min((utilized / section.limit) * 100, 100)
            const remaining = Math.max(section.limit - utilized, 0)
            const colorClass = getProgressColor(utilized, section.limit)
            const barClass = getProgressBarClass(utilized, section.limit)

            return (
              <div key={section.key} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <span className={cn("text-sm font-mono font-medium shrink-0", colorClass)}>
                    {formatCurrency(utilized)}
                  </span>
                </div>

                <Progress
                  value={pct}
                  className={cn("h-2", barClass)}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {pct.toFixed(0)}% of {formatCurrency(section.limit)}
                  </span>
                  <span>
                    {remaining > 0
                      ? `${formatCurrency(remaining)} remaining`
                      : "Limit reached"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
