"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { Watchlist } from "@/lib/types"
import { AlertCircle, Edit, Eye, Plus, Trash2 } from "lucide-react"
import { useState, useMemo } from "react"

export function WatchlistsManagement() {
  const {
    watchlists,
    addWatchlist,
    updateWatchlist,
    deleteWatchlist,
    transactions,
    categories,
    parties,
    formatCurrency,
  } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    type: "category" as "category" | "tag" | "payee",
    value: "",
    budgetLimit: "",
    period: "monthly" as "monthly" | "yearly" | "custom",
    startDate: "",
    endDate: "",
    alertEnabled: false,
    alertThreshold: "80",
    color: "#3b82f6",
  })
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const editFormGuard = useFormCloseGuard<typeof formData>()

  const defaultFormData = {
    name: "",
    type: "category" as "category" | "tag" | "payee",
    value: "",
    budgetLimit: "",
    period: "monthly" as "monthly" | "yearly" | "custom",
    startDate: "",
    endDate: "",
    alertEnabled: false,
    alertThreshold: "80",
    color: "#3b82f6",
  }

  const getWatchlistSpending = (watchlist: Watchlist) => {
    const now = new Date()
    let filteredTransactions = transactions

    // Filter by period
    if (watchlist.period === "monthly") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filteredTransactions = transactions.filter(t => new Date(t.date) >= firstDayOfMonth)
    } else if (watchlist.period === "yearly") {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      filteredTransactions = transactions.filter(t => new Date(t.date) >= firstDayOfYear)
    } else if (watchlist.period === "custom" && watchlist.startDate) {
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date)
        const start = new Date(watchlist.startDate!)
        const end = watchlist.endDate ? new Date(watchlist.endDate) : now
        return tDate >= start && tDate <= end
      })
    }

    // Filter by watchlist type
    switch (watchlist.type) {
      case "category":
        filteredTransactions = filteredTransactions.filter(t => t.category === watchlist.value)
        break
      case "tag":
        filteredTransactions = filteredTransactions.filter(t => t.tags?.includes(watchlist.value))
        break
      case "payee":
        filteredTransactions = filteredTransactions.filter(t => t.party === watchlist.value)
        break
    }

    // Sum expenses only (ignore income)
    const totalSpent = Math.abs(
      filteredTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    )

    return {
      spent: totalSpent,
      count: filteredTransactions.filter(t => t.type === "expense").length,
      limit: watchlist.budgetLimit || 0,
      percentage: watchlist.budgetLimit ? (totalSpent / watchlist.budgetLimit) * 100 : 0,
    }
  }

  const getWatchlistTypeColor = (type: string) => {
    switch (type) {
      case "category":
        return "bg-blue-500/10 text-blue-500"
      case "tag":
        return "bg-purple-500/10 text-purple-500"
      case "payee":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "monthly":
        return "Monthly"
      case "yearly":
        return "Yearly"
      case "custom":
        return "Custom Range"
      default:
        return period
    }
  }

  const handleAddWatchlist = () => {
    if (!formData.name.trim() || !formData.value.trim()) return

    addWatchlist({
      name: formData.name,
      type: formData.type,
      value: formData.value,
      budgetLimit: formData.budgetLimit ? Number.parseFloat(formData.budgetLimit) : undefined,
      period: formData.period,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      alertEnabled: formData.alertEnabled,
      alertThreshold: formData.alertThreshold ? Number.parseFloat(formData.alertThreshold) : undefined,
      color: formData.color,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditWatchlist = () => {
    if (!selectedWatchlist || !formData.name.trim() || !formData.value.trim()) return

    updateWatchlist(selectedWatchlist.id, {
      name: formData.name,
      type: formData.type,
      value: formData.value,
      budgetLimit: formData.budgetLimit ? Number.parseFloat(formData.budgetLimit) : undefined,
      period: formData.period,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      alertEnabled: formData.alertEnabled,
      alertThreshold: formData.alertThreshold ? Number.parseFloat(formData.alertThreshold) : undefined,
      color: formData.color,
    })

    editFormGuard.clearSnapshot()
    resetForm()
    setIsEditDialogOpen(false)
    setSelectedWatchlist(null)
  }

  const handleDeleteWatchlist = () => {
    if (!selectedWatchlist) return

    deleteWatchlist(selectedWatchlist.id)
    setIsDeleteDialogOpen(false)
    setSelectedWatchlist(null)
  }

  const resetForm = () => {
    setFormData(defaultFormData)
  }

  const openEditDialog = (watchlist: Watchlist) => {
    const editData = {
      name: watchlist.name,
      type: watchlist.type,
      value: watchlist.value,
      budgetLimit: watchlist.budgetLimit ? watchlist.budgetLimit.toString() : "",
      period: watchlist.period,
      startDate: watchlist.startDate || "",
      endDate: watchlist.endDate || "",
      alertEnabled: watchlist.alertEnabled,
      alertThreshold: watchlist.alertThreshold ? watchlist.alertThreshold.toString() : "80",
      color: watchlist.color || "#3b82f6",
    }
    setSelectedWatchlist(watchlist)
    setFormData(editData)
    editFormGuard.rememberSnapshot(editData)
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData(defaultFormData)
    addFormGuard.rememberSnapshot(defaultFormData)
    setIsAddDialogOpen(true)
  }

  const handleAddDialogChange = (open: boolean) => {
    if (open) {
      setIsAddDialogOpen(true)
      return
    }
    if (!addFormGuard.confirmClose(formData)) return
    addFormGuard.clearSnapshot()
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleEditDialogChange = (open: boolean) => {
    if (open) {
      setIsEditDialogOpen(true)
      return
    }
    if (!editFormGuard.confirmClose(formData)) return
    editFormGuard.clearSnapshot()
    setIsEditDialogOpen(false)
    setSelectedWatchlist(null)
    resetForm()
  }

  const openDeleteDialog = (watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist)
    setIsDeleteDialogOpen(true)
  }

  // Get available values based on type
  const availableValues = useMemo(() => {
    switch (formData.type) {
      case "category":
        return categories.map(c => c.name)
      case "payee":
        return parties.map(p => p.name)
      case "tag":
        // Extract all unique tags from transactions
        const allTags = new Set<string>()
        transactions.forEach(t => {
          t.tags?.forEach(tag => allTags.add(tag))
        })
        return Array.from(allTags).sort()
      default:
        return []
    }
  }, [formData.type, categories, parties, transactions])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Watchlists</CardDescription>
            <CardTitle className="text-2xl">{watchlists.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Alerts</CardDescription>
            <CardTitle className="text-2xl">
              {watchlists.filter(w => w.alertEnabled).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Over Budget</CardDescription>
            <CardTitle className="text-2xl text-red-500">
              {watchlists.filter(w => {
                const spending = getWatchlistSpending(w)
                return spending.limit > 0 && spending.spent > spending.limit
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Watchlists List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>Your Watchlists</CardTitle>
              <CardDescription>Track and monitor your spending patterns</CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Watchlist
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {watchlists.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 font-mono">
                No watchlists yet. Create your first watchlist to track spending!
              </p>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Watchlist
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {watchlists.map(watchlist => {
                const spending = getWatchlistSpending(watchlist)
                const isOverBudget = spending.limit > 0 && spending.spent > spending.limit
                const isNearThreshold =
                  spending.limit > 0 &&
                  watchlist.alertThreshold &&
                  spending.percentage >= watchlist.alertThreshold

                return (
                  <div
                    key={watchlist.id}
                    className="p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${getWatchlistTypeColor(watchlist.type)}`}
                          style={{ backgroundColor: watchlist.color ? `${watchlist.color}20` : undefined }}
                        >
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold font-mono">{watchlist.name}</p>
                            {watchlist.alertEnabled && (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground font-mono">
                            <span className="capitalize">{watchlist.type}</span>
                            <span>•</span>
                            <span>{watchlist.value}</span>
                            <span>•</span>
                            <span>{getPeriodLabel(watchlist.period)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(watchlist)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(watchlist)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Spending Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-mono">
                        <span className="text-muted-foreground">Spent</span>
                        <span className={isOverBudget ? "text-red-500 font-semibold" : ""}>
                          {formatCurrency(spending.spent)}
                          {spending.limit > 0 && ` / ${formatCurrency(spending.limit)}`}
                        </span>
                      </div>

                      {spending.limit > 0 && (
                        <>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOverBudget
                                  ? "bg-red-500"
                                  : isNearThreshold
                                    ? "bg-yellow-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(100, spending.percentage)}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground">
                              {spending.count} transaction(s)
                            </span>
                            <span
                              className={
                                isOverBudget
                                  ? "text-red-500"
                                  : isNearThreshold
                                    ? "text-yellow-500"
                                    : "text-muted-foreground"
                              }
                            >
                              {spending.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </>
                      )}

                      {!spending.limit && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {spending.count} transaction(s) tracked (no limit set)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Watchlist Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Watchlist</DialogTitle>
            <DialogDescription>Create a watchlist to track spending patterns</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-watchlist-name">Watchlist Name</Label>
              <Input
                id="add-watchlist-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Monthly Groceries, Online Shopping"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-watchlist-type">Track By</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "category" | "tag" | "payee") => {
                    setFormData({ ...formData, type: value, value: "" })
                  }}
                >
                  <SelectTrigger id="add-watchlist-type" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="payee">Payee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-watchlist-value">Value</Label>
                <Select
                  value={formData.value}
                  onValueChange={(value) => setFormData({ ...formData, value })}
                >
                  <SelectTrigger id="add-watchlist-value" className="font-mono">
                    <SelectValue placeholder={`Select ${formData.type}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableValues.map((val) => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-watchlist-period">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: "monthly" | "yearly" | "custom") =>
                    setFormData({ ...formData, period: value })
                  }
                >
                  <SelectTrigger id="add-watchlist-period" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-watchlist-limit">Budget Limit (optional)</Label>
                <Input
                  id="add-watchlist-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budgetLimit}
                  onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>

            {formData.period === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-watchlist-start">Start Date</Label>
                  <Input
                    id="add-watchlist-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="add-watchlist-end">End Date (optional)</Label>
                  <Input
                    id="add-watchlist-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Label htmlFor="add-alert-enabled" className="cursor-pointer">
                    Enable Alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when spending exceeds threshold
                  </p>
                </div>
                <Switch
                  id="add-alert-enabled"
                  checked={formData.alertEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, alertEnabled: checked })
                  }
                />
              </div>

              {formData.alertEnabled && (
                <div>
                  <Label htmlFor="add-alert-threshold">Alert Threshold (%)</Label>
                  <Input
                    id="add-alert-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                    placeholder="80"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alert when spending reaches this percentage of the limit
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddWatchlist}>Add Watchlist</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Watchlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
            <DialogDescription>Update watchlist details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Same form fields as Add Dialog */}
            <div>
              <Label htmlFor="edit-watchlist-name">Watchlist Name</Label>
              <Input
                id="edit-watchlist-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-watchlist-type">Track By</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "category" | "tag" | "payee") => {
                    setFormData({ ...formData, type: value, value: "" })
                  }}
                >
                  <SelectTrigger id="edit-watchlist-type" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="payee">Payee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-watchlist-value">Value</Label>
                <Select
                  value={formData.value}
                  onValueChange={(value) => setFormData({ ...formData, value })}
                >
                  <SelectTrigger id="edit-watchlist-value" className="font-mono">
                    <SelectValue placeholder={`Select ${formData.type}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableValues.map((val) => (
                      <SelectItem key={val} value={val}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-watchlist-period">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: "monthly" | "yearly" | "custom") =>
                    setFormData({ ...formData, period: value })
                  }
                >
                  <SelectTrigger id="edit-watchlist-period" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-watchlist-limit">Budget Limit (optional)</Label>
                <Input
                  id="edit-watchlist-limit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.budgetLimit}
                  onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>

            {formData.period === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-watchlist-start">Start Date</Label>
                  <Input
                    id="edit-watchlist-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-watchlist-end">End Date (optional)</Label>
                  <Input
                    id="edit-watchlist-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <Label htmlFor="edit-alert-enabled" className="cursor-pointer">
                    Enable Alerts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when spending exceeds threshold
                  </p>
                </div>
                <Switch
                  id="edit-alert-enabled"
                  checked={formData.alertEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, alertEnabled: checked })
                  }
                />
              </div>

              {formData.alertEnabled && (
                <div>
                  <Label htmlFor="edit-alert-threshold">Alert Threshold (%)</Label>
                  <Input
                    id="edit-alert-threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                    placeholder="80"
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            {selectedWatchlist && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-muted-foreground">Current Spending:</span>
                  <span className="font-semibold">
                    {formatCurrency(getWatchlistSpending(selectedWatchlist).spent)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold">
                    {getWatchlistSpending(selectedWatchlist).count}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => handleEditDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditWatchlist}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Watchlist Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Watchlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this watchlist? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedWatchlist && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${getWatchlistTypeColor(selectedWatchlist.type)}`}>
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono">{selectedWatchlist.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedWatchlist.type}: {selectedWatchlist.value}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Spending:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(getWatchlistSpending(selectedWatchlist).spent)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedWatchlist(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWatchlist}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
