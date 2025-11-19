"use client"

import { PageLayout } from "@/components/PageLayout"
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
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useApp } from "@/contexts/AppContext"
import type { SubBudget } from "@/lib/types"
import { Landmark, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

export default function BudgetPage() {
  const { budgets, addBudget, updateBudget, deleteBudget, categories, formatCurrency } = useApp()
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [createFormData, setCreateFormData] = useState({
    name: "",
    type: "monthly" as "monthly" | "event" | "trip",
  })

  const [addCategoryFormData, setAddCategoryFormData] = useState({
    category: "",
    allocated: "",
  })

  // Set initial selected budget
  useEffect(() => {
    if (budgets.length > 0 && selectedBudgetId === null) {
      setSelectedBudgetId(budgets[0].id)
    }
  }, [budgets, selectedBudgetId])

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId)

  const handleCreateBudget = () => {
    if (createFormData.type !== "monthly" && !createFormData.name.trim()) return

    const budgetName = createFormData.type === "monthly" ? "Monthly" : createFormData.name

    addBudget({
      name: budgetName,
      type: createFormData.type,
      totalAllocated: 0,
      subBudgets: [],
    })

    setCreateFormData({ name: "", type: "monthly" })
    setIsCreateDialogOpen(false)
  }

  const handleAddCategory = () => {
    if (!selectedBudget || !addCategoryFormData.category || !addCategoryFormData.allocated) return

    const allocated = Number.parseFloat(addCategoryFormData.allocated)
    if (Number.isNaN(allocated) || allocated <= 0) return

    const newSubBudget: SubBudget = {
      id: crypto.randomUUID(),
      category: addCategoryFormData.category,
      allocated,
      spent: 0,
    }

    const updatedSubBudgets = [...selectedBudget.subBudgets, newSubBudget]
    const newTotalAllocated = updatedSubBudgets.reduce((sum, sb) => sum + sb.allocated, 0)

    updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })

    setAddCategoryFormData({ category: "", allocated: "" })
    setIsAddCategoryDialogOpen(false)
  }

  const handleUpdateSubBudgetAllocation = (subBudgetId: string, allocated: string) => {
    if (!selectedBudget) return

    const allocatedAmount = Number.parseFloat(allocated)
    if (Number.isNaN(allocatedAmount) || allocatedAmount < 0) return

    const updatedSubBudgets = selectedBudget.subBudgets.map(sb =>
      sb.id === subBudgetId ? { ...sb, allocated: allocatedAmount } : sb
    )

    const newTotalAllocated = updatedSubBudgets.reduce((sum, sb) => sum + sb.allocated, 0)

    updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })
  }

  const handleRemoveSubBudget = (subBudgetId: string) => {
    if (!selectedBudget) return

    const updatedSubBudgets = selectedBudget.subBudgets.filter(sb => sb.id !== subBudgetId)
    const newTotalAllocated = updatedSubBudgets.reduce((sum, sb) => sum + sb.allocated, 0)

    updateBudget(selectedBudget.id, {
      subBudgets: updatedSubBudgets,
      totalAllocated: newTotalAllocated,
    })
  }

  const handleDeleteBudget = () => {
    if (!selectedBudget) return

    deleteBudget(selectedBudget.id)
    setIsDeleteDialogOpen(false)
    setSelectedBudgetId(budgets[0]?.id || null)
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Budgets</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Budget
          </Button>
        </div>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No budgets yet. Create your first budget to track your spending!
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Budget List */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Your Budgets</CardTitle>
                  <CardDescription>{budgets.length} budget(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {budgets.map(budget => {
                      const percentage =
                        budget.totalAllocated > 0
                          ? (budget.totalSpent / budget.totalAllocated) * 100
                          : 0
                      return (
                        <button
                          key={budget.id}
                          onClick={() => setSelectedBudgetId(budget.id)}
                          className={`w-full text-left p-4 rounded-lg transition-all border ${
                            selectedBudgetId === budget.id
                              ? "bg-primary/10 border-primary/50"
                              : "hover:bg-muted/50 border-transparent"
                          }`}
                        >
                          <div className="space-y-2">
                            <div>
                              <p className="font-semibold">{budget.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {budget.type} Budget
                              </p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Spent</span>
                                <span className="font-medium">
                                  {formatCurrency(budget.totalSpent)}
                                </span>
                              </div>
                              <Progress value={Math.min(percentage, 100)} className="h-1" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>of {formatCurrency(budget.totalAllocated)}</span>
                                <span>{percentage.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Budget Details */}
            {selectedBudget && (
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{selectedBudget.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {selectedBudget.type} Budget
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Total Allocated</Label>
                        <p className="text-2xl font-bold">
                          {formatCurrency(selectedBudget.totalAllocated)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Spent</Label>
                        <p className="text-2xl font-bold text-red-500">
                          {formatCurrency(selectedBudget.totalSpent)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Remaining</Label>
                        <p
                          className={`text-2xl font-bold ${
                            selectedBudget.totalAllocated - selectedBudget.totalSpent >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {formatCurrency(
                            selectedBudget.totalAllocated - selectedBudget.totalSpent
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedBudget.subBudgets.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-4">Category Budgets</h3>
                        <div className="space-y-4">
                          {selectedBudget.subBudgets.map(sb => {
                            const percentage =
                              sb.allocated > 0 ? (sb.spent / sb.allocated) * 100 : 0
                            return (
                              <div key={sb.id} className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label>{sb.category}</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={sb.allocated}
                                      onChange={e =>
                                        handleUpdateSubBudgetAllocation(sb.id, e.target.value)
                                      }
                                      className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                      {formatCurrency(sb.spent)} spent
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveSubBudget(sb.id)}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                                <Progress value={Math.min(percentage, 100)} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>
                                    {formatCurrency(sb.allocated - sb.spent)} remaining
                                  </span>
                                  <span>{percentage.toFixed(0)}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedBudget.subBudgets.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No categories yet. Add categories to start tracking spending.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button onClick={() => setIsAddCategoryDialogOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Category
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Create Budget Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>Set up a new budget to track your spending</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget-type">Budget Type</Label>
                <Select
                  value={createFormData.type}
                  onValueChange={(value: "monthly" | "event" | "trip") =>
                    setCreateFormData({ ...createFormData, type: value })
                  }
                >
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
              {createFormData.type !== "monthly" && (
                <div>
                  <Label htmlFor="budget-name">Budget Name</Label>
                  <Input
                    id="budget-name"
                    value={createFormData.name}
                    onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })}
                    placeholder="e.g., Goa Trip, Birthday Party"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    setCreateFormData({ name: "", type: "monthly" })
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateBudget}>Create Budget</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category to Budget</DialogTitle>
              <DialogDescription>Allocate funds to a category</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-select">Category</Label>
                <Select
                  value={addCategoryFormData.category}
                  onValueChange={value =>
                    setAddCategoryFormData({ ...addCategoryFormData, category: value })
                  }
                >
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.type === "expense" || c.type === "both")
                      .map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="allocated-amount">Allocated Amount</Label>
                <Input
                  id="allocated-amount"
                  type="number"
                  step="0.01"
                  value={addCategoryFormData.allocated}
                  onChange={e =>
                    setAddCategoryFormData({ ...addCategoryFormData, allocated: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddCategoryDialogOpen(false)
                    setAddCategoryFormData({ category: "", allocated: "" })
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCategory}>Add Category</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Budget Dialog */}
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
                <p className="text-sm mt-2">
                  {selectedBudget.subBudgets.length} categor{selectedBudget.subBudgets.length !== 1 ? "ies" : "y"}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
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
    </PageLayout>
  )
}
