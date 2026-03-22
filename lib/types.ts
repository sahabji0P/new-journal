// Core Data Models for CORE Finance Workspace
// Note: All IDs are strings (cuid) to match database schema

// Split Expense Models
export interface ExpenseSplit {
  id: string
  personName: string
  amount: number
  isPaid: boolean
  paidDate?: string
}

// Receipt/Attachment Models
export interface Receipt {
  id: string
  transactionId?: string
  fileName: string
  fileUrl?: string // URL for cloud storage
  imageData?: string // Base64 data for client-side handling
  thumbnailData?: string // Optional thumbnail
  fileType?: string
  fileSize?: number // in bytes
  uploadDate?: string // When the receipt was uploaded
}

// Transaction Template Models
export interface TransactionTemplate {
  id: string
  name: string
  description?: string
  amount?: number // Optional, user can override
  category: string
  type: "income" | "expense"
  party?: string
  tags?: string[]
  accountId?: string
  notes?: string
  icon?: string
  color?: string
  isActive?: boolean
}

// Settlement Models (Who owes whom)
export interface Settlement {
  id: string
  party: string // Counterparty name
  amount: number
  type: "owed_to_me" | "i_owe"
  reason?: string
  isSettled: boolean
  settledAt?: string
}

export interface SettlementGroupMember {
  id: string
  userId: string
  name: string
  email: string
  role: "owner" | "member"
  joinedAt: string
}

export interface SettlementGroupInvite {
  id: string
  groupId: string
  groupName: string
  invitedById: string
  invitedByName: string
  invitedEmail: string
  status: "pending" | "accepted" | "declined"
  createdAt: string
  respondedAt?: string
}

export interface GroupSplitShare {
  userId: string
  name: string
  amount: number
  amountCents?: number
  isPaid: boolean
  paidAt?: string
  percentage?: number
}

export interface SettlementGroupTransaction {
  id: string
  groupId: string
  transactionType?: "expense" | "settlement"
  splitType?: "equal" | "custom" | "percentage"
  description: string
  totalAmount: number
  totalAmountCents?: number
  paidByUserId: string
  paidByName: string
  shares: GroupSplitShare[]
  fromUserId?: string
  fromUserName?: string
  toUserId?: string
  toUserName?: string
  notes?: string
  createdAt: string
}

export interface SettlementGroupBalance {
  userId: string
  name: string
  email: string
  balance: number
  balanceCents?: number
}

export interface SettlementGroupSuggestion {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
  amountCents?: number
}

export interface SettlementGroup {
  id: string
  name: string
  description?: string
  createdById: string
  createdByName: string
  members: SettlementGroupMember[]
  transactions: SettlementGroupTransaction[]
  balances?: SettlementGroupBalance[]
  suggestions?: SettlementGroupSuggestion[]
  createdAt: string
  updatedAt: string
}

export type GroupChatMessageType =
  | "text"
  | "expense"
  | "settlement"
  | "system"
  | "bill_analysis"

export interface GroupChatMessage {
  id: string
  groupId: string
  senderId: string
  senderName: string
  senderImage?: string
  type: GroupChatMessageType
  content: string
  transactionId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface BillAnalysisItem {
  name: string
  quantity?: number
  price: number
}

export interface BillAnalysisResult {
  merchantName?: string
  items: BillAnalysisItem[]
  subtotal?: number
  tax?: number
  total: number
  currency?: string
  error?: string
}

export interface Transaction {
  id: string
  description: string
  amount: number // Positive for income, negative for expenses
  date: string // ISO date string
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
  party?: string // Payee/Payer name (e.g., "Amazon", "Walmart")
  notes?: string // Optional notes
  tags?: string[] // Optional tags for custom tracking
  recurringId?: string // Link to recurring transaction if auto-created

  // Split expense fields
  isShared?: boolean // Whether this is a shared/split expense
  splits?: ExpenseSplit[] // How the expense is split among people
  totalAmount?: number // Original amount before split (for shared expenses)

