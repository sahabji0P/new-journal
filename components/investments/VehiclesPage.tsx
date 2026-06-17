"use client"

import { useState, useMemo } from "react"
import { Plus, Car, Search, Filter, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInvestments } from "@/contexts/InvestmentsContext"
import { EmptyState } from "@/components/investments/EmptyState"
import { VehicleCard, VEHICLE_TYPE_LABELS } from "@/components/investments/VehicleCard"
import { VehicleDetail } from "@/components/investments/VehicleDetail"
import { VehicleForm } from "@/components/investments/VehicleForm"
import type { VehicleRecord, VehicleType } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TYPES: VehicleType[] = [
  "car", "motorcycle", "scooter", "bicycle", "auto", "other",
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VehiclesPage() {
  const { vehicles, formatCurrency, isLoading, familyMembers } = useInvestments()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterMember, setFilterMember] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | undefined>(undefined)

  // -----------------------------------------------------------------------
  // Filter logic
  // -----------------------------------------------------------------------

  const filteredVehicles = useMemo(() => {
    let result = vehicles

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.make && v.make.toLowerCase().includes(q)) ||
          (v.vehicleModel && v.vehicleModel.toLowerCase().includes(q)) ||
          (v.memberName && v.memberName.toLowerCase().includes(q)) ||
          (v.registrationNo && v.registrationNo.toLowerCase().includes(q))
      )
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((v) => v.type === filterType)
    }

    // Member filter
    if (filterMember !== "all") {
      result = result.filter((v) => v.memberId === filterMember)
    }

    return result
  }, [vehicles, searchQuery, filterType, filterMember])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSelect = (vehicle: VehicleRecord) => {
    setSelectedVehicle(vehicle)
  }

  const handleAddNew = () => {
    setEditingVehicle(undefined)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingVehicle(undefined)
  }

  const handleCloseDetail = () => {
    setSelectedVehicle(null)
  }

  const handleEditFromDetail = () => {
    if (selectedVehicle) {
      setEditingVehicle(selectedVehicle)
      setSelectedVehicle(null)
      setShowForm(true)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading vehicles...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
        <Button onClick={handleAddNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Vehicle</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            {showFilters ? <ChevronUp className="size-4" /> : <Filter className="size-4" />}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {VEHICLE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {familyMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {filteredVehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles found"
          description={
            vehicles.length === 0
              ? "Start tracking your vehicles by adding one."
              : "Try adjusting your filters or search query."
          }
          actionLabel={vehicles.length === 0 ? "Add Vehicle" : undefined}
          onAction={vehicles.length === 0 ? handleAddNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onClick={() => handleSelect(vehicle)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedVehicle && (
        <VehicleDetail
          vehicle={selectedVehicle}
          open={!!selectedVehicle}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* Form */}
      <VehicleForm
        vehicle={editingVehicle}
        open={showForm}
        onClose={handleCloseForm}
      />
    </div>
  )
}
