"use client"

import { useState, useMemo } from "react"
import { useInvestments } from "@/contexts/InvestmentsContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldLabel } from "@/components/ui/field"
import { Download, Loader2 } from "lucide-react"
import { toast } from "@/lib/toast"
import type {
  InvestmentReportType,
  InvestmentType,
  FamilyMember,
  InvestmentRecord,
  InsurancePolicyRecord,
  DeviceRecord,
  VehicleRecord,
} from "@/lib/types"

interface ReportConfigDialogProps {
  reportType: InvestmentReportType
  open: boolean
  onClose: () => void
}

const reportTypeLabels: Record<InvestmentReportType, string> = {
  portfolio_summary: "Portfolio Summary",
  insurance_coverage: "Insurance Coverage",
  asset_allocation: "Asset Allocation",
  maturity_calendar: "Maturity Calendar",
  premium_schedule: "Premium Schedule",
  device_inventory: "Device Inventory",
  vehicle_inventory: "Vehicle Inventory",
  family_summary: "Family Summary",
  tax_planning: "Tax Planning",
  net_worth: "Net Worth Statement",
}

const investmentTypes: { value: InvestmentType; label: string }[] = [
  { value: "mutual_fund", label: "Mutual Funds" },
  { value: "fixed_deposit", label: "Fixed Deposits" },
  { value: "ppf", label: "PPF" },
  { value: "epf", label: "EPF" },
  { value: "nps", label: "NPS" },
  { value: "stocks", label: "Stocks" },
  { value: "gold", label: "Gold" },
  { value: "real_estate", label: "Real Estate" },
  { value: "bonds", label: "Bonds" },
  { value: "rd", label: "Recurring Deposits" },
  { value: "ssy", label: "SSY" },
  { value: "elss", label: "ELSS" },
  { value: "nsc", label: "NSC" },
  { value: "kvp", label: "KVP" },
  { value: "scss", label: "SCSS" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
]

type DatePreset = "current_fy" | "previous_fy" | "last_quarter" | "last_month" | "custom"

function getDatePreset(preset: DatePreset): { start: string; end: string } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  // Indian FY: April to March
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1

  switch (preset) {
    case "current_fy":
      return {
        start: `${fyStartYear}-04-01`,
        end: `${fyStartYear + 1}-03-31`,
      }
    case "previous_fy":
      return {
        start: `${fyStartYear - 1}-04-01`,
        end: `${fyStartYear}-03-31`,
      }
    case "last_quarter": {
      const qEnd = new Date(currentYear, currentMonth, 0)
      const quarterMonth = Math.floor(currentMonth / 3) * 3
      const qStart = new Date(currentYear, quarterMonth - 3, 1)
      const qEndDate = new Date(currentYear, quarterMonth, 0)
      return {
        start: qStart.toISOString().slice(0, 10),
        end: qEndDate.toISOString().slice(0, 10) > qEnd.toISOString().slice(0, 10)
          ? qEnd.toISOString().slice(0, 10)
          : qEndDate.toISOString().slice(0, 10),
      }
    }
    case "last_month": {
      const prevMonth = new Date(currentYear, currentMonth - 1, 1)
      const lastDay = new Date(currentYear, currentMonth, 0)
      return {
        start: prevMonth.toISOString().slice(0, 10),
        end: lastDay.toISOString().slice(0, 10),
      }
    }
    case "custom":
    default:
      return { start: "", end: "" }
  }
}

const investmentReportTypes: InvestmentReportType[] = [
  "portfolio_summary",
  "asset_allocation",
  "maturity_calendar",
  "tax_planning",
  "net_worth",
]

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// CSV generators per report type
// ---------------------------------------------------------------------------