  // Receipt and template fields
  receiptId?: string // Link to receipt image
  templateId?: string // If created from a template
  budgetId?: string // Optional budget context used in form prefill
  createdAt?: string
  updatedAt?: string
}

export interface Party {
  id: string
  name: string // Name of payee/payer (e.g., "Amazon", "Starbucks", "Netflix")
}

export interface Account {
  id: string
  name: string
  balance: number // Can be negative for credit accounts
  type: "checking" | "savings" | "credit"
  color?: string // Optional color for UI
  icon?: string // Optional icon identifier
  isActive?: boolean
}

export interface SubBudget {
  id: string
  categoryId?: string
  category: string
  allocated: number
  spent: number
  alertThreshold?: number // Alert when spending reaches this percentage (default 80%)
}

export interface Budget {
  id: string
  name: string
  type: "monthly" | "event" | "trip"
  method?: "envelope" | "fixed_cap" | "goal_linked"
  periodType?: "monthly" | "custom" | "rolling"
  totalAllocated: number
  totalSpent: number
  warningThreshold?: number
  criticalThreshold?: number
  alertWindowDays?: number
  enforcementMode?: "soft" | "hard"
  presetKey?: string
  goalId?: string
  subBudgets: SubBudget[]
  startDate?: string
  endDate?: string
  rollover?: boolean // Allow unused budget to rollover to next period
  isActive?: boolean
}

export interface Category {
  id: string
  name: string
  type: "income" | "expense" | "both"
  color?: string
  icon?: string
  isDefault?: boolean
}

// Recurring Transactions
export interface RecurringTransaction {
  id: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  accountId: string
  accountName?: string
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
  startDate: string
  nextDueDate: string
  isActive: boolean
  autoCreate: boolean // Automatically create transactions
  reminderDays?: number // Days before to remind (if not auto-creating)
  notes?: string
  tags?: string[]
}

// Savings Goals
export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  monthlyContribution?: number
  priority: "low" | "medium" | "high"
  color?: string
  icon?: string
  accountId?: string // Optional linked account
  includeInSpendingPlan: boolean
  notes?: string
  isActive?: boolean
}

// Watchlists - Custom spending tracking
export interface Watchlist {
  id: string
  name: string
  type: "category" | "tag" | "payee"
  value: string // Category name, tag, or payee to watch
  budgetLimit?: number // Optional spending limit
  period: "monthly" | "yearly" | "custom"
  startDate?: string
  endDate?: string
  alertEnabled: boolean
  alertThreshold?: number // Percentage threshold for alerts
  color?: string
  isActive?: boolean
}

// Application Settings
export interface AppSettings {
  currency: string
  currencySymbol: string
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  language: string
  darkMode: boolean
  notifications: {
    enabled: boolean
    budgetAlerts: boolean
    billReminders: boolean
    goalMilestones: boolean
    recurringTransactions: boolean
  }
  privacy: {
    requireAuth: boolean
    autoLockMinutes: number
  }
  display: {
    showCents: boolean
    compactMode: boolean
  }
}

// Notification/Alert
export interface AppNotification {
  id: string
  type: "budget" | "bill" | "goal" | "recurring" | "info" | "warning"
  title: string
  message: string
  timestamp: string
  isRead: boolean
  actionLink?: string // Optional link to relevant page
}

// Report Configuration
export interface ReportConfig {
  id: string
  name: string
  type: "spending" | "income" | "net" | "category" | "trend"
  dateRange: {
    start: string
    end: string
    preset?: "week" | "month" | "quarter" | "year" | "all" | "custom"
  }
  filters: {
    accounts?: string[]
    categories?: string[]
    tags?: string[]
    types?: ("income" | "expense")[]
  }
  chartType: "bar" | "line" | "pie" | "area"
  groupBy?: "day" | "week" | "month" | "category" | "account"
}

// Helper type for form inputs
export type TransactionInput = Omit<Transaction, "id" | "accountName">

export type AccountInput = Omit<Account, "id" | "balance">

export type BudgetInput = Omit<Budget, "id" | "totalSpent">

export type RecurringTransactionInput = Omit<RecurringTransaction, "id" | "accountName" | "nextDueDate">

export type GoalInput = Omit<Goal, "id" | "currentAmount">

export type WatchlistInput = Omit<Watchlist, "id">

export type TemplateInput = Omit<TransactionTemplate, "id">

export type SettlementInput = Omit<Settlement, "id">

export type SettlementGroupInput = Pick<SettlementGroup, "name" | "description">

export type ReceiptInput = Omit<Receipt, "id">

// Analytics Types
export interface SpendingTrend {
  period: string // Date or period label
  amount: number
  category?: string
  type?: "income" | "expense"
}

export interface CategoryInsight {
  category: string
  totalSpent: number
  transactionCount: number
  averageAmount: number
  percentageOfTotal: number
  trend: "up" | "down" | "stable"
  trendPercentage: number
}

export interface MonthlyComparison {
  currentMonth: {
    income: number
    expense: number
    net: number
  }
  previousMonth: {
    income: number
    expense: number
    net: number
  }
  change: {
    income: number
    expense: number
    net: number
  }
}

