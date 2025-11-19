"use client"

import { useApp } from "@/contexts/AppContext"
import type { Goal } from "@/lib/types"
import { Plus, Target, Edit, Trash2, TrendingUp } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Checkbox } from "../ui/checkbox"

export function GoalsManagement() {
  const { goals, accounts, addGoal, updateGoal, deleteGoal, contributeToGoal, formatCurrency, formatDate } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    targetDate: "",
    monthlyContribution: "",
    priority: "medium" as "low" | "medium" | "high",
    accountId: "",
    includeInSpendingPlan: false,
    notes: "",
  })

  const [contributeAmount, setContributeAmount] = useState("")

  const resetForm = () => {
    setFormData({
      name: "",
      targetAmount: "",
      targetDate: "",
      monthlyContribution: "",
      priority: "medium",
      accountId: "",
      includeInSpendingPlan: false,
      notes: "",
    })
  }

  const handleAddGoal = () => {
    if (!formData.name || !formData.targetAmount) return

    addGoal({
      name: formData.name,
      targetAmount: Number.parseFloat(formData.targetAmount),
      targetDate: formData.targetDate || undefined,
      monthlyContribution: formData.monthlyContribution
        ? Number.parseFloat(formData.monthlyContribution)
        : undefined,
      priority: formData.priority,
      accountId: formData.accountId && formData.accountId !== "none" ? formData.accountId : undefined,
      includeInSpendingPlan: formData.includeInSpendingPlan,
      notes: formData.notes || undefined,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditGoal = () => {
    if (!selectedGoal || !formData.name || !formData.targetAmount) return

    updateGoal(selectedGoal.id, {
      name: formData.name,
      targetAmount: Number.parseFloat(formData.targetAmount),
      targetDate: formData.targetDate || undefined,
      monthlyContribution: formData.monthlyContribution
        ? Number.parseFloat(formData.monthlyContribution)
        : undefined,
      priority: formData.priority,
      accountId: formData.accountId && formData.accountId !== "none" ? formData.accountId : undefined,
      includeInSpendingPlan: formData.includeInSpendingPlan,
      notes: formData.notes || undefined,
    })

    resetForm()
    setIsEditDialogOpen(false)
    setSelectedGoal(null)
  }

  const handleDeleteGoal = () => {
    if (selectedGoal) {
      deleteGoal(selectedGoal.id)
      setIsDeleteDialogOpen(false)
      setSelectedGoal(null)
    }
  }

  const openEditDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate || "",
      monthlyContribution: goal.monthlyContribution?.toString() || "",
      priority: goal.priority,
      accountId: goal.accountId?.toString() || "",
      includeInSpendingPlan: goal.includeInSpendingPlan,
      notes: goal.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setIsDeleteDialogOpen(true)
  }

  const openContributeDialog = (goal: Goal) => {
    setSelectedGoal(goal)
    setContributeAmount("")
    setIsContributeDialogOpen(true)
  }

  const handleContribute = () => {
    if (!selectedGoal || !contributeAmount) return

    const amount = parseFloat(contributeAmount)
    if (amount <= 0) return

    contributeToGoal(selectedGoal.id, amount)
    setIsContributeDialogOpen(false)
    setSelectedGoal(null)
    setContributeAmount("")
  }

  const getProgressPercentage = (goal: Goal) => {
    return goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600"
      case "medium":
        return "text-amber-600"
      case "low":
        return "text-emerald-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="font-mono">Savings Goals</CardTitle>
              <CardDescription className="font-mono text-xs">
                Track your financial goals and progress
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 font-mono text-sm">
              <Plus className="w-4 h-4" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-mono text-sm">
                No goals yet. Create your first savings goal to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          goals.map((goal) => {
            const progress = getProgressPercentage(goal)
            const remaining = goal.targetAmount - goal.currentAmount

            return (
              <Card key={goal.id} className="hover:shadow-md clean-transition">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold font-mono">{goal.name}</h3>
                      </div>
                      <p className={`text-xs font-mono uppercase ${getPriorityColor(goal.priority)}`}>
                        {goal.priority} priority
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openContributeDialog(goal)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                        title="Contribute to goal"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(goal)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(goal)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm font-mono mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full clean-transition ${
                          progress >= 100 ? "bg-emerald-600" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between font-mono text-sm">
                      <span className="text-muted-foreground">Current</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-sm">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-semibold">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className={`font-semibold ${remaining > 0 ? "" : "text-emerald-600"}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {goal.targetDate && (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-2">
                      <TrendingUp className="w-3 h-3" />
                      <span>Target: {formatDate(goal.targetDate)}</span>
                    </div>
                  )}
                  {goal.monthlyContribution && (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <span>Monthly: {formatCurrency(goal.monthlyContribution)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Add New Goal</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a new savings goal to track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name" className="font-mono text-xs">
                Goal Name
              </Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emergency Fund"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-target" className="font-mono text-xs">
                  Target Amount
                </Label>
                <Input
                  id="add-target"
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="add-monthly" className="font-mono text-xs">
                  Monthly Contribution
                </Label>
                <Input
                  id="add-monthly"
                  type="number"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="add-target-date" className="font-mono text-xs">
                Target Date (optional)
              </Label>
              <Input
                id="add-target-date"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-priority" className="font-mono text-xs">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "medium" | "high") =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="add-priority" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="add-account" className="font-mono text-xs">
                  Linked Account (optional)
                </Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="add-account" className="font-mono">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-include-plan"
                checked={formData.includeInSpendingPlan}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeInSpendingPlan: !!checked })
                }
              />
              <Label htmlFor="add-include-plan" className="font-mono text-xs cursor-pointer">
                Include in spending plan
              </Label>
            </div>
            <div>
              <Label htmlFor="add-notes" className="font-mono text-xs">
                Notes (optional)
              </Label>
              <Input
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                className="font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  resetForm()
                }}
                className="font-mono text-sm"
              >
                Cancel
              </Button>
              <Button onClick={handleAddGoal} className="font-mono text-sm">
                Add Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Goal</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update your savings goal details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="font-mono text-xs">
                Goal Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-target" className="font-mono text-xs">
                  Target Amount
                </Label>
                <Input
                  id="edit-target"
                  type="number"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="edit-monthly" className="font-mono text-xs">
                  Monthly Contribution
                </Label>
                <Input
                  id="edit-monthly"
                  type="number"
                  step="0.01"
                  value={formData.monthlyContribution}
                  onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-target-date" className="font-mono text-xs">
                Target Date
              </Label>
              <Input
                id="edit-target-date"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-priority" className="font-mono text-xs">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "medium" | "high") =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="edit-priority" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-account" className="font-mono text-xs">
                  Linked Account
                </Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="edit-account" className="font-mono">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-include-plan"
                checked={formData.includeInSpendingPlan}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeInSpendingPlan: !!checked })
                }
              />
              <Label htmlFor="edit-include-plan" className="font-mono text-xs cursor-pointer">
                Include in spending plan
              </Label>
            </div>
            <div>
              <Label htmlFor="edit-notes" className="font-mono text-xs">
                Notes
              </Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedGoal(null)
                  resetForm()
                }}
                className="font-mono text-sm"
              >
                Cancel
              </Button>
              <Button onClick={handleEditGoal} className="font-mono text-sm">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Delete Goal</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Are you sure you want to delete this goal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedGoal && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold font-mono">{selectedGoal.name}</p>
              <p className="text-sm text-muted-foreground font-mono">
                {formatCurrency(selectedGoal.currentAmount)} / {formatCurrency(selectedGoal.targetAmount)}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedGoal(null)
              }}
              className="font-mono text-sm"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGoal} className="font-mono text-sm">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contribute to Goal Dialog */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Contribute to Goal</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Add money to your savings goal
            </DialogDescription>
          </DialogHeader>
          {selectedGoal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold font-mono mb-2">{selectedGoal.name}</p>
                <div className="flex items-center justify-between text-sm font-mono mb-2">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(selectedGoal.currentAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-semibold">{formatCurrency(selectedGoal.targetAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-mono mt-2 pt-2 border-t">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold">
                    {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="contribute-amount" className="font-mono text-xs">
                  Amount to Contribute
                </Label>
                <Input
                  id="contribute-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsContributeDialogOpen(false)
                    setSelectedGoal(null)
                    setContributeAmount("")
                  }}
                  className="font-mono text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContribute}
                  className="font-mono text-sm"
                  disabled={!contributeAmount || parseFloat(contributeAmount) <= 0}
                >
                  Contribute
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