function generatePortfolioCSV(
  investments: InvestmentRecord[],
  formatCurrency: (n: number) => string
): string {
  const headers = [
    "Name", "Type", "Member", "Institution", "Invested", "Current Value",
    "Returns", "Return %", "Status", "Maturity Date",
  ]
  const rows = investments.map((inv) => {
    const returns = inv.currentValue - inv.investedAmount
    const returnPct = inv.investedAmount > 0
      ? ((returns / inv.investedAmount) * 100).toFixed(2)
      : "0"
    return [
      escapeCSV(inv.name),
      escapeCSV(inv.type),
      escapeCSV(inv.memberName || ""),
      escapeCSV(inv.institution),
      inv.investedAmount.toFixed(2),
      inv.currentValue.toFixed(2),
      returns.toFixed(2),
      returnPct,
      escapeCSV(inv.status),
      escapeCSV(inv.maturityDate || ""),
    ].join(",")
  })
  return [headers.join(","), ...rows].join("\n")
}

function generateInsuranceCSV(policies: InsurancePolicyRecord[]): string {
  const headers = [
    "Name", "Type", "Insurer", "Policy Number", "Premium", "Frequency",
    "Sum Assured", "Status", "Start Date", "End Date",
  ]
  const rows = policies.map((p) =>
    [
      escapeCSV(p.name),
      escapeCSV(p.type),
      escapeCSV(p.insurer),
      escapeCSV(p.policyNumber),
      p.premiumAmount.toFixed(2),
      escapeCSV(p.premiumFrequency),
      p.sumAssured.toFixed(2),
      escapeCSV(p.status),
      escapeCSV(p.startDate),
      escapeCSV(p.endDate || ""),
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generateDeviceCSV(devices: DeviceRecord[]): string {
  const headers = [
    "Name", "Category", "Brand", "Model", "Serial", "Member",
    "Purchase Date", "Price", "Warranty Until", "Status",
  ]
  const rows = devices.map((d) =>
    [
      escapeCSV(d.name),
      escapeCSV(d.category),
      escapeCSV(d.brand),
      escapeCSV(d.model),
      escapeCSV(d.serialNumber || ""),
      escapeCSV(d.memberName || ""),
      escapeCSV(d.purchaseDate || ""),
      d.purchasePrice?.toFixed(2) ?? "",
      escapeCSV(d.warrantyEndDate || ""),
      escapeCSV(d.status),
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generateVehicleCSV(vehicles: VehicleRecord[]): string {
  const headers = [
    "Name", "Type", "Make", "Model", "Year", "Registration", "Member",
    "Purchase Date", "Price", "PUC Expiry", "Status",
  ]
  const rows = vehicles.map((v) =>
    [
      escapeCSV(v.name),
      escapeCSV(v.type),
      escapeCSV(v.make),
      escapeCSV(v.vehicleModel),
      String(v.year),
      escapeCSV(v.registrationNo),
      escapeCSV(v.memberName || ""),
      escapeCSV(v.purchaseDate || ""),
      v.purchasePrice?.toFixed(2) ?? "",
      escapeCSV(v.pucExpiryDate || ""),
      escapeCSV(v.status),
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generateFamilySummaryCSV(
  members: FamilyMember[],
  investments: InvestmentRecord[],
  policies: InsurancePolicyRecord[]
): string {
  const headers = [
    "Name", "Relationship", "DOB", "Phone", "Email",
    "Investments Count", "Total Invested", "Policies Count",
  ]
  const rows = members.map((m) => {
    const memberInv = investments.filter((i) => i.memberId === m.id)
    const memberPol = policies.filter((p) => p.memberId === m.id)
    const totalInvested = memberInv.reduce((sum, i) => sum + i.investedAmount, 0)
    return [
      escapeCSV(m.name),
      escapeCSV(m.relationship),
      escapeCSV(m.dateOfBirth || ""),
      escapeCSV(m.phone || ""),
      escapeCSV(m.email || ""),
      String(memberInv.length),
      totalInvested.toFixed(2),
      String(memberPol.length),
    ].join(",")
  })
  return [headers.join(","), ...rows].join("\n")
}

function generateAssetAllocationCSV(investments: InvestmentRecord[]): string {
  const headers = ["Asset Class", "Count", "Invested Amount", "Current Value", "Allocation %"]
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0)
  const grouped: Record<string, { count: number; invested: number; current: number }> = {}
  for (const inv of investments) {
    if (!grouped[inv.type]) grouped[inv.type] = { count: 0, invested: 0, current: 0 }
    grouped[inv.type].count++
    grouped[inv.type].invested += inv.investedAmount
    grouped[inv.type].current += inv.currentValue
  }
  const rows = Object.entries(grouped).map(([type, data]) =>
    [
      escapeCSV(type),
      String(data.count),
      data.invested.toFixed(2),
      data.current.toFixed(2),
      totalValue > 0 ? ((data.current / totalValue) * 100).toFixed(2) : "0",
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generateMaturityCalendarCSV(investments: InvestmentRecord[]): string {
  const headers = ["Name", "Type", "Institution", "Invested", "Current Value", "Maturity Date", "Member"]
  const withMaturity = investments
    .filter((i) => i.maturityDate)
    .sort((a, b) => (a.maturityDate! > b.maturityDate! ? 1 : -1))
  const rows = withMaturity.map((inv) =>
    [
      escapeCSV(inv.name),
      escapeCSV(inv.type),
      escapeCSV(inv.institution),
      inv.investedAmount.toFixed(2),
      inv.currentValue.toFixed(2),
      escapeCSV(inv.maturityDate || ""),
      escapeCSV(inv.memberName || ""),
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generatePremiumScheduleCSV(policies: InsurancePolicyRecord[]): string {
  const headers = [
    "Policy Name", "Insurer", "Policy Number", "Premium Amount",
    "Frequency", "Next Premium Date", "Status", "Member",
  ]
  const active = policies.filter((p) => p.status === "active")
  const rows = active.map((p) =>
    [
      escapeCSV(p.name),
      escapeCSV(p.insurer),
      escapeCSV(p.policyNumber),
      p.premiumAmount.toFixed(2),
      escapeCSV(p.premiumFrequency),
      escapeCSV(p.nextPremiumDate || ""),
      escapeCSV(p.status),
      escapeCSV(p.memberName || ""),
    ].join(",")
  )
  return [headers.join(","), ...rows].join("\n")
}

function generateTaxPlanningCSV(
  investments: InvestmentRecord[],
  policies: InsurancePolicyRecord[]
): string {
  const headers = ["Section", "Name", "Type", "Category", "Amount", "Member"]
  const rows: string[] = []

  // 80C investments
  const section80C = investments.filter((i) => i.taxSection === "80C")
  for (const inv of section80C) {
    rows.push(
      [
        "80C",
        escapeCSV(inv.name),
        escapeCSV(inv.type),
        "Investment",
        inv.investedAmount.toFixed(2),
        escapeCSV(inv.memberName || ""),
      ].join(",")
    )
  }

  // 80C insurance
  const section80CPolicies = policies.filter((p) => p.taxSection === "80C")
  for (const pol of section80CPolicies) {
    rows.push(
      [
        "80C",
        escapeCSV(pol.name),
        escapeCSV(pol.type),
        "Insurance Premium",
        pol.premiumAmount.toFixed(2),
        escapeCSV(pol.memberName || ""),
      ].join(",")
    )
  }

  // 80D health insurance
  const section80D = policies.filter((p) => p.taxSection === "80D")
  for (const pol of section80D) {
    rows.push(
      [
        "80D",
        escapeCSV(pol.name),
        escapeCSV(pol.type),
        "Health Insurance Premium",
        pol.premiumAmount.toFixed(2),
        escapeCSV(pol.memberName || ""),
      ].join(",")
    )
  }

  // 80CCD NPS
  const section80CCD = investments.filter((i) => i.taxSection === "80CCD")
  for (const inv of section80CCD) {
    rows.push(
      [
        "80CCD",
        escapeCSV(inv.name),
        escapeCSV(inv.type),
        "NPS",
        inv.investedAmount.toFixed(2),
        escapeCSV(inv.memberName || ""),
      ].join(",")
    )
  }

  return [headers.join(","), ...rows].join("\n")
}

function generateNetWorthCSV(
  investments: InvestmentRecord[],
  policies: InsurancePolicyRecord[],
  devices: DeviceRecord[],
  vehicles: VehicleRecord[]
): string {
  const headers = ["Category", "Item", "Value"]
  const rows: string[] = []

  // Investments
  const totalInvValue = investments.reduce((s, i) => s + i.currentValue, 0)
  rows.push(["Investments (Total)", "All investments", totalInvValue.toFixed(2)].join(","))
  for (const inv of investments) {
    rows.push(
      ["  Investment", escapeCSV(inv.name), inv.currentValue.toFixed(2)].join(",")
    )
  }

  // Insurance sum assured
  const totalCoverage = policies
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.sumAssured, 0)
  rows.push(["Insurance Coverage (Total)", "Active policies", totalCoverage.toFixed(2)].join(","))

  // Devices
  const totalDeviceValue = devices.reduce((s, d) => s + (d.purchasePrice || 0), 0)
  rows.push(["Devices (Purchase Value)", "All devices", totalDeviceValue.toFixed(2)].join(","))

  // Vehicles
  const totalVehicleValue = vehicles.reduce((s, v) => s + (v.purchasePrice || 0), 0)
  rows.push(["Vehicles (Purchase Value)", "All vehicles", totalVehicleValue.toFixed(2)].join(","))

  // Grand total (tangible assets)
  const grandTotal = totalInvValue + totalDeviceValue + totalVehicleValue
  rows.push(["Net Worth (Tangible Assets)", "Grand Total", grandTotal.toFixed(2)].join(","))

  return [headers.join(","), ...rows].join("\n")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportConfigDialog({ reportType, open, onClose }: ReportConfigDialogProps) {
  const {
    familyMembers,
    investments,
    policies,
    devices,
    vehicles,
    formatCurrency,
  } = useInvestments()

  const [title, setTitle] = useState(reportTypeLabels[reportType] || "Report")
  const [datePreset, setDatePreset] = useState<DatePreset>("current_fy")
  const [startDate, setStartDate] = useState(() => getDatePreset("current_fy").start)
  const [endDate, setEndDate] = useState(() => getDatePreset("current_fy").end)
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() =>
    familyMembers.map((m) => m.id)
  )
  const [selectedInvTypes, setSelectedInvTypes] = useState<InvestmentType[]>(() =>
    investmentTypes.map((t) => t.value)
  )
  const [outputFormat, setOutputFormat] = useState<"pdf" | "csv">("csv")
  const [isGenerating, setIsGenerating] = useState(false)

  const showInvestmentTypeFilter = investmentReportTypes.includes(reportType)

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== "custom") {
      const range = getDatePreset(preset)
      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  const toggleAllMembers = () => {
    if (selectedMembers.length === familyMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(familyMembers.map((m) => m.id))
    }
  }

  const toggleInvType = (type: InvestmentType) => {
    setSelectedInvTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  // Filter data based on selected members and date range
  const filteredData = useMemo(() => {
    const memberSet = new Set(selectedMembers)
    const invTypeSet = new Set(selectedInvTypes)

    const filterByDate = <T extends { startDate?: string; purchaseDate?: string }>(
      items: T[]
    ): T[] => {
      if (!startDate && !endDate) return items
      return items.filter((item) => {
        const date = (item as Record<string, unknown>).startDate as string
          || (item as Record<string, unknown>).purchaseDate as string
          || ""
        if (startDate && date && date < startDate) return false
        if (endDate && date && date > endDate) return false
        return true
      })
    }

    const filtInvestments = filterByDate(
      investments
        .filter((i) => memberSet.has(i.memberId))
        .filter((i) => !showInvestmentTypeFilter || invTypeSet.has(i.type))
    )

    const filtPolicies = filterByDate(
      policies.filter((p) => memberSet.has(p.memberId))
    )

    const filtDevices = devices.filter((d) => memberSet.has(d.memberId))
    const filtVehicles = vehicles.filter((v) => memberSet.has(v.memberId))
    const filtMembers = familyMembers.filter((m) => memberSet.has(m.id))

    return {
      investments: filtInvestments,
      policies: filtPolicies,
      devices: filtDevices,
      vehicles: filtVehicles,
      members: filtMembers,
    }
  }, [
    selectedMembers,
    selectedInvTypes,
    startDate,
    endDate,
    investments,
    policies,
    devices,
    vehicles,
    familyMembers,
    showInvestmentTypeFilter,
  ])

  const handleGenerate = () => {
    setIsGenerating(true)

    try {
      if (outputFormat === "pdf") {
        toast.info("PDF export coming soon. Downloading CSV instead.")
      }

      let csvContent: string
      let filename: string

      switch (reportType) {
        case "portfolio_summary":
          csvContent = generatePortfolioCSV(filteredData.investments, formatCurrency)
          filename = "portfolio-summary.csv"
          break
        case "insurance_coverage":
          csvContent = generateInsuranceCSV(filteredData.policies)
          filename = "insurance-coverage.csv"
          break
        case "asset_allocation":
          csvContent = generateAssetAllocationCSV(filteredData.investments)
          filename = "asset-allocation.csv"
          break
        case "maturity_calendar":
          csvContent = generateMaturityCalendarCSV(filteredData.investments)
          filename = "maturity-calendar.csv"
          break
        case "premium_schedule":
          csvContent = generatePremiumScheduleCSV(filteredData.policies)
          filename = "premium-schedule.csv"
          break
        case "device_inventory":
          csvContent = generateDeviceCSV(filteredData.devices)
          filename = "device-inventory.csv"
          break
        case "vehicle_inventory":
          csvContent = generateVehicleCSV(filteredData.vehicles)
          filename = "vehicle-inventory.csv"
          break
        case "family_summary":
          csvContent = generateFamilySummaryCSV(
            filteredData.members,
            filteredData.investments,
            filteredData.policies
          )
          filename = "family-summary.csv"
          break
        case "tax_planning":
          csvContent = generateTaxPlanningCSV(filteredData.investments, filteredData.policies)
          filename = "tax-planning.csv"
          break
        case "net_worth":
          csvContent = generateNetWorthCSV(
            filteredData.investments,
            filteredData.policies,
            filteredData.devices,
            filteredData.vehicles
          )
          filename = "net-worth.csv"
          break
        default:
          toast.error("Unknown report type")
          return
      }

      const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-").toLowerCase()
      filename = sanitizedTitle ? `${sanitizedTitle}.csv` : filename

      downloadFile(csvContent, filename, "text/csv")
      toast.success(`Report downloaded`, { description: filename })
      onClose()
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Configure Report</DialogTitle>
          <DialogDescription className="text-xs">
            Customize the report settings before generating
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Report Title */}
          <div>
            <FieldLabel htmlFor="report-title">Report Title</FieldLabel>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <FieldLabel>Date Range</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "current_fy", label: "Current FY" },
                  { key: "previous_fy", label: "Previous FY" },
                  { key: "last_quarter", label: "Last Quarter" },
                  { key: "last_month", label: "Last Month" },
                  { key: "custom", label: "Custom" },
                ] as const
              ).map(({ key, label }) => (
                <Button
                  key={key}
                  variant={datePreset === key ? "default" : "outline"}
                  size="xs"
                  onClick={() => handlePresetChange(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="report-start-date" className="text-xs">
                  Start Date
                </FieldLabel>
                <Input
                  id="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setDatePreset("custom")
                  }}
                />
              </div>
              <div>
                <FieldLabel htmlFor="report-end-date" className="text-xs">
                  End Date
                </FieldLabel>
                <Input
                  id="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setDatePreset("custom")
                  }}
                />
              </div>
            </div>
          </div>

          {/* Family Members Filter */}
          {familyMembers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Family Members</FieldLabel>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={toggleAllMembers}
                  className="text-xs"
                >
                  {selectedMembers.length === familyMembers.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {familyMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <span className="truncate">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Investment Types Filter */}
          {showInvestmentTypeFilter && (
            <div className="space-y-2">
              <FieldLabel>Investment Types</FieldLabel>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {investmentTypes.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedInvTypes.includes(value)}
                      onCheckedChange={() => toggleInvType(value)}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <FieldLabel>Format</FieldLabel>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={outputFormat === "csv"}
                  onChange={() => setOutputFormat("csv")}
                  className="accent-primary"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={outputFormat === "pdf"}
                  onChange={() => setOutputFormat("pdf")}
                  className="accent-primary"
                />
                PDF
              </label>
            </div>
            {outputFormat === "pdf" && (
              <p className="text-xs text-muted-foreground">
                PDF export is coming soon. CSV will be downloaded instead.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedMembers.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Generate & Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
