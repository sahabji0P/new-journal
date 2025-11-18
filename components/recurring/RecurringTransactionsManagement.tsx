"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useApp } from "@/contexts/AppContext"
import type { RecurringTransaction } from "@/lib/types"
import { Edit, Plus, Repeat, Trash2, AlertCircle } from "lucide-react"
import { useState } from "react"

export function RecurringTransactionsManagement() {
  const {
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    accounts,
    categories,
    formatCurrency,
    formatDate,
  } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringTransaction | null>(null)

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    type: "expense" as "income" | "expense",
    accountId: "",
    frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
    startDate: "",
    endDate: "",
    isActive: true,
    autoCreate: true,
    reminderDays: "3",
    notes: "",
    tags: "",
  })

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "biweekly":
        return "Bi-weekly"
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "yearly":
        return "Yearly"
      default:
        return frequency
    }
  }

  const getDaysUntilDue = (nextDueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(nextDueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleAddRecurring = () => {
    if (!formData.description || !formData.amount || !formData.accountId || !formData.startDate) return

    const account = accounts.find(a => a.id === Number.parseInt(formData.accountId))
    if (!account) return

    const finalAmount =
      formData.type === "expense"
        ? -Math.abs(Number.parseFloat(formData.amount))
        : Math.abs(Number.parseFloat(formData.amount))

    const tagArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t)

    addRecurringTransaction({
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      autoCreate: formData.autoCreate,
      reminderDays: formData.reminderDays ? Number.parseInt(formData.reminderDays) : undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditRecurring = () => {
    if (!selectedRecurring || !formData.description || !formData.amount || !formData.accountId) return

    const account = accounts.find(a => a.id === Number.parseInt(formData.accountId))
    if (!account) return

    const finalAmount =
      formData.type === "expense"
        ? -Math.abs(Number.parseFloat(formData.amount))
        : Math.abs(Number.parseFloat(formData.amount))

    const tagArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t)

    updateRecurringTransaction(selectedRecurring.id, {
      description: formData.description,
      amount: finalAmount,
      category: formData.category,
      type: formData.type,
      accountId: account.id,
      accountName: account.name,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      isActive: formData.isActive,
      autoCreate: formData.autoCreate,
      reminderDays: formData.reminderDays ? Number.parseInt(formData.reminderDays) : undefined,
      notes: formData.notes.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
    })

    resetForm()
    setIsEditDialogOpen(false)
    setSelectedRecurring(null)
  }

  const handleDeleteRecurring = () => {
    if (!selectedRecurring) return

    deleteRecurringTransaction(selectedRecurring.id)
    setIsDeleteDialogOpen(false)
    setSelectedRecurring(null)
  }

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      category: "",
      type: "expense",
      accountId: "",
      frequency: "monthly",
      startDate: "",
      endDate: "",
      isActive: true,
      autoCreate: true,
      reminderDays: "3",
      notes: "",
      tags: "",
    })
  }

  const openEditDialog = (recurring: RecurringTransaction) => {
    setSelectedRecurring(recurring)
    setFormData({
      description: recurring.description,
      amount: Math.abs(recurring.amount).toString(),
      category: recurring.category,
      type: recurring.type,
      accountId: recurring.accountId.toString(),
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      endDate: recurring.endDate || "",
      isActive: recurring.isActive,
      autoCreate: recurring.autoCreate,
      reminderDays: recurring.reminderDays?.toString() || "3",
      notes: recurring.notes || "",
      tags: recurring.tags?.join(", ") || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (recurring: RecurringTransaction) => {
    setSelectedRecurring(recurring)
    setIsDeleteDialogOpen(true)
  }

  const activeRecurring = recurringTransactions.filter(r => r.isActive)
  const inactiveRecurring = recurringTransactions.filter(r => !r.isActive)
  const upcomingDue = recurringTransactions
    .filter(r => r.isActive && getDaysUntilDue(r.nextDueDate) <= 7 && getDaysUntilDue(r.nextDueDate) >= 0)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Recurring</CardDescription>
            <CardTitle className="text-2xl">{recurringTransactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{activeRecurring.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-gray-500">{inactiveRecurring.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Due This Week</CardDescription>
            <CardTitle className="text-2xl text-amber-500">{upcomingDue.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Upcoming Transactions */}
      {upcomingDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Upcoming This Week
            </CardTitle>
            <CardDescription>Recurring transactions due within 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingDue.map(recurring => {
                const daysUntil = getDaysUntilDue(recurring.nextDueDate)
                return (
                  <div
                    key={recurring.id}
                    className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold font-mono">{recurring.description}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {recurring.category} • {getFrequencyLabel(recurring.frequency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono ${recurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(recurring.amount)}
                      </p>
                      <p className="text-xs text-amber-600 font-mono">
                        {daysUntil === 0 ? "Due today" : daysUntil === 1 ? "Due tomorrow" : `Due in ${daysUntil} days`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring Transactions List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>Automate your regular income and expenses</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Recurring
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 font-mono">
                No recurring transactions yet. Add your first recurring transaction!
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Recurring Transaction
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringTransactions.map(recurring => {
                const daysUntil = getDaysUntilDue(recurring.nextDueDate)
                const isDueSoon = daysUntil <= 3 && daysUntil >= 0

                return (
                  <div
                    key={recurring.id}
                    className={`p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors ${
                      !recurring.isActive ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            recurring.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold font-mono">{recurring.description}</p>
                            {!recurring.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-500 rounded font-mono">
                                Inactive
                              </span>
                            )}
                            {recurring.autoCreate && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded font-mono">
                                Auto
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 text-sm text-muted-foreground font-mono">
                            <span>{recurring.category}</span>
                            <span>•</span>
                            <span>{getFrequencyLabel(recurring.frequency)}</span>
                            <span>•</span>
                            <span>{recurring.accountName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(recurring)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(recurring)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">Amount</p>
                        <p className={`font-bold font-mono ${recurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(recurring.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-mono mb-1">Next Due</p>
                        <p className={`font-mono text-sm ${isDueSoon ? "text-amber-600 font-semibold" : ""}`}>
                          {formatDate(recurring.nextDueDate)}
                          {isDueSoon && ` (${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `${daysUntil} days`})`}
                        </p>
                      </div>
                    </div>

                    {recurring.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground font-mono">{recurring.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Recurring Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
            <DialogDescription>Create a new recurring income or expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-description">Description</Label>
              <Input
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Netflix Subscription, Salary, Rent"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-amount">Amount</Label>
                <Input
                  id="add-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="add-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="add-type" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-account">Account</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="add-account" className="font-mono">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="add-category" className="font-mono">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="add-frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: typeof formData.frequency) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="add-frequency" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-start-date">Start Date</Label>
                <Input
                  id="add-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="add-end-date">End Date (optional)</Label>
                <Input
                  id="add-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="add-active" className="cursor-pointer">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this recurring transaction
                  </p>
                </div>
                <Switch
                  id="add-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="add-auto-create" className="cursor-pointer">
                    Auto-create Transactions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create transactions on due date
                  </p>
                </div>
                <Switch
                  id="add-auto-create"
                  checked={formData.autoCreate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreate: checked })}
                />
              </div>

              {!formData.autoCreate && (
                <div>
                  <Label htmlFor="add-reminder-days">Reminder Days</Label>
                  <Input
                    id="add-reminder-days"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                    placeholder="3"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get reminded this many days before the due date
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="add-notes">Notes (optional)</Label>
              <Input
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="add-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="add-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., subscription, essential, flexible"
                className="font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddRecurring}>Add Recurring Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Recurring Transaction Dialog - Similar to Add Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recurring Transaction</DialogTitle>
            <DialogDescription>Update recurring transaction details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Similar form fields as Add Dialog */}
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "income" | "expense") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="edit-type" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-account">Account</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                >
                  <SelectTrigger id="edit-account" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit-category" className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: typeof formData.frequency) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="edit-frequency" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="edit-end-date">End Date (optional)</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="edit-active" className="cursor-pointer">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this recurring transaction
                  </p>
                </div>
                <Switch
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="edit-auto-create" className="cursor-pointer">
                    Auto-create Transactions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create transactions on due date
                  </p>
                </div>
                <Switch
                  id="edit-auto-create"
                  checked={formData.autoCreate}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoCreate: checked })}
                />
              </div>

              {!formData.autoCreate && (
                <div>
                  <Label htmlFor="edit-reminder-days">Reminder Days</Label>
                  <Input
                    id="edit-reminder-days"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                    className="font-mono"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated, optional)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedRecurring(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditRecurring}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recurring Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRecurring && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      selectedRecurring.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono">{selectedRecurring.description}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedRecurring.category} • {getFrequencyLabel(selectedRecurring.frequency)}
                    </p>
                  </div>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className={`font-medium ${selectedRecurring.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(selectedRecurring.amount)}
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
                setSelectedRecurring(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecurring}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
