"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { SubBudget, Transaction } from "@/lib/types"
import { CircleHelp, Landmark, Plus, Settings, Table2, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { TransactionsSidebar } from "../TransactionsSidebar"
import { TransactionFormModern } from "../transactions/TransactionFormModern"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { toLocalDateStr } from "@/lib/utils"

interface BudgetManagementProps {
  title?: string
}

type BudgetType = "monthly" | "event" | "trip"
type BudgetMethod = "envelope" | "fixed_cap" | "goal_linked"
type BudgetPeriodType = "monthly" | "custom" | "rolling"
type BudgetEnforcementMode = "soft" | "hard"

interface BudgetPresetOption {
  key: string
  label: string
  description: string
}

interface BudgetSummaryResponse {
  scope: "all" | "personal" | "shared"
  totals: {
    allocated: number
    spent: number
    remaining: number
    usagePercent: number
    atRiskCount: number
    overLimitCount: number
  }
  pending: {
    payables: number
    receivables: number
    net: number
    count: number
  }
  budgets: Array<{
    id: string
    totalSpent: number
    subBudgets: Array<{
      id: string
      spent: number
    }>
  }>
}

type BudgetDetailTab = "overview" | "categories" | "settings"
type BudgetSummaryScope = "all" | "personal" | "shared"

const fallbackPresets: BudgetPresetOption[] = [
  {
    key: "fifty_thirty_twenty",
    label: "50 / 30 / 20",
    description: "Balanced split between needs, wants, and savings.",
  },
  {
    key: "zero_based_starter",
    label: "Zero-Based Starter",
    description: "Practical starter allocation for zero-based planning.",
  },
  {
    key: "essentials_focus",
    label: "Essentials Focus",
    description: "Higher allocation toward essential categories.",
  },
]

const defaultCreateForm = {
  name: "",
  type: "monthly" as BudgetType,
  method: "envelope" as BudgetMethod,
  periodType: "monthly" as BudgetPeriodType,
  totalAllocated: "",
  presetKey: "none",
  warningThreshold: "80",
  criticalThreshold: "100",
  alertWindowDays: "5",
  enforcementMode: "soft" as BudgetEnforcementMode,
  startDate: "",
  endDate: "",
  goalId: "none",
  rollover: false,
}

const defaultAddCategoryForm = {
  categoryId: "",
  allocated: "",
  alertThreshold: "80",
}

function toInputDate(value?: string): string {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  return toLocalDateStr(parsed)
}

function toPositiveNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, parsed)
}

function toBoundedThreshold(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(200, parsed))
}

