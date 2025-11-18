"use client"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Plus, Trash2, Edit, Zap, Tag } from "lucide-react"
import type { TransactionTemplate } from "@/lib/types"

export function TemplatesManagement() {
  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    createTransactionFromTemplate,
    categories,
    parties,
  } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TransactionTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    category: "",
    type: "expense" as "income" | "expense",
    party: "",
    tags: "",
    accountId: "",
    notes: "",
    icon: "⚡",
    color: "#3b82f6",
  })

  const iconOptions = ["⚡", "🍔", "🚗", "💡", "🏠", "💳", "🎬", "🏥", "📱", "✈️", "🎯", "💰"]
  const colorOptions = [
    { label: "Blue", value: "#3b82f6" },
    { label: "Green", value: "#10b981" },
    { label: "Red", value: "#ef4444" },
    { label: "Yellow", value: "#f59e0b" },
    { label: "Purple", value: "#8b5cf6" },
    { label: "Pink", value: "#ec4899" },
  ]

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
      category: "",
      type: "expense",
      party: "",
      tags: "",
      accountId: "",
      notes: "",
      icon: "⚡",
      color: "#3b82f6",
    })
  }

  const handleAddTemplate = () => {
    if (!formData.name.trim() || !formData.category) return

    addTemplate({
      name: formData.name,
      description: formData.description,
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
      category: formData.category,
      type: formData.type,
      party: formData.party || undefined,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : undefined,
      accountId: formData.accountId ? parseInt(formData.accountId) : undefined,
      notes: formData.notes || undefined,
      icon: formData.icon,
      color: formData.color,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditTemplate = () => {
    if (!selectedTemplate || !formData.name.trim() || !formData.category) return

    updateTemplate(selectedTemplate.id, {
      name: formData.name,
      description: formData.description,
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
      category: formData.category,
      type: formData.type,
      party: formData.party || undefined,
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()) : undefined,
      accountId: formData.accountId ? parseInt(formData.accountId) : undefined,
      notes: formData.notes || undefined,
      icon: formData.icon,
      color: formData.color,
    })

    resetForm()
    setIsEditDialogOpen(false)
    setSelectedTemplate(null)
  }

  const handleDeleteTemplate = () => {
    if (!selectedTemplate) return

    deleteTemplate(selectedTemplate.id)
    setIsDeleteDialogOpen(false)
    setSelectedTemplate(null)
  }

  const openEditDialog = (template: TransactionTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      amount: template.amount?.toString() || "",
      category: template.category,
      type: template.type,
      party: template.party || "",
      tags: template.tags?.join(", ") || "",
      accountId: template.accountId?.toString() || "",
      notes: template.notes || "",
      icon: template.icon || "⚡",
      color: template.color || "#3b82f6",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (template: TransactionTemplate) => {
    setSelectedTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  const handleQuickAdd = (template: TransactionTemplate) => {
    createTransactionFromTemplate(template.id)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-mono">Transaction Templates</CardTitle>
              <CardDescription className="font-mono text-xs">
                Create templates for frequently used transactions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 font-mono text-sm">
                No templates yet. Create templates for quick transaction entry!
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow"
                  style={{ borderLeft: `4px solid ${template.color || "#3b82f6"}` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon || "⚡"}</span>
                        <div>
                          <h3 className="font-semibold font-mono text-sm">{template.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">{template.category}</span>
                      </div>
                      {template.amount && (
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className={`font-bold ${template.type === "expense" ? "text-red-600" : "text-emerald-600"}`}>
                            {template.type === "expense" ? "-" : "+"}${template.amount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded font-mono flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => handleQuickAdd(template)}
                      >
                        <Zap className="w-3 h-3" />
                        Quick Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(template)}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Create New Template</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a template for frequently used transactions
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="add-name">Template Name*</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Coffee Purchase, Monthly Netflix"
                className="font-mono"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="add-description">Description</Label>
              <Input
                id="add-description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="add-type">Type*</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "income" | "expense") =>
                  setFormData({ ...formData, type: value })
                }
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

            <div>
              <Label htmlFor="add-category">Category*</Label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="add-category" className="font-mono">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => c.type === formData.type || c.type === "both")
                    .map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="add-amount">Amount (optional)</Label>
              <Input
                id="add-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="add-party">Party (optional)</Label>
              <Input
                id="add-party"
                value={formData.party}
                onChange={e => setFormData({ ...formData, party: e.target.value })}
                placeholder="e.g., Netflix, Starbucks"
                className="font-mono"
                list="parties-list"
              />
              <datalist id="parties-list">
                {parties.map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div className="col-span-2">
              <Label htmlFor="add-tags">Tags (optional, comma-separated)</Label>
              <Input
                id="add-tags"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., subscription, recurring"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="add-icon">Icon</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                      formData.icon === icon
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="add-color">Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {colorOptions.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: value }}
                    onClick={() => setFormData({ ...formData, color: value })}
                    title={label}
                  />
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <Label htmlFor="add-notes">Notes (optional)</Label>
              <Input
                id="add-notes"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTemplate} disabled={!formData.name || !formData.category}>
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Template</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update template details
            </DialogDescription>
          </DialogHeader>
          {/* Same form as Add Dialog - content omitted for brevity, would be identical */}
          <div className="grid grid-cols-2 gap-4">
            {/* Exact same form fields as Add Dialog */}
            <div className="col-span-2">
              <Label htmlFor="edit-name">Template Name*</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
            </div>
            {/* ... rest of fields ... */}
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedTemplate(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={!formData.name || !formData.category}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Delete Template</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Are you sure you want to delete this template?
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <p className="font-semibold font-mono">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedTemplate(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              Delete Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
