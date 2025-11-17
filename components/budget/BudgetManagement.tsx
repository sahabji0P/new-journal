"use client"

import { useApp } from "@/contexts/AppContext"
import type { Budget, SubBudget } from "@/lib/types"
import { DollarSign, Edit, Landmark, Plus, Trash2, TrendingDown } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Progress } from "../ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

export function BudgetManagement() {
  const { budgets, categories, addBudget, updateBudget, deleteBudget, formatCurrency } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    type: "monthly" as "monthly" | "event" | "trip",
    totalAllocated: "",
    subBudgets: [] as { category: string; allocated: string }[],
  })

  const expenseCategories = categories.filter(c => c.type === "expense" || c.type === "both")

  const handleAddBudget = () => {
    if (!formData.name || !formData.totalAllocated) return

    const subBudgets: SubBudget[] = formData.subBudgets
      .filter(sb => sb.category && sb.allocated)
      .map((sb, index) => ({
        id: index + 1,
        category: sb.category,
        allocated: parseFloat(sb.allocated),
        spent: 0,
      }))

    addBudget({
      name: formData.name,
      type: formData.type,
      totalAllocated: parseFloat(formData.totalAllocated),
      subBudgets,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditBudget = () => {
    if (!selectedBudget || !formData.name || !formData.totalAllocated) return

    const subBudgets: SubBudget[] = formData.subBudgets
      .filter(sb => sb.category && sb.allocated)
      .map((sb, index) => ({
        id: index + 1,
        category: sb.category,
        allocated: parseFloat(sb.allocated),
        spent: selectedBudget.subBudgets.find(s => s.category === sb.category)?.spent || 0,
      }))

    updateBudget(selectedBudget.id, {
      name: formData.name,
      type: formData.type,
      totalAllocated: parseFloat(formData.totalAllocated),
      subBudgets,
    })

    resetForm()
    setIsEditDialogOpen(false)
    setSelectedBudget(null)
  }

  const handleDeleteBudget = () => {
    if (selectedBudget) {
      deleteBudget(selectedBudget.id)
      setIsDeleteDialogOpen(false)
      setSelectedBudget(null)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "monthly",
      totalAllocated: "",
      subBudgets: [],
    })
  }

  const openEditDialog = (budget: Budget) => {
    setSelectedBudget(budget)
    setFormData({
      name: budget.name,
      type: budget.type,
      totalAllocated: budget.totalAllocated.toString(),
      subBudgets: budget.subBudgets.map(sb => ({
        category: sb.category,
        allocated: sb.allocated.toString(),
      })),
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (budget: Budget) => {
    setSelectedBudget(budget)
    setIsDeleteDialogOpen(true)
  }

  const addSubBudget = () => {
    setFormData({
      ...formData,
      subBudgets: [...formData.subBudgets, { category: "", allocated: "" }],
    })
  }

  const removeSubBudget = (index: number) => {
    setFormData({
      ...formData,
      subBudgets: formData.subBudgets.filter((_, i) => i !== index),
    })
  }

  const updateSubBudget = (index: number, field: "category" | "allocated", value: string) => {
    const updated = [...formData.subBudgets]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, subBudgets: updated })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>Create and manage your spending plans</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <div className="text-center py-12">
              <Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No budgets yet. Create your first budget to start tracking spending!</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Budget
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {budgets.map(budget => {
                const percentage = budget.totalAllocated > 0 ? (budget.totalSpent / budget.totalAllocated) * 100 : 0
                const remaining = budget.totalAllocated - budget.totalSpent
                const isOverBudget = remaining < 0

                return (
                  <Card key={budget.id} className="border-2">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{budget.name}</CardTitle>
                          <CardDescription className="capitalize">{budget.type} Budget</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(budget)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(budget)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Overall Budget Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-muted-foreground" />
                            <span className="font-semibold">Overall Progress</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(percentage)}% used
                          </span>
                        </div>
                        <Progress
                          value={Math.min(percentage, 100)}
                          className={`h-3 ${isOverBudget ? "[&>div]:bg-red-500" : percentage > 80 ? "[&>div]:bg-amber-500" : ""}`}
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent: {formatCurrency(budget.totalSpent)}</span>
                          <span className={`font-medium ${isOverBudget ? "text-red-500" : "text-green-500"}`}>
                            Remaining: {formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      {budget.subBudgets.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground">Category Breakdown</h4>
                          {budget.subBudgets.map(subBudget => {
                            const subPercentage = subBudget.allocated > 0 ? (subBudget.spent / subBudget.allocated) * 100 : 0
                            const subRemaining = subBudget.allocated - subBudget.spent
                            const isSubOver = subRemaining < 0

                            return (
                              <div key={subBudget.id} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">{subBudget.category}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(subBudget.spent)} / {formatCurrency(subBudget.allocated)}
                                  </span>
                                </div>
                                <Progress
                                  value={Math.min(subPercentage, 100)}
                                  className={`h-2 ${isSubOver ? "[&>div]:bg-red-500" : subPercentage > 80 ? "[&>div]:bg-amber-500" : ""}`}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Budget Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <TrendingDown className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Allocated</p>
                            <p className="font-semibold">{formatCurrency(budget.totalAllocated)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isOverBudget ? "bg-red-500/10" : "bg-green-500/10"}`}>
                            <DollarSign className={`w-5 h-5 ${isOverBudget ? "text-red-500" : "text-green-500"}`} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Status</p>
                            <p className={`font-semibold ${isOverBudget ? "text-red-500" : "text-green-500"}`}>
                              {isOverBudget ? "Over Budget" : "On Track"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Budget Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>Set up a new budget with category allocations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="budget-name">Budget Name</Label>
              <Input
                id="budget-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Monthly Budget, Vacation, Holiday Shopping"
              />
            </div>
            <div>
              <Label htmlFor="budget-type">Budget Type</Label>
              <Select value={formData.type} onValueChange={(value: "monthly" | "event" | "trip") => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="budget-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Budget</SelectItem>
                  <SelectItem value="event">Event Budget</SelectItem>
                  <SelectItem value="trip">Trip Budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="total-allocated">Total Budget Amount</Label>
              <Input
                id="total-allocated"
                type="number"
                step="0.01"
                value={formData.totalAllocated}
                onChange={(e) => setFormData({ ...formData, totalAllocated: e.target.value })}
                placeholder="e.g. 3000"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Category Allocations</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSubBudget}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Category
                </Button>
              </div>

              {formData.subBudgets.map((subBudget, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={subBudget.category}
                    onValueChange={(value) => updateSubBudget(index, "category", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={subBudget.allocated}
                    onChange={(e) => updateSubBudget(index, "allocated", e.target.value)}
                    placeholder="Amount"
                    className="w-32"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSubBudget(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddBudget}>Create Budget</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>Update budget details and allocations</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-budget-name">Budget Name</Label>
              <Input
                id="edit-budget-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-budget-type">Budget Type</Label>
              <Select value={formData.type} onValueChange={(value: "monthly" | "event" | "trip") => setFormData({ ...formData, type: value })}>
                <SelectTrigger id="edit-budget-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Budget</SelectItem>
                  <SelectItem value="event">Event Budget</SelectItem>
                  <SelectItem value="trip">Trip Budget</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-total-allocated">Total Budget Amount</Label>
              <Input
                id="edit-total-allocated"
                type="number"
                step="0.01"
                value={formData.totalAllocated}
                onChange={(e) => setFormData({ ...formData, totalAllocated: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Category Allocations</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSubBudget}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Category
                </Button>
              </div>

              {formData.subBudgets.map((subBudget, index) => (
                <div key={index} className="flex gap-2">
                  <Select
                    value={subBudget.category}
                    onValueChange={(value) => updateSubBudget(index, "category", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    value={subBudget.allocated}
                    onChange={(e) => updateSubBudget(index, "allocated", e.target.value)}
                    placeholder="Amount"
                    className="w-32"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSubBudget(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedBudget(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleEditBudget}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedBudget.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{selectedBudget.type} Budget</p>
              <p className="text-sm mt-2">Total: {formatCurrency(selectedBudget.totalAllocated)}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setSelectedBudget(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBudget}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
