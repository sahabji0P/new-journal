"use client"

import { useState, useMemo } from "react"
import { Plus, Smartphone, Search, Filter, ChevronUp } from "lucide-react"
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
import { DeviceCard, DEVICE_CATEGORY_LABELS } from "@/components/investments/DeviceCard"
import { DeviceDetail } from "@/components/investments/DeviceDetail"
import { DeviceForm } from "@/components/investments/DeviceForm"
import type { DeviceRecord, DeviceCategory } from "@/lib/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CATEGORIES: DeviceCategory[] = [
  "phone", "laptop", "tablet", "desktop", "tv",
  "appliance", "camera", "wearable", "audio", "gaming", "other",
]

const ALL_DEVICE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "in_repair", label: "In Repair" },
  { value: "retired", label: "Retired" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevicesPage() {
  const { devices, formatCurrency, isLoading, familyMembers } = useInvestments()
  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterMember, setFilterMember] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDevice, setEditingDevice] = useState<DeviceRecord | undefined>(undefined)

  // -----------------------------------------------------------------------
  // Filter logic
  // -----------------------------------------------------------------------

  const filteredDevices = useMemo(() => {
    let result = devices

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.brand && d.brand.toLowerCase().includes(q)) ||
          (d.model && d.model.toLowerCase().includes(q)) ||
          (d.memberName && d.memberName.toLowerCase().includes(q)) ||
          (d.serialNumber && d.serialNumber.toLowerCase().includes(q))
      )
    }

    // Category filter
    if (filterCategory !== "all") {
      result = result.filter((d) => d.category === filterCategory)
    }

    // Member filter
    if (filterMember !== "all") {
      result = result.filter((d) => d.memberId === filterMember)
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((d) => d.status === filterStatus)
    }

    return result
  }, [devices, searchQuery, filterCategory, filterMember, filterStatus])

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSelect = (device: DeviceRecord) => {
    setSelectedDevice(device)
  }

  const handleAddNew = () => {
    setEditingDevice(undefined)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingDevice(undefined)
  }

  const handleCloseDetail = () => {
    setSelectedDevice(null)
  }

  const handleEditFromDetail = () => {
    if (selectedDevice) {
      setEditingDevice(selectedDevice)
      setSelectedDevice(null)
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
          <span className="text-sm">Loading devices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <Button onClick={handleAddNew}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Device</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DEVICE_CATEGORY_LABELS[cat]}
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ALL_DEVICE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      {filteredDevices.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No devices found"
          description={
            devices.length === 0
              ? "Start tracking your devices by adding one."
              : "Try adjusting your filters or search query."
          }
          actionLabel={devices.length === 0 ? "Add Device" : undefined}
          onAction={devices.length === 0 ? handleAddNew : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => handleSelect(device)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedDevice && (
        <DeviceDetail
          device={selectedDevice}
          open={!!selectedDevice}
          onClose={handleCloseDetail}
          onEdit={handleEditFromDetail}
        />
      )}

      {/* Form */}
      <DeviceForm
        device={editingDevice}
        open={showForm}
        onClose={handleCloseForm}
      />
    </div>
  )
}
