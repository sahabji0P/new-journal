"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { toast } from "@/lib/toast"
import type {
  FamilyMember,
  FamilyMemberInput,
  IdentityDocumentRecord,
  IdentityDocumentInput,
  InvestmentRecord,
  InvestmentInput,
  InsurancePolicyRecord,
  InsurancePolicyInput,
  PremiumPaymentRecord,
  PremiumPaymentInput,
  DeviceRecord,
  DeviceInput,
  VehicleRecord,
  VehicleInput,
  PortfolioGroupRecord,
  PortfolioGroupInput,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface InvestmentsContextType {
  // Data
  familyMembers: FamilyMember[]
  investments: InvestmentRecord[]
  policies: InsurancePolicyRecord[]
  devices: DeviceRecord[]
  vehicles: VehicleRecord[]
  portfolioGroups: PortfolioGroupRecord[]

  // Loading state
  isLoading: boolean

  // Family Member CRUD
  addFamilyMember: (member: FamilyMemberInput) => Promise<FamilyMember | null>
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => Promise<void>
  deleteFamilyMember: (id: string) => Promise<void>

  // Identity Document CRUD
  addIdentityDocument: (memberId: string, doc: IdentityDocumentInput) => Promise<IdentityDocumentRecord | null>
  updateIdentityDocument: (memberId: string, docId: string, data: Partial<IdentityDocumentRecord>) => Promise<void>
  deleteIdentityDocument: (memberId: string, docId: string) => Promise<void>

  // Investment CRUD
  addInvestment: (inv: InvestmentInput) => Promise<InvestmentRecord | null>
  updateInvestment: (id: string, data: Partial<InvestmentRecord>) => Promise<void>
  deleteInvestment: (id: string) => Promise<void>

  // Insurance Policy CRUD
  addPolicy: (policy: InsurancePolicyInput) => Promise<InsurancePolicyRecord | null>
  updatePolicy: (id: string, data: Partial<InsurancePolicyRecord>) => Promise<void>
  deletePolicy: (id: string) => Promise<void>

  // Premium Payment
  addPremiumPayment: (policyId: string, payment: PremiumPaymentInput) => Promise<PremiumPaymentRecord | null>
  updatePremiumPayment: (policyId: string, paymentId: string, data: Partial<PremiumPaymentRecord>) => Promise<void>

  // Device CRUD
  addDevice: (device: DeviceInput) => Promise<DeviceRecord | null>
  updateDevice: (id: string, data: Partial<DeviceRecord>) => Promise<void>
  deleteDevice: (id: string) => Promise<void>

  // Vehicle CRUD
  addVehicle: (vehicle: VehicleInput) => Promise<VehicleRecord | null>
  updateVehicle: (id: string, data: Partial<VehicleRecord>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>

  // Portfolio Group CRUD
  addPortfolioGroup: (group: PortfolioGroupInput) => Promise<PortfolioGroupRecord | null>
  updatePortfolioGroup: (id: string, data: Partial<PortfolioGroupRecord>) => Promise<void>
  deletePortfolioGroup: (id: string) => Promise<void>

  // Computed helpers
  getMemberInvestments: (memberId: string) => InvestmentRecord[]
  getMemberPolicies: (memberId: string) => InsurancePolicyRecord[]
  getMemberDevices: (memberId: string) => DeviceRecord[]
  getMemberVehicles: (memberId: string) => VehicleRecord[]
  getTotalPortfolioValue: () => number
  getTotalReturns: () => { amount: number; percent: number }
  getUpcomingMaturities: (days: number) => InvestmentRecord[]
  getUpcomingPremiums: (days: number) => InsurancePolicyRecord[]

  // Currency formatting
  formatCurrency: (amount: number) => string
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const InvestmentsContext = createContext<InvestmentsContextType | undefined>(undefined)

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function InvestmentsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()

  // --- State ---
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [investments, setInvestments] = useState<InvestmentRecord[]>([])
  const [policies, setPolicies] = useState<InsurancePolicyRecord[]>([])
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([])
  const [portfolioGroups, setPortfolioGroups] = useState<PortfolioGroupRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const parseJsonResponse = async <T,>(response: Response, fallback: T): Promise<T> => {
    if (!response.ok) {
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to load data")
      }
      throw new Error(`Failed to load data: ${response.status}`)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return fallback
    }

    const data = await response.json()
    return (data as T) ?? fallback
  }

  // -------------------------------------------------------------------------
  // Initial data loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      if (status === "loading") return

      if (status === "unauthenticated") {
        if (!cancelled) {
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)

        // Phase 1: family members, investments, policies (parallel)
        const [familyRes, holdingsRes, insuranceRes] = await Promise.all([
          fetch("/api/investments/family"),
          fetch("/api/investments/holdings"),
          fetch("/api/investments/insurance"),
        ])

        if (cancelled) return

        const familyData = await parseJsonResponse<FamilyMember[]>(familyRes, [])
        const holdingsData = await parseJsonResponse<InvestmentRecord[]>(holdingsRes, [])
        const insuranceData = await parseJsonResponse<InsurancePolicyRecord[]>(insuranceRes, [])

        if (cancelled) return

        setFamilyMembers(familyData)
        setInvestments(holdingsData)
        setPolicies(insuranceData)

        // Phase 2: devices, vehicles, portfolio groups (parallel)
        const [devicesRes, vehiclesRes, groupsRes] = await Promise.all([
          fetch("/api/investments/devices"),
          fetch("/api/investments/vehicles"),
          fetch("/api/investments/groups"),
        ])

        if (cancelled) return

        const devicesData = await parseJsonResponse<DeviceRecord[]>(devicesRes, [])
        const vehiclesData = await parseJsonResponse<VehicleRecord[]>(vehiclesRes, [])
        const groupsData = await parseJsonResponse<PortfolioGroupRecord[]>(groupsRes, [])

        if (cancelled) return

        setDevices(devicesData)
        setVehicles(vehiclesData)
        setPortfolioGroups(groupsData)

        if (!cancelled) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error loading investments data:", error)
        if (!cancelled) {
          toast.apiError("Failed to load investments data", error, {
            description: "Please refresh the page to try again.",
            action: {
              label: "Reload",
              onClick: () => window.location.reload(),
            },
          })
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [status])

  // -------------------------------------------------------------------------
  // Family Member CRUD
  // -------------------------------------------------------------------------

  const addFamilyMember = useCallback(async (member: FamilyMemberInput): Promise<FamilyMember | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: FamilyMember = { ...member, id: tempId }

    setFamilyMembers(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      })

      if (!response.ok) throw new Error("Failed to add family member")

      const saved: FamilyMember = await response.json()
      setFamilyMembers(prev => prev.map(m => (m.id === tempId ? saved : m)))
      toast.success("Family member added", {
        description: saved.name,
      })
      return saved
    } catch (error) {
      console.error("Error adding family member:", error)
      setFamilyMembers(prev => prev.filter(m => m.id !== tempId))
      toast.apiError("Failed to add family member", error)
      return null
    }
  }, [])

  const updateFamilyMember = useCallback(async (id: string, data: Partial<FamilyMember>): Promise<void> => {
    const previous = familyMembers.find(m => m.id === id)
    if (!previous) return

    setFamilyMembers(prev => prev.map(m => (m.id === id ? { ...m, ...data } : m)))

    try {
      const response = await fetch("/api/investments/family", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update family member")

      toast.success("Family member updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating family member:", error)
      setFamilyMembers(prev => prev.map(m => (m.id === id ? previous : m)))
      toast.apiError("Failed to update family member", error)
    }
  }, [familyMembers])

  const deleteFamilyMember = useCallback(async (id: string): Promise<void> => {
    const previous = familyMembers.find(m => m.id === id)
    if (!previous) return

    setFamilyMembers(prev => prev.filter(m => m.id !== id))

    try {
      const response = await fetch("/api/investments/family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete family member")

      toast.success("Family member deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting family member:", error)
      setFamilyMembers(prev => [...prev, previous])
      toast.apiError("Failed to delete family member", error)
    }
  }, [familyMembers])

  // -------------------------------------------------------------------------
  // Identity Document CRUD
  // -------------------------------------------------------------------------

  const addIdentityDocument = useCallback(async (
    memberId: string,
    doc: IdentityDocumentInput,
  ): Promise<IdentityDocumentRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: IdentityDocumentRecord = { ...doc, id: tempId, memberId }

    setFamilyMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? { ...m, identityDocuments: [...(m.identityDocuments || []), optimistic] }
          : m,
      ),
    )

    try {
      const response = await fetch(`/api/investments/family/${memberId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      })

      if (!response.ok) throw new Error("Failed to add identity document")

      const saved: IdentityDocumentRecord = await response.json()
      setFamilyMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? {
                ...m,
                identityDocuments: (m.identityDocuments || []).map(d =>
                  d.id === tempId ? saved : d,
                ),
              }
            : m,
        ),
      )
      toast.success("Identity document added", {
        description: `${doc.type.toUpperCase()} document`,
      })
      return saved
    } catch (error) {
      console.error("Error adding identity document:", error)
      setFamilyMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? {
                ...m,
                identityDocuments: (m.identityDocuments || []).filter(d => d.id !== tempId),
              }
            : m,
        ),
      )
      toast.apiError("Failed to add identity document", error)
      return null
    }
  }, [])

  const updateIdentityDocument = useCallback(async (
    memberId: string,
    docId: string,
    data: Partial<IdentityDocumentRecord>,
  ): Promise<void> => {
    const member = familyMembers.find(m => m.id === memberId)
    const previousDoc = member?.identityDocuments?.find(d => d.id === docId)
    if (!previousDoc) return

    setFamilyMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? {
              ...m,
              identityDocuments: (m.identityDocuments || []).map(d =>
                d.id === docId ? { ...d, ...data } : d,
              ),
            }
          : m,
      ),
    )

    try {
      const response = await fetch(`/api/investments/family/${memberId}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update identity document")

      toast.success("Identity document updated")
    } catch (error) {
      console.error("Error updating identity document:", error)
      setFamilyMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? {
                ...m,
                identityDocuments: (m.identityDocuments || []).map(d =>
                  d.id === docId ? previousDoc : d,
                ),
              }
            : m,
        ),
      )
      toast.apiError("Failed to update identity document", error)
    }
  }, [familyMembers])

  const deleteIdentityDocument = useCallback(async (
    memberId: string,
    docId: string,
  ): Promise<void> => {
    const member = familyMembers.find(m => m.id === memberId)
    const previousDoc = member?.identityDocuments?.find(d => d.id === docId)
    if (!previousDoc) return

    setFamilyMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? {
              ...m,
              identityDocuments: (m.identityDocuments || []).filter(d => d.id !== docId),
            }
          : m,
      ),
    )

    try {
      const response = await fetch(`/api/investments/family/${memberId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId }),
      })

      if (!response.ok) throw new Error("Failed to delete identity document")

      toast.success("Identity document deleted")
    } catch (error) {
      console.error("Error deleting identity document:", error)
      setFamilyMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? {
                ...m,
                identityDocuments: [...(m.identityDocuments || []), previousDoc],
              }
            : m,
        ),
      )
      toast.apiError("Failed to delete identity document", error)
    }
  }, [familyMembers])

  // -------------------------------------------------------------------------
  // Investment CRUD
  // -------------------------------------------------------------------------

  const addInvestment = useCallback(async (inv: InvestmentInput): Promise<InvestmentRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: InvestmentRecord = { ...inv, id: tempId }

    setInvestments(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inv),
      })

      if (!response.ok) throw new Error("Failed to add investment")

      const saved: InvestmentRecord = await response.json()
      setInvestments(prev => prev.map(i => (i.id === tempId ? saved : i)))
      toast.success("Investment added", {
        description: saved.name,
      })
      return saved
    } catch (error) {
      console.error("Error adding investment:", error)
      setInvestments(prev => prev.filter(i => i.id !== tempId))
      toast.apiError("Failed to add investment", error)
      return null
    }
  }, [])

  const updateInvestment = useCallback(async (id: string, data: Partial<InvestmentRecord>): Promise<void> => {
    const previous = investments.find(i => i.id === id)
    if (!previous) return

    setInvestments(prev => prev.map(i => (i.id === id ? { ...i, ...data } : i)))

    try {
      const response = await fetch("/api/investments/holdings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update investment")

      toast.success("Investment updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating investment:", error)
      setInvestments(prev => prev.map(i => (i.id === id ? previous : i)))
      toast.apiError("Failed to update investment", error)
    }
  }, [investments])

  const deleteInvestment = useCallback(async (id: string): Promise<void> => {
    const previous = investments.find(i => i.id === id)
    if (!previous) return

    setInvestments(prev => prev.filter(i => i.id !== id))

    try {
      const response = await fetch("/api/investments/holdings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete investment")

      toast.success("Investment deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting investment:", error)
      setInvestments(prev => [...prev, previous])
      toast.apiError("Failed to delete investment", error)
    }
  }, [investments])

  // -------------------------------------------------------------------------
  // Insurance Policy CRUD
  // -------------------------------------------------------------------------

  const addPolicy = useCallback(async (policy: InsurancePolicyInput): Promise<InsurancePolicyRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: InsurancePolicyRecord = { ...policy, id: tempId }

    setPolicies(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      })

      if (!response.ok) throw new Error("Failed to add insurance policy")

      const saved: InsurancePolicyRecord = await response.json()
      setPolicies(prev => prev.map(p => (p.id === tempId ? saved : p)))
      toast.success("Insurance policy added", {
        description: saved.name,
      })
      return saved
    } catch (error) {
      console.error("Error adding insurance policy:", error)
      setPolicies(prev => prev.filter(p => p.id !== tempId))
      toast.apiError("Failed to add insurance policy", error)
      return null
    }
  }, [])

  const updatePolicy = useCallback(async (id: string, data: Partial<InsurancePolicyRecord>): Promise<void> => {
    const previous = policies.find(p => p.id === id)
    if (!previous) return

    setPolicies(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)))

    try {
      const response = await fetch("/api/investments/insurance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update insurance policy")

      toast.success("Insurance policy updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating insurance policy:", error)
      setPolicies(prev => prev.map(p => (p.id === id ? previous : p)))
      toast.apiError("Failed to update insurance policy", error)
    }
  }, [policies])

  const deletePolicy = useCallback(async (id: string): Promise<void> => {
    const previous = policies.find(p => p.id === id)
    if (!previous) return

    setPolicies(prev => prev.filter(p => p.id !== id))

    try {
      const response = await fetch("/api/investments/insurance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete insurance policy")

      toast.success("Insurance policy deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting insurance policy:", error)
      setPolicies(prev => [...prev, previous])
      toast.apiError("Failed to delete insurance policy", error)
    }
  }, [policies])

  // -------------------------------------------------------------------------
  // Premium Payment CRUD
  // -------------------------------------------------------------------------

  const addPremiumPayment = useCallback(async (
    policyId: string,
    payment: PremiumPaymentInput,
  ): Promise<PremiumPaymentRecord | null> => {
    try {
      const response = await fetch(`/api/investments/insurance/${policyId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      })

      if (!response.ok) throw new Error("Failed to add premium payment")

      const saved: PremiumPaymentRecord = await response.json()
      toast.success("Premium payment recorded", {
        description: `${currencyFormatter.format(saved.amount)} for ${payment.dueDate}`,
      })
      return saved
    } catch (error) {
      console.error("Error adding premium payment:", error)
      toast.apiError("Failed to add premium payment", error)
      return null
    }
  }, [])

  const updatePremiumPayment = useCallback(async (
    policyId: string,
    paymentId: string,
    data: Partial<PremiumPaymentRecord>,
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/investments/insurance/${policyId}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update premium payment")

      toast.success("Premium payment updated")
    } catch (error) {
      console.error("Error updating premium payment:", error)
      toast.apiError("Failed to update premium payment", error)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Device CRUD
  // -------------------------------------------------------------------------

  const addDevice = useCallback(async (device: DeviceInput): Promise<DeviceRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: DeviceRecord = { ...device, id: tempId }

    setDevices(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(device),
      })

      if (!response.ok) throw new Error("Failed to add device")

      const saved: DeviceRecord = await response.json()
      setDevices(prev => prev.map(d => (d.id === tempId ? saved : d)))
      toast.success("Device added", {
        description: `${saved.brand} ${saved.model}`,
      })
      return saved
    } catch (error) {
      console.error("Error adding device:", error)
      setDevices(prev => prev.filter(d => d.id !== tempId))
      toast.apiError("Failed to add device", error)
      return null
    }
  }, [])

  const updateDevice = useCallback(async (id: string, data: Partial<DeviceRecord>): Promise<void> => {
    const previous = devices.find(d => d.id === id)
    if (!previous) return

    setDevices(prev => prev.map(d => (d.id === id ? { ...d, ...data } : d)))

    try {
      const response = await fetch("/api/investments/devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update device")

      toast.success("Device updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating device:", error)
      setDevices(prev => prev.map(d => (d.id === id ? previous : d)))
      toast.apiError("Failed to update device", error)
    }
  }, [devices])

  const deleteDevice = useCallback(async (id: string): Promise<void> => {
    const previous = devices.find(d => d.id === id)
    if (!previous) return

    setDevices(prev => prev.filter(d => d.id !== id))

    try {
      const response = await fetch("/api/investments/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete device")

      toast.success("Device deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting device:", error)
      setDevices(prev => [...prev, previous])
      toast.apiError("Failed to delete device", error)
    }
  }, [devices])

  // -------------------------------------------------------------------------
  // Vehicle CRUD
  // -------------------------------------------------------------------------

  const addVehicle = useCallback(async (vehicle: VehicleInput): Promise<VehicleRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: VehicleRecord = { ...vehicle, id: tempId }

    setVehicles(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicle),
      })

      if (!response.ok) throw new Error("Failed to add vehicle")

      const saved: VehicleRecord = await response.json()
      setVehicles(prev => prev.map(v => (v.id === tempId ? saved : v)))
      toast.success("Vehicle added", {
        description: `${saved.make} ${saved.vehicleModel}`,
      })
      return saved
    } catch (error) {
      console.error("Error adding vehicle:", error)
      setVehicles(prev => prev.filter(v => v.id !== tempId))
      toast.apiError("Failed to add vehicle", error)
      return null
    }
  }, [])

  const updateVehicle = useCallback(async (id: string, data: Partial<VehicleRecord>): Promise<void> => {
    const previous = vehicles.find(v => v.id === id)
    if (!previous) return

    setVehicles(prev => prev.map(v => (v.id === id ? { ...v, ...data } : v)))

    try {
      const response = await fetch("/api/investments/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update vehicle")

      toast.success("Vehicle updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating vehicle:", error)
      setVehicles(prev => prev.map(v => (v.id === id ? previous : v)))
      toast.apiError("Failed to update vehicle", error)
    }
  }, [vehicles])

  const deleteVehicle = useCallback(async (id: string): Promise<void> => {
    const previous = vehicles.find(v => v.id === id)
    if (!previous) return

    setVehicles(prev => prev.filter(v => v.id !== id))

    try {
      const response = await fetch("/api/investments/vehicles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete vehicle")

      toast.success("Vehicle deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting vehicle:", error)
      setVehicles(prev => [...prev, previous])
      toast.apiError("Failed to delete vehicle", error)
    }
  }, [vehicles])

  // -------------------------------------------------------------------------
  // Portfolio Group CRUD
  // -------------------------------------------------------------------------

  const addPortfolioGroup = useCallback(async (group: PortfolioGroupInput): Promise<PortfolioGroupRecord | null> => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimistic: PortfolioGroupRecord = { ...group, id: tempId }

    setPortfolioGroups(prev => [...prev, optimistic])

    try {
      const response = await fetch("/api/investments/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      })

      if (!response.ok) throw new Error("Failed to add portfolio group")

      const saved: PortfolioGroupRecord = await response.json()
      setPortfolioGroups(prev => prev.map(g => (g.id === tempId ? saved : g)))
      toast.success("Portfolio group created", {
        description: saved.name,
      })
      return saved
    } catch (error) {
      console.error("Error adding portfolio group:", error)
      setPortfolioGroups(prev => prev.filter(g => g.id !== tempId))
      toast.apiError("Failed to create portfolio group", error)
      return null
    }
  }, [])

  const updatePortfolioGroup = useCallback(async (id: string, data: Partial<PortfolioGroupRecord>): Promise<void> => {
    const previous = portfolioGroups.find(g => g.id === id)
    if (!previous) return

    setPortfolioGroups(prev => prev.map(g => (g.id === id ? { ...g, ...data } : g)))

    try {
      const response = await fetch("/api/investments/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      })

      if (!response.ok) throw new Error("Failed to update portfolio group")

      toast.success("Portfolio group updated", {
        description: data.name ?? previous.name,
      })
    } catch (error) {
      console.error("Error updating portfolio group:", error)
      setPortfolioGroups(prev => prev.map(g => (g.id === id ? previous : g)))
      toast.apiError("Failed to update portfolio group", error)
    }
  }, [portfolioGroups])

  const deletePortfolioGroup = useCallback(async (id: string): Promise<void> => {
    const previous = portfolioGroups.find(g => g.id === id)
    if (!previous) return

    setPortfolioGroups(prev => prev.filter(g => g.id !== id))

    try {
      const response = await fetch("/api/investments/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error("Failed to delete portfolio group")

      toast.success("Portfolio group deleted", {
        description: previous.name,
      })
    } catch (error) {
      console.error("Error deleting portfolio group:", error)
      setPortfolioGroups(prev => [...prev, previous])
      toast.apiError("Failed to delete portfolio group", error)
    }
  }, [portfolioGroups])

  // -------------------------------------------------------------------------
  // Computed helpers
  // -------------------------------------------------------------------------

  const getMemberInvestments = useCallback(
    (memberId: string): InvestmentRecord[] =>
      investments.filter(i => i.memberId === memberId),
    [investments],
  )

  const getMemberPolicies = useCallback(
    (memberId: string): InsurancePolicyRecord[] =>
      policies.filter(p => p.memberId === memberId),
    [policies],
  )

  const getMemberDevices = useCallback(
    (memberId: string): DeviceRecord[] =>
      devices.filter(d => d.memberId === memberId),
    [devices],
  )

  const getMemberVehicles = useCallback(
    (memberId: string): VehicleRecord[] =>
      vehicles.filter(v => v.memberId === memberId),
    [vehicles],
  )

  const getTotalPortfolioValue = useCallback((): number => {
    return investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0)
  }, [investments])

  const getTotalReturns = useCallback((): { amount: number; percent: number } => {
    const totalCurrent = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0)
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.investedAmount || 0), 0)
    const amount = totalCurrent - totalInvested
    const percent = totalInvested > 0 ? (amount / totalInvested) * 100 : 0
    return { amount, percent }
  }, [investments])

  const getUpcomingMaturities = useCallback(
    (days: number): InvestmentRecord[] => {
      const now = new Date()
      const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      return investments.filter(inv => {
        if (!inv.maturityDate) return false
        const maturity = new Date(inv.maturityDate)
        return maturity >= now && maturity <= cutoff
      })
    },
    [investments],
  )

  const getUpcomingPremiums = useCallback(
    (days: number): InsurancePolicyRecord[] => {
      const now = new Date()
      const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      return policies.filter(p => {
        if (!p.nextPremiumDate) return false
        const premiumDate = new Date(p.nextPremiumDate)
        return premiumDate >= now && premiumDate <= cutoff
      })
    },
    [policies],
  )

  const formatCurrency = useCallback((amount: number): string => {
    return currencyFormatter.format(amount)
  }, [])

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value: InvestmentsContextType = {
    // Data
    familyMembers,
    investments,
    policies,
    devices,
    vehicles,
    portfolioGroups,
    isLoading,

    // Family Member CRUD
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,

    // Identity Document CRUD
    addIdentityDocument,
    updateIdentityDocument,
    deleteIdentityDocument,

    // Investment CRUD
    addInvestment,
    updateInvestment,
    deleteInvestment,

    // Insurance Policy CRUD
    addPolicy,
    updatePolicy,
    deletePolicy,

    // Premium Payment
    addPremiumPayment,
    updatePremiumPayment,

    // Device CRUD
    addDevice,
    updateDevice,
    deleteDevice,

    // Vehicle CRUD
    addVehicle,
    updateVehicle,
    deleteVehicle,

    // Portfolio Group CRUD
    addPortfolioGroup,
    updatePortfolioGroup,
    deletePortfolioGroup,

    // Computed helpers
    getMemberInvestments,
    getMemberPolicies,
    getMemberDevices,
    getMemberVehicles,
    getTotalPortfolioValue,
    getTotalReturns,
    getUpcomingMaturities,
    getUpcomingPremiums,

    // Currency formatting
    formatCurrency,
  }

  return (
    <InvestmentsContext.Provider value={value}>
      {children}
    </InvestmentsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInvestments() {
  const context = useContext(InvestmentsContext)
  if (context === undefined) {
    throw new Error("useInvestments must be used within an InvestmentsProvider")
  }
  return context
}