// ============================================
// Investments Module Types
// ============================================

// --- Enums ---

export type InvestmentType =
  | "mutual_fund" | "fixed_deposit" | "ppf" | "epf" | "nps"
  | "stocks" | "gold" | "real_estate" | "bonds" | "rd"
  | "ssy" | "elss" | "nsc" | "kvp" | "scss" | "crypto" | "other"

export type InvestmentStatus = "active" | "matured" | "withdrawn" | "closed"

export type InsuranceType =
  | "term" | "endowment" | "ulip" | "money_back" | "whole_life"
  | "health" | "family_floater" | "super_topup" | "critical_illness"
  | "motor_comprehensive" | "motor_tp" | "home" | "travel"
  | "personal_accident" | "device_insurance" | "other"

export type PolicyStatus = "active" | "lapsed" | "surrendered" | "matured" | "claimed"

export type DeviceCategory =
  | "phone" | "laptop" | "tablet" | "desktop" | "tv"
  | "appliance" | "camera" | "wearable" | "audio" | "gaming" | "other"

export type VehicleType = "car" | "motorcycle" | "scooter" | "bicycle" | "auto" | "other"

export type IdentityDocumentType = "aadhaar" | "pan" | "passport" | "driving_license" | "voter_id" | "ration_card" | "other"

export type PremiumFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly" | "single"

export type TaxSection = "80C" | "80CCC" | "80CCD" | "80D" | "10_14" | "none"

// --- Sub-types for JSON fields ---

export interface RepairEntry {
  id: string
  date: string
  description: string
  cost: number
  provider?: string
}

export interface ServiceEntry {
  id: string
  date: string
  type: "regular" | "repair" | "accident" | "other"
  description: string
  cost: number
  odometerReading?: number
  provider?: string
}

export interface FuelEntry {
  id: string
  date: string
  quantity: number
  cost: number
  odometerReading?: number
}

export interface ClaimEntry {
  date: string
  amount: number
  description: string
  status: "filed" | "approved" | "rejected" | "settled"
}

// --- Family Member ---

export interface FamilyMember {
  id: string
  name: string
  relationship: "self" | "spouse" | "father" | "mother" | "son" | "daughter" | "brother" | "sister" | "other"
  dateOfBirth?: string
  gender?: "male" | "female" | "other"
  bloodGroup?: string
  phone?: string
  email?: string
  address?: string
  photo?: string
  employer?: string
  designation?: string
  annualIncome?: number
  medicalNotes?: string
  notes?: string
  identityDocuments?: IdentityDocumentRecord[]
  createdAt?: string
  updatedAt?: string
}

export type FamilyMemberInput = Omit<FamilyMember, "id" | "identityDocuments" | "createdAt" | "updatedAt">

// --- Identity Document ---

export interface IdentityDocumentRecord {
  id: string
  memberId: string
  type: IdentityDocumentType
  documentNumber: string
  nameOnDocument?: string
  issueDate?: string
  expiryDate?: string
  issuingAuthority?: string
  placeOfIssue?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type IdentityDocumentInput = Omit<IdentityDocumentRecord, "id" | "createdAt" | "updatedAt">

// --- Investment ---

export interface InvestmentRecord {
  id: string
  memberId: string
  memberName?: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: number
  currentValue: number
  startDate: string
  maturityDate?: string
  interestRate?: number
  status: InvestmentStatus

  // MF-specific
  folioNumber?: string
  sipAmount?: number
  sipDay?: number
  sipFrequency?: "monthly" | "quarterly"
  fundCategory?: "equity" | "debt" | "hybrid" | "elss"

  // Stock-specific
  ticker?: string
  quantity?: number
  buyPrice?: number
  dematAccount?: string
  broker?: string

  // FD/RD/PPF-specific
  accountNumber?: string
  compoundingFreq?: "monthly" | "quarterly" | "yearly"
  autoRenew?: boolean

  // NPS/EPF-specific
  pranNumber?: string
  uanNumber?: string

  // Gold-specific
  goldForm?: "physical" | "digital" | "sgb"
  weightGrams?: number
  purity?: string

  // Real Estate-specific
  propertyAddress?: string
  propertyArea?: string
  registrationNo?: string