function FieldLabelWithInfo({
  htmlFor,
  label,
  help,
}: {
  htmlFor: string
  label: string
  help: string
}) {
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Help for ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs leading-relaxed">
          {help}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function BudgetManagement({ title = "Budgets" }: BudgetManagementProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    categories,
    goals,
    transactions,
    formatCurrency,
  } = useApp()
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [activeBudgetTab, setActiveBudgetTab] = useState<BudgetDetailTab>("categories")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCategoryTransactionsOpen, setIsCategoryTransactionsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false)
  const [addTransactionPrefill, setAddTransactionPrefill] = useState<Partial<Transaction> | undefined>(undefined)
  const [transactionFormSeed, setTransactionFormSeed] = useState(0)

  const [createFormData, setCreateFormData] = useState(defaultCreateForm)
  const [addCategoryFormData, setAddCategoryFormData] = useState(defaultAddCategoryForm)
  const [presetOptions, setPresetOptions] = useState<BudgetPresetOption[]>(fallbackPresets)
  const [summary, setSummary] = useState<BudgetSummaryResponse | null>(null)
  const [summaryScope, setSummaryScope] = useState<BudgetSummaryScope>("all")

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-budget-card]",
        { y: 10, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.24, stagger: 0.03, ease: "power2.out" }
      )
    })
  }, { scope: containerRef, dependencies: [budgets.length], revertOnUpdate: true })

  const selectedBudget = budgets.find(budget => budget.id === selectedBudgetId)
  const summaryBudgetById = useMemo(() => {
    const map = new Map<string, BudgetSummaryResponse["budgets"][number]>()
    if (!summary) return map
    summary.budgets.forEach(budget => {
      map.set(budget.id, budget)
    })
    return map
  }, [summary])
  const selectedBudgetSummary = selectedBudgetId ? summaryBudgetById.get(selectedBudgetId) : undefined
  const selectedBudgetSpent = selectedBudgetSummary?.totalSpent ?? selectedBudget?.totalSpent ?? 0
  const selectedBudgetSubBudgetSpentById = useMemo(() => {
    const map = new Map<string, number>()
    if (!selectedBudgetSummary) return map
    selectedBudgetSummary.subBudgets.forEach(subBudget => {
      map.set(subBudget.id, subBudget.spent)
    })
    return map
  }, [selectedBudgetSummary])

  const [policyForm, setPolicyForm] = useState({
    method: "envelope" as BudgetMethod,
    periodType: "monthly" as BudgetPeriodType,
    totalAllocated: "0",
    warningThreshold: "80",
    criticalThreshold: "100",
    alertWindowDays: "5",
    enforcementMode: "soft" as BudgetEnforcementMode,
    startDate: "",
    endDate: "",
    goalId: "none",
    rollover: false,
  })
  const createFormGuard = useFormCloseGuard<typeof createFormData>()
  const addCategoryFormGuard = useFormCloseGuard<typeof addCategoryFormData>()
  const rememberCreateSnapshot = createFormGuard.rememberSnapshot

  useEffect(() => {
    if (budgets.length > 0 && selectedBudgetId === null) {
      setSelectedBudgetId(budgets[0].id)
    }
    if (budgets.length === 0) {
      setSelectedBudgetId(null)
    }
  }, [budgets, selectedBudgetId])

  useEffect(() => {
    setActiveBudgetTab("categories")
  }, [selectedBudgetId])

  useEffect(() => {
    let mounted = true

    const fetchPresets = async () => {
      try {
        const response = await fetch("/api/budgets/presets")
        if (!response.ok) return
        const payload = (await response.json()) as BudgetPresetOption[]
        if (!mounted || !Array.isArray(payload) || payload.length === 0) return
        setPresetOptions(payload)
      } catch (error) {
        console.error("Failed to fetch budget presets:", error)
      }
    }

    void fetchPresets()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/budgets/summary?period=month&scope=${encodeURIComponent(summaryScope)}`)
        if (!response.ok) return
        const payload = (await response.json()) as BudgetSummaryResponse
        if (!mounted || !payload?.totals || !payload?.pending) return
        setSummary(payload)
      } catch (error) {
        console.error("Failed to fetch budget summary:", error)
      }
    }

    if (budgets.length > 0) {
      void fetchSummary()
    } else {
      setSummary(null)
    }

    return () => {
      mounted = false
    }
  }, [budgets, summaryScope])

  useEffect(() => {
    if (!selectedBudget) return

    setPolicyForm({
      method: (selectedBudget.method ?? "envelope") as BudgetMethod,
      periodType: (selectedBudget.periodType ?? "monthly") as BudgetPeriodType,
      totalAllocated: String(selectedBudget.totalAllocated),
      warningThreshold: String(selectedBudget.warningThreshold ?? 80),
      criticalThreshold: String(selectedBudget.criticalThreshold ?? 100),
      alertWindowDays: String(selectedBudget.alertWindowDays ?? 5),
      enforcementMode: (selectedBudget.enforcementMode ?? "soft") as BudgetEnforcementMode,
      startDate: toInputDate(selectedBudget.startDate),
      endDate: toInputDate(selectedBudget.endDate),
      goalId: selectedBudget.goalId ?? "none",
      rollover: Boolean(selectedBudget.rollover),
    })
  }, [selectedBudget])

  const expenseCategories = useMemo(
    () => categories.filter(category => category.type === "expense" || category.type === "both"),
    [categories]
  )

  const availableCategoryOptions = useMemo(() => {
    if (!selectedBudget) return expenseCategories

    return expenseCategories.filter(category => {
      const alreadyExists = selectedBudget.subBudgets.some(subBudget => {
        if (subBudget.categoryId) return subBudget.categoryId === category.id
        return subBudget.category.toLowerCase() === category.name.toLowerCase()
      })
      return !alreadyExists
    })
  }, [expenseCategories, selectedBudget])

  const handleCreateBudget = () => {
    if (createFormData.type !== "monthly" && !createFormData.name.trim()) return

    const warningThreshold = toBoundedThreshold(createFormData.warningThreshold, 80)
    const criticalThreshold = Math.max(
      warningThreshold,
      toBoundedThreshold(createFormData.criticalThreshold, 100)
    )

    const budgetName = createFormData.name.trim() || "Monthly Budget"

    void addBudget({
      name: budgetName,
      type: createFormData.type,
      method: createFormData.method,
      periodType: createFormData.periodType,
      totalAllocated: toPositiveNumber(createFormData.totalAllocated, 0),
      subBudgets: [],
      warningThreshold,
      criticalThreshold,
      alertWindowDays: Math.max(1, Math.round(toPositiveNumber(createFormData.alertWindowDays, 5))),
      enforcementMode: createFormData.enforcementMode,
      presetKey: createFormData.presetKey === "none" ? undefined : createFormData.presetKey,
      goalId:
        createFormData.method === "goal_linked" && createFormData.goalId !== "none"
          ? createFormData.goalId
          : undefined,
      startDate: createFormData.startDate || undefined,
      endDate: createFormData.endDate || undefined,
      rollover: createFormData.rollover,
    })

    createFormGuard.clearSnapshot()
    setCreateFormData(defaultCreateForm)
    setIsCreateDialogOpen(false)
  }

  const handleUpdateBudgetPolicy = () => {
    if (!selectedBudget) return

    const warningThreshold = toBoundedThreshold(policyForm.warningThreshold, 80)
    const criticalThreshold = Math.max(
      warningThreshold,
      toBoundedThreshold(policyForm.criticalThreshold, 100)
    )

    void updateBudget(selectedBudget.id, {
      method: policyForm.method,
      periodType: policyForm.periodType,
      totalAllocated: toPositiveNumber(policyForm.totalAllocated, selectedBudget.totalAllocated),
      warningThreshold,
      criticalThreshold,
      alertWindowDays: Math.max(1, Math.round(toPositiveNumber(policyForm.alertWindowDays, 5))),
      enforcementMode: policyForm.enforcementMode,
      goalId: policyForm.method === "goal_linked" && policyForm.goalId !== "none" ? policyForm.goalId : "",
      startDate: policyForm.startDate || undefined,
      endDate: policyForm.endDate || undefined,
      rollover: policyForm.rollover,
    })
  }

  const handleAddCategory = () => {
    if (!selectedBudget || !addCategoryFormData.categoryId || !addCategoryFormData.allocated) return

    const allocated = Number.parseFloat(addCategoryFormData.allocated)
    if (!Number.isFinite(allocated) || allocated <= 0) return

    const selectedCategory = categories.find(category => category.id === addCategoryFormData.categoryId)
    if (!selectedCategory) return

    const newSubBudget: SubBudget = {
      id: crypto.randomUUID(),
      categoryId: selectedCategory.id,
      category: selectedCategory.name,
      allocated,
      spent: 0,
      alertThreshold: toBoundedThreshold(addCategoryFormData.alertThreshold, 80),
    }

    const updatedSubBudgets = [...selectedBudget.subBudgets, newSubBudget]
    const newTotalAllocated = updatedSubBudgets.reduce((sum, subBudget) => sum + subBudget.allocated, 0)

    void updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })

    addCategoryFormGuard.clearSnapshot()
    setAddCategoryFormData(defaultAddCategoryForm)
    setIsAddCategoryDialogOpen(false)
  }

  const handleUpdateSubBudget = (subBudgetId: string, patch: Partial<SubBudget>) => {
    if (!selectedBudget) return

    const updatedSubBudgets = selectedBudget.subBudgets.map(subBudget =>
      subBudget.id === subBudgetId ? { ...subBudget, ...patch } : subBudget
    )

    const newTotalAllocated = updatedSubBudgets.reduce((sum, subBudget) => sum + subBudget.allocated, 0)

    void updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })
  }

  const handleRemoveSubBudget = (subBudgetId: string) => {
    if (!selectedBudget) return

    const updatedSubBudgets = selectedBudget.subBudgets.filter(subBudget => subBudget.id !== subBudgetId)
    const newTotalAllocated = updatedSubBudgets.reduce((sum, subBudget) => sum + subBudget.allocated, 0)

    void updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })
  }

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return

    const nextBudgetId = budgets.find(budget => budget.id !== selectedBudget.id)?.id ?? null
    setIsDeleteDialogOpen(false)
    await deleteBudget(selectedBudget.id)
    setSelectedBudgetId(nextBudgetId)
  }

  const canCreateGoalLinkedBudget = goals.length > 0

  const openCreateDialog = () => {
    setCreateFormData(defaultCreateForm)
    createFormGuard.rememberSnapshot(defaultCreateForm)
    setIsCreateDialogOpen(true)
  }

  const handleCreateDialogChange = (open: boolean) => {
    if (open) {
      setIsCreateDialogOpen(true)
      return
    }
    if (!createFormGuard.confirmClose(createFormData)) return
    createFormGuard.clearSnapshot()
    setIsCreateDialogOpen(false)
    setCreateFormData(defaultCreateForm)
  }

  const openAddCategoryDialog = () => {
    setAddCategoryFormData(defaultAddCategoryForm)
    addCategoryFormGuard.rememberSnapshot(defaultAddCategoryForm)
    setIsAddCategoryDialogOpen(true)
  }

  const handleAddCategoryDialogChange = (open: boolean) => {
    if (open) {
      setIsAddCategoryDialogOpen(true)
      return
    }
    if (!addCategoryFormGuard.confirmClose(addCategoryFormData)) return
    addCategoryFormGuard.clearSnapshot()
    setIsAddCategoryDialogOpen(false)
    setAddCategoryFormData(defaultAddCategoryForm)
  }

  const openCategoryTransactions = (categoryName: string) => {
    setSelectedCategory(categoryName)
    setIsCategoryTransactionsOpen(true)
  }

  const openAddTransactionForCategory = (categoryName: string) => {
    if (!selectedBudget) return

    setAddTransactionPrefill({
      description: "",
      category: categoryName,
      type: "expense",
      notes: `Budget: ${selectedBudget.name}`,
      date: new Date().toISOString(),
      budgetId: selectedBudget.id,
    })
    setTransactionFormSeed(previous => previous + 1)
    setIsAddTransactionDialogOpen(true)
  }

  const closeAddTransactionDialog = () => {
    setIsAddTransactionDialogOpen(false)
    setAddTransactionPrefill(undefined)
  }

  const getSubBudgetTransactionCount = (categoryName: string) => {
    return transactions.filter(transaction => {
      if (transaction.category !== categoryName) return false
      if (summaryScope === "personal") return !transaction.isShared
      if (summaryScope === "shared") return Boolean(transaction.isShared)
      return true
    }).length
  }

  useEffect(() => {
    if (searchParams?.get("action") !== "add") return

    setCreateFormData(defaultCreateForm)
    rememberCreateSnapshot(defaultCreateForm)
    setIsCreateDialogOpen(true)
    const nextParams = new URLSearchParams(searchParams?.toString() ?? "")
    nextParams.delete("action")
    const nextPath = nextParams.toString() ? `${pathname ?? ""}?${nextParams.toString()}` : (pathname ?? "")
    router.replace(nextPath, { scroll: false })
  }, [pathname, rememberCreateSnapshot, router, searchParams])

  return (
    <TooltipProvider delayDuration={150}>
      <div ref={containerRef} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Budgeting Works In Saathi</CardTitle>
          <CardDescription>Simple, practical way to control spending.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Set a total amount you can spend.</p>
          <p>2. Split it into categories (food, travel, shopping, etc.).</p>
          <p>3. Track real transactions against each category and adjust quickly.</p>
          <p>4. Use Settings to tune alerts, period type, and rollover behavior.</p>
        </CardContent>
      </Card>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No budgets yet. Create your first budget to track your spending.
            </p>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {summary && (
            <Card>
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Monthly Budget Snapshot</CardTitle>
                    <CardDescription>
                      Combined view across all active budgets for the current month.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-[220px]">
                    <FieldLabel className="mb-1 text-muted-foreground">Expense Scope</FieldLabel>
                    <Select
                      value={summaryScope}
                      onValueChange={(value: BudgetSummaryScope) => setSummaryScope(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Expenses</SelectItem>
                        <SelectItem value="personal">Personal Only</SelectItem>
                        <SelectItem value="shared">Shared Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                <div>
                  <FieldLabel className="text-muted-foreground">Allocated</FieldLabel>
                  <p className="text-xl font-semibold">{formatCurrency(summary.totals.allocated)}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Spent</FieldLabel>
                  <p className="text-xl font-semibold text-red-500">{formatCurrency(summary.totals.spent)}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Remaining</FieldLabel>
                  <p
                    className={`text-xl font-semibold ${
                      summary.totals.remaining >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {formatCurrency(summary.totals.remaining)}
                  </p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">At Risk</FieldLabel>
                  <p className="text-xl font-semibold">{summary.totals.atRiskCount}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Over Limit</FieldLabel>
                  <p className="text-xl font-semibold">{summary.totals.overLimitCount}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Pending Payables</FieldLabel>
                  <p className="text-xl font-semibold text-red-500">{formatCurrency(summary.pending.payables)}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Pending Receivables</FieldLabel>
                  <p className="text-xl font-semibold text-green-500">{formatCurrency(summary.pending.receivables)}</p>
                </div>
                <div>
                  <FieldLabel className="text-muted-foreground">Pending Net</FieldLabel>
                  <p
                    className={`text-xl font-semibold ${
                      summary.pending.net > 0 ? "text-green-500" : summary.pending.net < 0 ? "text-red-500" : ""
                    }`}
                  >
                    {formatCurrency(summary.pending.net)}
                  </p>
                  <p className="text-xs text-muted-foreground">{summary.pending.count} open settlement(s)</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Your Budgets</CardTitle>
                  <CardDescription>{budgets.length} budget(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {budgets.map(budget => {
                    const scopedBudgetSpent = summaryBudgetById.get(budget.id)?.totalSpent ?? budget.totalSpent
                    const usedPercent =
                      budget.totalAllocated > 0 ? (scopedBudgetSpent / budget.totalAllocated) * 100 : 0
                    const isSelected = selectedBudgetId === budget.id

                    return (
                      <button
                        key={budget.id}
                        type="button"
                        data-budget-card
                        onClick={() => setSelectedBudgetId(budget.id)}
                        className={`w-full rounded-lg border p-4 text-left transition-all ${
                          isSelected
                            ? "border-primary/60 bg-primary/10"
                            : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold">{budget.name}</p>
                            <p className="text-xs capitalize text-muted-foreground">{budget.type} budget</p>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Spent</span>
                              <span className="font-medium">{formatCurrency(scopedBudgetSpent)}</span>
                            </div>
                            <Progress value={Math.min(usedPercent, 100)} className="h-1" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>of {formatCurrency(budget.totalAllocated)}</span>
                              <span>{usedPercent.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {selectedBudget && (
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{selectedBudget.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {selectedBudget.type} budget
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <FieldLabel className="text-muted-foreground">Allocated</FieldLabel>
                      <p className="text-2xl font-bold">{formatCurrency(selectedBudget.totalAllocated)}</p>
                    </div>
                    <div>
                      <FieldLabel className="text-muted-foreground">Spent</FieldLabel>
                      <p className="text-2xl font-bold text-red-500">{formatCurrency(selectedBudgetSpent)}</p>
                    </div>
                    <div>
                      <FieldLabel className="text-muted-foreground">Remaining</FieldLabel>
                      <p
                        className={`text-2xl font-bold ${
                          selectedBudget.totalAllocated - selectedBudgetSpent >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {formatCurrency(selectedBudget.totalAllocated - selectedBudgetSpent)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex w-full overflow-x-auto no-scrollbar rounded-lg border p-1 sm:w-auto">
                  <Button
                    type="button"
                    variant={activeBudgetTab === "overview" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveBudgetTab("overview")}
                    className="shrink-0 gap-2"
                  >
                    <Landmark className="h-4 w-4" />
                    Overview
                  </Button>
                  <Button
                    type="button"
                    variant={activeBudgetTab === "categories" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveBudgetTab("categories")}
                    className="shrink-0 gap-2"
                  >
                    <Table2 className="h-4 w-4" />
                    Categories
                  </Button>
                  <Button
                    type="button"
                    variant={activeBudgetTab === "settings" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveBudgetTab("settings")}
                    className="shrink-0 gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </div>

                {activeBudgetTab === "overview" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>How This Budget Works</CardTitle>
                      <CardDescription>
                        Simple explanation so you always know what to do next.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                      <p>
                        Set a total amount you plan to spend, then split it into category buckets like Food,
                        Transport, and Shopping.
                      </p>
                      <p>
                        Every expense updates the bucket and overall budget. If spending crosses your warning or
                        critical limits, the app alerts you early.
                      </p>
                      <p>
                        Use the Categories tab to track where money is going, and use Settings to tune the rules
                        (period, limits, rollover, and goal link).
                      </p>
                    </CardContent>
                  </Card>
                )}

                {activeBudgetTab === "settings" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget Settings</CardTitle>
                      <CardDescription>
                        Configure thresholds, period behavior, and optional goal linking.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-method"
                            label="Method"
                            help="Envelope is best when you want strict category buckets. Fixed Cap works for a single top-level limit. Goal Linked ties this budget to a savings goal."
                          />
                          <Select
                            value={policyForm.method}
                            onValueChange={(value: BudgetMethod) =>
                              setPolicyForm(previous => ({ ...previous, method: value }))
                            }
                          >
                            <SelectTrigger id="policy-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="envelope">Envelope</SelectItem>
                              <SelectItem value="fixed_cap">Fixed Cap</SelectItem>
                              <SelectItem value="goal_linked" disabled={!canCreateGoalLinkedBudget}>
                                Goal Linked
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-period"
                            label="Period"
                            help="Monthly resets each month. Custom Range is for trips/events. Rolling tracks the most recent 30 days."
                          />
                          <Select
                            value={policyForm.periodType}
                            onValueChange={(value: BudgetPeriodType) =>
                              setPolicyForm(previous => ({ ...previous, periodType: value }))
                            }
                          >
                            <SelectTrigger id="policy-period">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="custom">Custom Range</SelectItem>
                              <SelectItem value="rolling">Rolling 30 Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-total"
                            label="Total Allocated"
                            help="Your spending cap for this budget period. Keep this realistic so alerts are useful."
                          />
                          <Input
                            id="policy-total"
                            type="number"
                            step="0.01"
                            value={policyForm.totalAllocated}
                            onChange={event =>
                              setPolicyForm(previous => ({ ...previous, totalAllocated: event.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-warning"
                            label="Warning %"
                            help="You get a warning when spending reaches this percentage of the budget. Many people use 70-85%."
                          />
                          <Input
                            id="policy-warning"
                            type="number"
                            step="1"
                            value={policyForm.warningThreshold}
                            onChange={event =>
                              setPolicyForm(previous => ({ ...previous, warningThreshold: event.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-critical"
                            label="Critical %"
                            help="Critical alert point. Usually 100% means you're over budget."
                          />
                          <Input
                            id="policy-critical"
                            type="number"
                            step="1"
                            value={policyForm.criticalThreshold}
                            onChange={event =>
                              setPolicyForm(previous => ({ ...previous, criticalThreshold: event.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-alert-window"
                            label="Alert Window (days)"
                            help="How far in advance the app should start warning you. Higher values are better if spending is uneven."
                          />
                          <Input
                            id="policy-alert-window"
                            type="number"
                            step="1"
                            value={policyForm.alertWindowDays}
                            onChange={event =>
                              setPolicyForm(previous => ({ ...previous, alertWindowDays: event.target.value }))
                            }
                          />
                        </div>

                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-enforcement"
                            label="Enforcement"
                            help="Soft only warns; Hard is stricter and meant for disciplined spending workflows."
                          />
                          <Select
                            value={policyForm.enforcementMode}
                            onValueChange={(value: BudgetEnforcementMode) =>
                              setPolicyForm(previous => ({ ...previous, enforcementMode: value }))
                            }
                          >
                            <SelectTrigger id="policy-enforcement">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="soft">Soft</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {(policyForm.periodType === "custom" || selectedBudget.type !== "monthly") && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabelWithInfo
                              htmlFor="policy-start-date"
                              label="Start Date"
                              help="When this budget should start tracking expenses."
                            />
                            <Input
                              id="policy-start-date"
                              type="date"
                              value={policyForm.startDate}
                              onChange={event =>
                                setPolicyForm(previous => ({ ...previous, startDate: event.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <FieldLabelWithInfo
                              htmlFor="policy-end-date"
                              label="End Date"
                              help="When this budget should stop. Leave broad ranges for long-running budgets."
                            />
                            <Input
                              id="policy-end-date"
                              type="date"
                              value={policyForm.endDate}
                              onChange={event =>
                                setPolicyForm(previous => ({ ...previous, endDate: event.target.value }))
                              }
                            />
                          </div>
                        </div>
                      )}

                      {policyForm.method === "goal_linked" && (
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-goal"
                            label="Linked Goal"
                            help="Use this when the budget should directly support a savings target."
                          />
                          <Select
                            value={policyForm.goalId}
                            onValueChange={value =>
                              setPolicyForm(previous => ({ ...previous, goalId: value }))
                            }
                          >
                            <SelectTrigger id="policy-goal">
                              <SelectValue placeholder="Select goal" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No goal</SelectItem>
                              {goals.map(goal => (
                                <SelectItem key={goal.id} value={goal.id}>
                                  {goal.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FieldLabelWithInfo
                            htmlFor="policy-rollover"
                            label="Rollover Unused Budget"
                            help="If enabled, leftover money from this period carries into the next one."
                          />
                          <p className="text-xs text-muted-foreground">
                            Carry unused allocation into the next period.
                          </p>
                        </div>
                        <Switch
                          id="policy-rollover"
                          checked={policyForm.rollover}
                          onCheckedChange={checked =>
                            setPolicyForm(previous => ({ ...previous, rollover: checked }))
                          }
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button onClick={handleUpdateBudgetPolicy}>Save Settings</Button>
                    </CardFooter>
                  </Card>
                )}

                {activeBudgetTab === "categories" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Budgets</CardTitle>
                      <CardDescription>
                        Split budget by category, track transactions, and add new expense entries quickly.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedBudget.subBudgets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No category allocations yet. Add categories to track spend by bucket.
                        </p>
                      ) : (
                        selectedBudget.subBudgets.map(subBudget => {
                          const scopedSubBudgetSpent =
                            selectedBudgetSubBudgetSpentById.get(subBudget.id) ?? subBudget.spent
                          const usedPercent =
                            subBudget.allocated > 0 ? (scopedSubBudgetSpent / subBudget.allocated) * 100 : 0
                          const transactionCount = getSubBudgetTransactionCount(subBudget.category)

                          return (
                            <div key={subBudget.id} className="space-y-2 rounded-lg border p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-1">
                                  <FieldLabel>{subBudget.category}</FieldLabel>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(scopedSubBudgetSpent)} spent • {transactionCount} transaction
                                    {transactionCount === 1 ? "" : "s"}
                                  </p>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openCategoryTransactions(subBudget.category)}
                                    >
                                      View Transactions
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => openAddTransactionForCategory(subBudget.category)}
                                    >
                                      Add Transaction
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[120px_120px_auto]">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={subBudget.allocated}
                                    onChange={event => {
                                      const nextValue = Number.parseFloat(event.target.value)
                                      if (!Number.isFinite(nextValue) || nextValue < 0) return
                                      handleUpdateSubBudget(subBudget.id, { allocated: nextValue })
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    step="1"
                                    value={subBudget.alertThreshold ?? 80}
                                    onChange={event => {
                                      const nextValue = Number.parseFloat(event.target.value)
                                      if (!Number.isFinite(nextValue) || nextValue < 1) return
                                      handleUpdateSubBudget(subBudget.id, {
                                        alertThreshold: Math.min(200, nextValue),
                                      })
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSubBudget(subBudget.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <Progress value={Math.min(usedPercent, 100)} className="h-2" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{formatCurrency(subBudget.allocated - scopedSubBudgetSpent)} remaining</span>
                                <span>{usedPercent.toFixed(0)}%</span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </CardContent>
                    <CardFooter className="justify-end">
                      <Button onClick={openAddCategoryDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Category
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <TransactionsSidebar
        open={isCategoryTransactionsOpen}
        onOpenChange={setIsCategoryTransactionsOpen}
        filterType="category"
        filterValue={selectedCategory}
        title={selectedCategory ? `${selectedCategory} Transactions` : "Category Transactions"}
        actionLabel="Add Transaction"
        onAction={() => {
          if (selectedCategory) {
            openAddTransactionForCategory(selectedCategory)
          }
        }}
      />

      <Dialog
        open={isAddTransactionDialogOpen}
        onOpenChange={open => {
          setIsAddTransactionDialogOpen(open)
          if (!open) setAddTransactionPrefill(undefined)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Pre-filled from your selected budget category.
            </DialogDescription>
          </DialogHeader>
          <TransactionFormModern
            key={`budget-transaction-${transactionFormSeed}`}
            mode="add"
            prefill={addTransactionPrefill}
            onSubmit={closeAddTransactionDialog}
            onCancel={closeAddTransactionDialog}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>
              Choose a structure, period, and alerts. You can customize category allocations later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-type"
                  label="Budget Type"
                  help="Monthly is for regular life expenses. Event is for one-off occasions. Trip is for travel planning."
                />
                <Select
                  value={createFormData.type}
                  onValueChange={(value: BudgetType) =>
                    setCreateFormData(previous => ({
                      ...previous,
                      type: value,
                      periodType: value === "monthly" ? "monthly" : "custom",
                    }))
                  }
                >
                  <SelectTrigger id="budget-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-method"
                  label="Method"
                  help="Envelope is best for category caps. Fixed Cap is a single top limit. Goal Linked ties spending to a savings goal."
                />
                <Select
                  value={createFormData.method}
                  onValueChange={(value: BudgetMethod) =>
                    setCreateFormData(previous => ({ ...previous, method: value }))
                  }
                >
                  <SelectTrigger id="budget-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="envelope">Envelope</SelectItem>
                    <SelectItem value="fixed_cap">Fixed Cap</SelectItem>
                    <SelectItem value="goal_linked" disabled={!canCreateGoalLinkedBudget}>
                      Goal Linked
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <FieldLabelWithInfo
                htmlFor="budget-name"
                label="Budget Name"
                help="Use a clear name so you can identify this budget quickly later."
              />
              <Input
                id="budget-name"
                value={createFormData.name}
                onChange={event =>
                  setCreateFormData(previous => ({ ...previous, name: event.target.value }))
                }
                placeholder={createFormData.type === "monthly" ? "Monthly Budget" : "e.g., Europe Trip"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-total"
                  label="Total Allocated"
                  help="The total amount you plan to spend in this budget period."
                />
                <Input
                  id="budget-total"
                  type="number"
                  step="0.01"
                  value={createFormData.totalAllocated}
                  onChange={event =>
                    setCreateFormData(previous => ({ ...previous, totalAllocated: event.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-warning"
                  label="Warning %"
                  help="You get an early warning at this percentage (for example 80%)."
                />
                <Input
                  id="budget-warning"
                  type="number"
                  step="1"
                  value={createFormData.warningThreshold}
                  onChange={event =>
                    setCreateFormData(previous => ({ ...previous, warningThreshold: event.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-critical"
                  label="Critical %"
                  help="Critical alert point, usually around 100%."
                />
                <Input
                  id="budget-critical"
                  type="number"
                  step="1"
                  value={createFormData.criticalThreshold}
                  onChange={event =>
                    setCreateFormData(previous => ({ ...previous, criticalThreshold: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-period"
                  label="Period Type"
                  help="Monthly resets every month. Custom lets you choose dates. Rolling tracks the last 30 days."
                />
                <Select
                  value={createFormData.periodType}
                  onValueChange={(value: BudgetPeriodType) =>
                    setCreateFormData(previous => ({ ...previous, periodType: value }))
                  }
                >
                  <SelectTrigger id="budget-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="rolling">Rolling 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-preset"
                  label="Preset (optional)"
                  help="Use presets if you want a starter structure. Skip if you prefer full manual control."
                />
                <Select
                  value={createFormData.presetKey}
                  onValueChange={value =>
                    setCreateFormData(previous => ({ ...previous, presetKey: value }))
                  }
                >
                  <SelectTrigger id="budget-preset">
                    <SelectValue placeholder="No preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Preset</SelectItem>
                    {presetOptions.map(preset => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {createFormData.presetKey === "none"
                    ? "Start without preset and add categories manually."
                    : presetOptions.find(preset => preset.key === createFormData.presetKey)?.description ||
                      "Preset selected."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-alert-window"
                  label="Alert Window (days)"
                  help="How many days in advance the app should surface risk alerts."
                />
                <Input
                  id="budget-alert-window"
                  type="number"
                  step="1"
                  value={createFormData.alertWindowDays}
                  onChange={event =>
                    setCreateFormData(previous => ({ ...previous, alertWindowDays: event.target.value }))
                  }
                />
              </div>

              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-enforcement"
                  label="Enforcement"
                  help="Soft means warning-only. Hard is stricter and intended for disciplined budget control."
                />
                <Select
                  value={createFormData.enforcementMode}
                  onValueChange={(value: BudgetEnforcementMode) =>
                    setCreateFormData(previous => ({ ...previous, enforcementMode: value }))
                  }
                >
                  <SelectTrigger id="budget-enforcement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(createFormData.periodType === "custom" || createFormData.type !== "monthly") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabelWithInfo
                    htmlFor="budget-start-date"
                    label="Start Date"
                    help="Date from which spending starts counting in this budget."
                  />
                  <Input
                    id="budget-start-date"
                    type="date"
                    value={createFormData.startDate}
                    onChange={event =>
                      setCreateFormData(previous => ({ ...previous, startDate: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <FieldLabelWithInfo
                    htmlFor="budget-end-date"
                    label="End Date"
                    help="Date after which spending stops counting in this budget."
                  />
                  <Input
                    id="budget-end-date"
                    type="date"
                    value={createFormData.endDate}
                    onChange={event =>
                      setCreateFormData(previous => ({ ...previous, endDate: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {createFormData.method === "goal_linked" && (
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-goal"
                  label="Linked Goal"
                  help="Pick a goal when this budget should support a specific savings target."
                />
                <Select
                  value={createFormData.goalId}
                  onValueChange={value =>
                    setCreateFormData(previous => ({ ...previous, goalId: value }))
                  }
                >
                  <SelectTrigger id="budget-goal">
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No goal</SelectItem>
                    {goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FieldLabelWithInfo
                  htmlFor="budget-rollover"
                  label="Rollover"
                  help="If on, unused budget carries forward to the next period."
                />
                <p className="text-xs text-muted-foreground">Carry unused budget into the next period.</p>
              </div>
              <Switch
                id="budget-rollover"
                checked={createFormData.rollover}
                onCheckedChange={checked =>
                  setCreateFormData(previous => ({ ...previous, rollover: checked }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleCreateDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateBudget}>Create Budget</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCategoryDialogOpen} onOpenChange={handleAddCategoryDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category Allocation</DialogTitle>
            <DialogDescription>
              Pick a category and assign how much can be spent in this budget.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <FieldLabelWithInfo
                htmlFor="category-select"
                label="Category"
                help="Choose the category you want to control with its own spending cap."
              />
              <Select
                value={addCategoryFormData.categoryId}
                onValueChange={value =>
                  setAddCategoryFormData(previous => ({ ...previous, categoryId: value }))
                }
              >
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategoryOptions.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabelWithInfo
                  htmlFor="allocated-amount"
                  label="Allocated Amount"
                  help="Maximum amount you want to spend for this category."
                />
                <Input
                  id="allocated-amount"
                  type="number"
                  step="0.01"
                  value={addCategoryFormData.allocated}
                  onChange={event =>
                    setAddCategoryFormData(previous => ({
                      ...previous,
                      allocated: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <FieldLabelWithInfo
                  htmlFor="alert-threshold"
                  label="Alert Threshold %"
                  help="You’ll be warned when category spending reaches this percentage."
                />
                <Input
                  id="alert-threshold"
                  type="number"
                  step="1"
                  value={addCategoryFormData.alertThreshold}
                  onChange={event =>
                    setAddCategoryFormData(previous => ({
                      ...previous,
                      alertThreshold: event.target.value,
                    }))
                  }
                  placeholder="80"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleAddCategoryDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="rounded-lg bg-muted p-4">
              <p className="font-semibold">{selectedBudget.name}</p>
              <p className="text-sm capitalize text-muted-foreground">{selectedBudget.type} budget</p>
              <p className="mt-2 text-sm">
                {selectedBudget.subBudgets.length} categor
                {selectedBudget.subBudgets.length === 1 ? "y" : "ies"}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBudget}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  )
}
