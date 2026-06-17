"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MemberSelect } from "@/components/investments/MemberSelect"
import { EntityTagsInput } from "@/components/investments/EntityTagsInput"
import { Scanner } from "@/components/investments/Scanner"
import { INVESTMENT_TYPE_LABELS } from "@/components/investments/InvestmentGroupFilter"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { ScanLine, Loader2 } from "lucide-react"
import { todayLocalStr } from "@/lib/utils"
import type {
  InvestmentRecord,
  InvestmentType,
  InvestmentStatus,
  TaxSection,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InvestmentFormProps {
  investment?: InvestmentRecord
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TYPES: InvestmentType[] = [
  "mutual_fund", "fixed_deposit", "ppf", "epf", "nps",
  "stocks", "gold", "real_estate", "bonds", "rd",
  "ssy", "elss", "nsc", "kvp", "scss", "crypto", "other",
]

const ALL_STATUSES: InvestmentStatus[] = ["active", "matured", "withdrawn", "closed"]

const STATUS_LABELS: Record<InvestmentStatus, string> = {
  active: "Active",
  matured: "Matured",
  withdrawn: "Withdrawn",
  closed: "Closed",
}

const TAX_SECTIONS: TaxSection[] = ["80C", "80CCC", "80CCD", "80D", "10_14", "none"]

const TAX_SECTION_LABELS: Record<TaxSection, string> = {
  "80C": "Section 80C",
  "80CCC": "Section 80CCC",
  "80CCD": "Section 80CCD(1B)",
  "80D": "Section 80D",
  "10_14": "Section 10(14)",
  none: "None",
}

// ---------------------------------------------------------------------------
// Helper: Field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className ?? "grid gap-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvestmentForm({ investment, open, onClose }: InvestmentFormProps) {
  const { addInvestment, updateInvestment } = useInvestments()
  const isMobile = useIsMobile()

  const isEditing = !!investment

  // -----------------------------------------------------------------------
  // Form state
  // -----------------------------------------------------------------------

  const [name, setName] = useState("")
  const [type, setType] = useState<InvestmentType>("mutual_fund")
  const [memberId, setMemberId] = useState("")
  const [institution, setInstitution] = useState("")
  const [investedAmount, setInvestedAmount] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [startDate, setStartDate] = useState("")
  const [maturityDate, setMaturityDate] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [status, setStatus] = useState<InvestmentStatus>("active")
  const [nominee, setNominee] = useState("")
  const [taxSection, setTaxSection] = useState<TaxSection>("none")
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // MF/ELSS
  const [folioNumber, setFolioNumber] = useState("")
  const [sipAmount, setSipAmount] = useState("")
  const [sipDay, setSipDay] = useState("")
  const [sipFrequency, setSipFrequency] = useState<"monthly" | "quarterly">("monthly")
  const [fundCategory, setFundCategory] = useState<"equity" | "debt" | "hybrid" | "elss">("equity")

  // Stocks/Crypto
  const [ticker, setTicker] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [dematAccount, setDematAccount] = useState("")
  const [broker, setBroker] = useState("")

  // FD/RD/SCSS/PPF/NPS/Bonds/NSC/KVP/SSY
  const [accountNumber, setAccountNumber] = useState("")
  const [compoundingFreq, setCompoundingFreq] = useState<"monthly" | "quarterly" | "yearly">("quarterly")
  const [autoRenew, setAutoRenew] = useState(false)

  // NPS/EPF
  const [pranNumber, setPranNumber] = useState("")
  const [uanNumber, setUanNumber] = useState("")

  // Gold
  const [goldForm, setGoldForm] = useState<"physical" | "digital" | "sgb">("physical")
  const [weightGrams, setWeightGrams] = useState("")
  const [purity, setPurity] = useState("")

  // Real Estate
  const [propertyAddress, setPropertyAddress] = useState("")
  const [propertyArea, setPropertyArea] = useState("")
  const [registrationNo, setRegistrationNo] = useState("")

  // Scanner
  const [showScanner, setShowScanner] = useState(false)

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -----------------------------------------------------------------------
  // Populate from existing investment
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (investment) {
      setName(investment.name)
      setType(investment.type)
      setMemberId(investment.memberId)
      setInstitution(investment.institution ?? "")
      setInvestedAmount(investment.investedAmount?.toString() ?? "")
      setCurrentValue(investment.currentValue?.toString() ?? "")
      setStartDate(investment.startDate ?? "")
      setMaturityDate(investment.maturityDate ?? "")
      setInterestRate(investment.interestRate?.toString() ?? "")
      setStatus(investment.status)
      setNominee(investment.nominee ?? "")
      setTaxSection(investment.taxSection ?? "none")
      setTags(investment.tags ?? [])
      setNotes(investment.notes ?? "")

      // MF
      setFolioNumber(investment.folioNumber ?? "")
      setSipAmount(investment.sipAmount?.toString() ?? "")
      setSipDay(investment.sipDay?.toString() ?? "")
      setSipFrequency(investment.sipFrequency ?? "monthly")
      setFundCategory(investment.fundCategory ?? "equity")

      // Stocks
      setTicker(investment.ticker ?? "")
      setQuantity(investment.quantity?.toString() ?? "")
      setBuyPrice(investment.buyPrice?.toString() ?? "")
      setDematAccount(investment.dematAccount ?? "")
      setBroker(investment.broker ?? "")

      // FD
      setAccountNumber(investment.accountNumber ?? "")
      setCompoundingFreq(investment.compoundingFreq ?? "quarterly")
      setAutoRenew(investment.autoRenew ?? false)

      // NPS/EPF
      setPranNumber(investment.pranNumber ?? "")
      setUanNumber(investment.uanNumber ?? "")

      // Gold
      setGoldForm(investment.goldForm ?? "physical")
      setWeightGrams(investment.weightGrams?.toString() ?? "")
      setPurity(investment.purity ?? "")

      // Real estate
      setPropertyAddress(investment.propertyAddress ?? "")
      setPropertyArea(investment.propertyArea ?? "")
      setRegistrationNo(investment.registrationNo ?? "")
    } else {
      // Reset form
      setName("")
      setType("mutual_fund")
      setMemberId("")
      setInstitution("")
      setInvestedAmount("")
      setCurrentValue("")
      setStartDate("")
      setMaturityDate("")
      setInterestRate("")
      setStatus("active")
      setNominee("")
      setTaxSection("none")
      setTags([])
      setNotes("")
      setFolioNumber("")
      setSipAmount("")
      setSipDay("")
      setSipFrequency("monthly")
      setFundCategory("equity")
      setTicker("")
      setQuantity("")
      setBuyPrice("")
      setDematAccount("")
      setBroker("")
      setAccountNumber("")
      setCompoundingFreq("quarterly")
      setAutoRenew(false)
      setPranNumber("")
      setUanNumber("")
      setGoldForm("physical")
      setWeightGrams("")
      setPurity("")
      setPropertyAddress("")
      setPropertyArea("")
      setRegistrationNo("")
    }
  }, [investment, open])

  // -----------------------------------------------------------------------
  // Scanner callback
  // -----------------------------------------------------------------------

  const handleScanExtracted = useCallback((data: Record<string, unknown>) => {
    if (data.name && typeof data.name === "string") setName(data.name)
    if (data.type && typeof data.type === "string") setType(data.type as InvestmentType)
    if (data.institution && typeof data.institution === "string") setInstitution(data.institution)
    if (data.investedAmount != null) setInvestedAmount(String(data.investedAmount))
    if (data.currentValue != null) setCurrentValue(String(data.currentValue))
    if (data.startDate && typeof data.startDate === "string") setStartDate(data.startDate)
    if (data.maturityDate && typeof data.maturityDate === "string") setMaturityDate(data.maturityDate)
    if (data.interestRate != null) setInterestRate(String(data.interestRate))
    if (data.folioNumber && typeof data.folioNumber === "string") setFolioNumber(data.folioNumber)
    if (data.accountNumber && typeof data.accountNumber === "string") setAccountNumber(data.accountNumber)
    if (data.ticker && typeof data.ticker === "string") setTicker(data.ticker)
    if (data.quantity != null) setQuantity(String(data.quantity))
    if (data.buyPrice != null) setBuyPrice(String(data.buyPrice))
    if (data.sipAmount != null) setSipAmount(String(data.sipAmount))
    if (data.pranNumber && typeof data.pranNumber === "string") setPranNumber(data.pranNumber)
    if (data.uanNumber && typeof data.uanNumber === "string") setUanNumber(data.uanNumber)
    setShowScanner(false)
  }, [])

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!name.trim() || !memberId) return

    setIsSubmitting(true)

    const payload: Record<string, unknown> = {
      memberId,
      name: name.trim(),
      type,
      institution: institution.trim(),
      investedAmount: parseFloat(investedAmount) || 0,
      currentValue: parseFloat(currentValue) || 0,
      startDate: startDate || todayLocalStr(),
      maturityDate: maturityDate || undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      status,
      nominee: nominee.trim() || undefined,
      taxSection: taxSection !== "none" ? taxSection : undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes.trim() || undefined,
    }

    // Type-specific fields
    switch (type) {
      case "mutual_fund":
      case "elss":
        if (folioNumber) payload.folioNumber = folioNumber
        if (sipAmount) payload.sipAmount = parseFloat(sipAmount)
        if (sipDay) payload.sipDay = parseInt(sipDay)
        payload.sipFrequency = sipFrequency
        payload.fundCategory = fundCategory
        break

      case "stocks":
        if (ticker) payload.ticker = ticker
        if (quantity) payload.quantity = parseFloat(quantity)
        if (buyPrice) payload.buyPrice = parseFloat(buyPrice)
        if (dematAccount) payload.dematAccount = dematAccount
        if (broker) payload.broker = broker
        break

      case "crypto":
        if (ticker) payload.ticker = ticker
        if (quantity) payload.quantity = parseFloat(quantity)
        if (buyPrice) payload.buyPrice = parseFloat(buyPrice)
        break

      case "fixed_deposit":
      case "rd":
      case "scss":
        if (accountNumber) payload.accountNumber = accountNumber
        payload.compoundingFreq = compoundingFreq
        payload.autoRenew = autoRenew
        break

      case "ppf":
      case "nps":
        if (accountNumber) payload.accountNumber = accountNumber
        if (pranNumber) payload.pranNumber = pranNumber
        break

      case "epf":
        if (uanNumber) payload.uanNumber = uanNumber
        break

      case "gold":
        payload.goldForm = goldForm
        if (weightGrams) payload.weightGrams = parseFloat(weightGrams)
        if (purity) payload.purity = purity
        break

      case "real_estate":
        if (propertyAddress) payload.propertyAddress = propertyAddress
        if (propertyArea) payload.propertyArea = propertyArea
        if (registrationNo) payload.registrationNo = registrationNo
        break

      case "bonds":
      case "nsc":
      case "kvp":
      case "ssy":
        if (accountNumber) payload.accountNumber = accountNumber
        break
    }

    try {
      if (isEditing) {
        await updateInvestment(investment.id, payload as Partial<InvestmentRecord>)
      } else {
        await addInvestment(payload as Parameters<typeof addInvestment>[0])
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Type-specific fields
  // -----------------------------------------------------------------------

  const renderTypeSpecificFields = () => {
    switch (type) {
      case "mutual_fund":
      case "elss":
        return (
          <>
            <Field label="Folio Number">
              <Input value={folioNumber} onChange={(e) => setFolioNumber(e.target.value)} placeholder="e.g. 1234567890" />
            </Field>
            <Field label="Fund Category">
              <Select value={fundCategory} onValueChange={(v) => setFundCategory(v as typeof fundCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="debt">Debt</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="elss">ELSS</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="SIP Amount">
              <Input type="number" value={sipAmount} onChange={(e) => setSipAmount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="SIP Day">
              <Input type="number" min={1} max={28} value={sipDay} onChange={(e) => setSipDay(e.target.value)} placeholder="1-28" />
            </Field>
            <Field label="SIP Frequency">
              <Select value={sipFrequency} onValueChange={(v) => setSipFrequency(v as typeof sipFrequency)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </>
        )

      case "fixed_deposit":
      case "rd":
      case "scss":
        return (
          <>
            <Field label="Account Number">
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" />
            </Field>
            <Field label="Compounding Frequency">
              <Select value={compoundingFreq} onValueChange={(v) => setCompoundingFreq(v as typeof compoundingFreq)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Auto Renew" className="flex flex-row items-center gap-3">
              <Checkbox
                checked={autoRenew}
                onCheckedChange={(checked) => setAutoRenew(checked === true)}
              />
              <Label className="font-normal">Enable auto-renewal</Label>
            </Field>
          </>
        )

      case "stocks":
        return (
          <>
            <Field label="Ticker">
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g. RELIANCE" />
            </Field>
            <Field label="Quantity">
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Buy Price">
              <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Demat Account">
              <Input value={dematAccount} onChange={(e) => setDematAccount(e.target.value)} placeholder="Demat account number" />
            </Field>
            <Field label="Broker">
              <Input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. Zerodha" />
            </Field>
          </>
        )

      case "crypto":
        return (
          <>
            <Field label="Ticker">
              <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="e.g. BTC" />
            </Field>
            <Field label="Quantity">
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Buy Price">
              <Input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" />
            </Field>
          </>
        )

      case "ppf":
      case "nps":
        return (
          <>
            <Field label={type === "nps" ? "PRAN Number" : "Account Number"}>
              {type === "nps" ? (
                <Input value={pranNumber} onChange={(e) => setPranNumber(e.target.value)} placeholder="PRAN number" />
              ) : (
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" />
              )}
            </Field>
          </>
        )

      case "epf":
        return (
          <Field label="UAN Number">
            <Input value={uanNumber} onChange={(e) => setUanNumber(e.target.value)} placeholder="UAN number" />
          </Field>
        )

      case "gold":
        return (
          <>
            <Field label="Gold Form">
              <Select value={goldForm} onValueChange={(v) => setGoldForm(v as typeof goldForm)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="sgb">SGB</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Weight (grams)">
              <Input type="number" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Purity">
              <Input value={purity} onChange={(e) => setPurity(e.target.value)} placeholder="e.g. 24K" />
            </Field>
          </>
        )

      case "real_estate":
        return (
          <>
            <Field label="Property Address">
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="Full address"
                rows={3}
              />
            </Field>
            <Field label="Property Area">
              <Input value={propertyArea} onChange={(e) => setPropertyArea(e.target.value)} placeholder="e.g. 1200 sq ft" />
            </Field>
            <Field label="Registration Number">
              <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="Registration number" />
            </Field>
          </>
        )

      case "bonds":
      case "nsc":
      case "kvp":
      case "ssy":
        return (
          <Field label="Account Number">
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" />
          </Field>
        )

      default:
        return null
    }
  }

  // -----------------------------------------------------------------------
  // Form Content
  // -----------------------------------------------------------------------

  const formContent = (
    <div className="flex flex-col gap-4 overflow-y-auto px-1">
      {/* Scan button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setShowScanner(true)}
      >
        <ScanLine className="size-4" />
        Scan Document
      </Button>

      {/* Common fields */}
      <Field label="Investment Name *">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Top 100 Fund" />
      </Field>

      <Field label="Type *">
        <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {INVESTMENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <MemberSelect value={memberId} onChange={setMemberId} label="Family Member *" />

      <Field label="Institution">
        <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. HDFC AMC, SBI" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Invested Amount *">
          <Input type="number" value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Current Value *">
          <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start Date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Maturity Date">
          <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest Rate (%)">
          <Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as InvestmentStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Nominee">
        <Input value={nominee} onChange={(e) => setNominee(e.target.value)} placeholder="Nominee name" />
      </Field>

      <Field label="Tax Section">
        <Select value={taxSection} onValueChange={(v) => setTaxSection(v as TaxSection)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAX_SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {TAX_SECTION_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Divider for type-specific fields */}
      {(() => {
        const typeFields = renderTypeSpecificFields()
        return typeFields ? (
          <div className="border-t pt-3">
            <p className="text-sm font-semibold mb-3">
              {INVESTMENT_TYPE_LABELS[type]} Details
            </p>
            <div className="flex flex-col gap-4">
              {typeFields}
            </div>
          </div>
        ) : null
      })()}

      {/* Tags */}
      <Field label="Tags">
        <EntityTagsInput tags={tags} onChange={setTags} placeholder="Add a tag..." />
      </Field>

      {/* Notes */}
      <Field label="Notes">
        <textarea
          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </Field>
    </div>
  )

  const footer = (
    <div className="flex items-center gap-2 justify-end">
      <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !memberId}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isEditing ? "Update" : "Add"} Investment
      </Button>
    </div>
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const title = isEditing ? "Edit Investment" : "Add Investment"
  const description = isEditing
    ? "Update the investment details below."
    : "Fill in the details to add a new investment."

  return (
    <>
      {/* Scanner dialog */}
      {showScanner && (
        <Scanner
          target="investment_statement"
          onExtracted={handleScanExtracted}
          onClose={() => setShowScanner(false)}
        />
      )}

      {isMobile ? (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{formContent}</div>
            <SheetFooter>{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