  // Common
  nominee?: string
  taxSection?: TaxSection
  portfolioGroup?: string
  tags?: string[]
  notes?: string
  color?: string
  createdAt?: string
  updatedAt?: string
}

export type InvestmentInput = Omit<InvestmentRecord, "id" | "memberName" | "createdAt" | "updatedAt">

// --- Insurance Policy ---

export interface InsurancePolicyRecord {
  id: string
  memberId: string
  memberName?: string
  name: string
  type: InsuranceType
  insurer: string
  policyNumber: string
  premiumAmount: number
  premiumFrequency: PremiumFrequency
  sumAssured: number
  startDate: string
  endDate?: string
  nextPremiumDate?: string
  status: PolicyStatus
  nominee?: string
  nomineeRelation?: string
  taxSection?: TaxSection
  riders?: string[]
  coveredMembers?: string[]
  linkedVehicleId?: string
  linkedDeviceId?: string
  claimHistory?: ClaimEntry[]
  agentName?: string
  agentPhone?: string
  tags?: string[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type InsurancePolicyInput = Omit<InsurancePolicyRecord, "id" | "memberName" | "createdAt" | "updatedAt">

// --- Premium Payment ---

export interface PremiumPaymentRecord {
  id: string
  policyId: string
  amount: number
  dueDate: string
  paidDate?: string
  status: "upcoming" | "paid" | "overdue" | "skipped"
  paymentMode?: "bank_transfer" | "upi" | "cheque" | "cash" | "auto_debit" | "other"
  referenceNo?: string
  notes?: string
  createdAt?: string
}

export type PremiumPaymentInput = Omit<PremiumPaymentRecord, "id" | "createdAt">

// --- Device ---

export interface DeviceRecord {
  id: string
  memberId: string
  memberName?: string
  name: string
  category: DeviceCategory
  brand: string
  model: string
  serialNumber?: string
  imeiNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  purchaseStore?: string
  warrantyEndDate?: string
  extWarrantyEnd?: string
  linkedInsuranceId?: string
  status: "active" | "sold" | "damaged" | "lost" | "in_repair" | "retired"
  specs?: Record<string, string>
  repairHistory?: RepairEntry[]
  tags?: string[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type DeviceInput = Omit<DeviceRecord, "id" | "memberName" | "createdAt" | "updatedAt">

// --- Vehicle ---

export interface VehicleRecord {
  id: string
  memberId: string
  memberName?: string
  name: string
  type: VehicleType
  make: string
  vehicleModel: string
  variant?: string
  year: number
  color?: string
  fuelType?: "petrol" | "diesel" | "electric" | "hybrid" | "cng"
  registrationNo: string
  chassisNumber?: string
  engineNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  showroomName?: string
  loanAmount?: number
  emiAmount?: number
  loanEndDate?: string
  linkedInsuranceId?: string
  pucExpiryDate?: string
  fitnessExpiry?: string
  status: "active" | "sold" | "scrapped" | "stolen"
  currentOdometer?: number
  serviceHistory?: ServiceEntry[]
  fuelLog?: FuelEntry[]
  tags?: string[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type VehicleInput = Omit<VehicleRecord, "id" | "memberName" | "createdAt" | "updatedAt">

// --- Portfolio Group ---

export interface PortfolioGroupRecord {
  id: string
  name: string
  description?: string
  color?: string
  createdAt?: string
  updatedAt?: string
}

export type PortfolioGroupInput = Omit<PortfolioGroupRecord, "id" | "createdAt" | "updatedAt">

// --- Report Types ---

export type InvestmentReportType =
  | "portfolio_summary" | "insurance_coverage" | "asset_allocation"
  | "maturity_calendar" | "premium_schedule" | "device_inventory"
  | "vehicle_inventory" | "family_summary" | "tax_planning" | "net_worth"

export interface InvestmentReportConfig {
  type: InvestmentReportType
  title?: string
  dateRange?: { start: string; end: string }
  memberIds?: string[]
  investmentTypes?: InvestmentType[]
  format: "pdf" | "csv"
}

// --- Scanner Types ---

export type ScanTarget =
  | "investment_statement"
  | "insurance_policy"
  | "identity_document"
  | "device_invoice"
  | "vehicle_rc"
  | "vehicle_invoice"
  | "general"

export interface ScanExtractionResult {
  success: boolean
  confidence: "high" | "medium" | "low"
  data: Record<string, unknown>
  rawText?: string
  warnings?: string[]
}

// Export Configuration
export interface ExportConfig {
  format: "csv" | "pdf" | "excel"
  dateRange: {
    start: string
    end: string
  }
  includeCharts?: boolean
  filters?: {
    accounts?: string[]
    categories?: string[]
    types?: ("income" | "expense")[]
  }
}
