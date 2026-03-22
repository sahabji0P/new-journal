"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PieChart,
  Shield,
  BarChart3,
  Calendar,
  CreditCard,
  Smartphone,
  Car,
  Users,
  Calculator,
  IndianRupee,
} from "lucide-react"
import { ReportConfigDialog } from "./ReportConfigDialog"
import type { InvestmentReportType } from "@/lib/types"

interface ReportTemplate {
  type: InvestmentReportType
  name: string
  description: string
  icon: React.ElementType
}

const reportTemplates: ReportTemplate[] = [
  {
    type: "portfolio_summary",
    name: "Portfolio Summary",
    description: "Complete investment portfolio overview",
    icon: PieChart,
  },
  {
    type: "insurance_coverage",
    name: "Insurance Coverage",
    description: "All active policies and coverage analysis",
    icon: Shield,
  },
  {
    type: "asset_allocation",
    name: "Asset Allocation",
    description: "Distribution across asset classes",
    icon: BarChart3,
  },
  {
    type: "maturity_calendar",
    name: "Maturity Calendar",
    description: "Upcoming investment maturities",
    icon: Calendar,
  },
  {
    type: "premium_schedule",
    name: "Premium Schedule",
    description: "Insurance premium payment schedule",
    icon: CreditCard,
  },
  {
    type: "device_inventory",
    name: "Device Inventory",
    description: "All devices with warranty status",
    icon: Smartphone,
  },
  {
    type: "vehicle_inventory",
    name: "Vehicle Inventory",
    description: "All vehicles with renewal dates",
    icon: Car,
  },
  {
    type: "family_summary",
    name: "Family Summary",
    description: "Family members with linked assets",
    icon: Users,
  },
  {
    type: "tax_planning",
    name: "Tax Planning",
    description: "Section 80C, 80D deductions summary",
    icon: Calculator,
  },
  {
    type: "net_worth",
    name: "Net Worth",
    description: "Comprehensive net worth statement",
    icon: IndianRupee,
  },
]

export function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState<InvestmentReportType | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const handleGenerate = (type: InvestmentReportType) => {
    setSelectedReportType(type)
    setShowConfig(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Reports & Downloads</h2>
        <p className="text-sm text-muted-foreground">
          Generate and download reports for your investments, insurance, and assets
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((template) => {
          const Icon = template.icon
          return (
            <Card key={template.type}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleGenerate(template.type)}
                >
                  Generate
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedReportType && (
        <ReportConfigDialog
          reportType={selectedReportType}
          open={showConfig}
          onClose={() => {
            setShowConfig(false)
            setSelectedReportType(null)
          }}
        />
      )}
    </div>
  )
}
