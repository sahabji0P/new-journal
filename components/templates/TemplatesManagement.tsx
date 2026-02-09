"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Plus, Trash2, Edit, Zap, Tag } from "lucide-react"
import type { Transaction, TransactionTemplate } from "@/lib/types"
import { TransactionFormModern } from "../transactions/TransactionFormModern"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const DEFAULT_TEMPLATE_FORM = {
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
}

export function TemplatesManagement() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    categories,
    parties,
    accounts,
  } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isUseTemplateDialogOpen, setIsUseTemplateDialogOpen] = useState(false)
  const [templatePrefill, setTemplatePrefill] = useState<Partial<Transaction> | undefined>(undefined)
  const [templateFormSeed, setTemplateFormSeed] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<TransactionTemplate | null>(null)

  const [formData, setFormData] = useState(DEFAULT_TEMPLATE_FORM)
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const editFormGuard = useFormCloseGuard<typeof formData>()

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
    setFormData(DEFAULT_TEMPLATE_FORM)
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
      accountId: formData.accountId || undefined,
      notes: formData.notes || undefined,
      icon: formData.icon,
      color: formData.color,
    })

    addFormGuard.clearSnapshot()
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
      accountId: formData.accountId || undefined,
      notes: formData.notes || undefined,
      icon: formData.icon,
      color: formData.color,
    })

    editFormGuard.clearSnapshot()
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
    const editData = {
      name: template.name,
      description: template.description || "",
      amount: template.amount?.toString() || "",
      category: template.category,
      type: template.type,
      party: template.party || "",
      tags: template.tags?.join(", ") || "",
      accountId: template.accountId?.toString() || "",
      notes: template.notes || "",
      icon: template.icon || "⚡",
      color: template.color || "#3b82f6",
    }
    setSelectedTemplate(template)
    setFormData(editData)
    editFormGuard.rememberSnapshot(editData)
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    setFormData(DEFAULT_TEMPLATE_FORM)
    addFormGuard.rememberSnapshot(DEFAULT_TEMPLATE_FORM)
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
    setSelectedTemplate(null)
    resetForm()
  }

  const openDeleteDialog = (template: TransactionTemplate) => {
    setSelectedTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  const handleQuickAdd = (template: TransactionTemplate) => {
    setTemplatePrefill({
      templateId: template.id,
      description: template.description || template.name,
      amount: template.amount,
      category: template.category,
      type: template.type,
      accountId: template.accountId || "",
      party: template.party || "",
      tags: template.tags,
      notes: template.notes || "",
      date: new Date().toISOString(),
    })
    setTemplateFormSeed(prev => prev + 1)
    setIsUseTemplateDialogOpen(true)
  }

  const closeUseTemplateDialog = () => {
    setIsUseTemplateDialogOpen(false)
    setTemplatePrefill(undefined)
  }

  useEffect(() => {
    if (searchParams.get("action") !== "add") return

    setFormData(DEFAULT_TEMPLATE_FORM)
    addFormGuard.rememberSnapshot(DEFAULT_TEMPLATE_FORM)
    setIsAddDialogOpen(true)
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("action")
    const nextPath = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    router.replace(nextPath, { scroll: false })
  }, [addFormGuard, pathname, router, searchParams])

  const renderTemplateForm = () => {
    const data = formData
    const setData = setFormData

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto md:pr-2">
        <div className="md:col-span-2">
          <FieldLabel htmlFor="template-name">Template Name*</FieldLabel>
          <Input
            id="template-name"
            value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
            placeholder="e.g., Coffee Purchase, Monthly Netflix"
            className="font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="template-description">Description</FieldLabel>
          <Input
            id="template-description"
            value={data.description}
            onChange={e => setData({ ...data, description: e.target.value })}
            placeholder="Brief description"
            className="font-mono"
          />
        </div>

        <div>
          <FieldLabel htmlFor="template-type">Type*</FieldLabel>
          <Select
            value={data.type}
            onValueChange={(value: "income" | "expense") => setData({ ...data, type: value })}
          >
            <SelectTrigger id="template-type" className="font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="template-category">Category*</FieldLabel>
          <Select
            value={data.category}
            onValueChange={value => setData({ ...data, category: value })}
          >
            <SelectTrigger id="template-category" className="font-mono">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter(c => c.type === data.type || c.type === "both")
                .map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="template-amount">Default Amount (optional)</FieldLabel>
          <Input
            id="template-amount"
            type="number"
            step="0.01"
            value={data.amount}
            onChange={e => setData({ ...data, amount: e.target.value })}
            placeholder="0.00"
            className="font-mono"
          />
        </div>

        <div>
          <FieldLabel htmlFor="template-account">Default Account (optional)</FieldLabel>
          <Select
            value={data.accountId || "none"}
            onValueChange={value => setData({ ...data, accountId: value === "none" ? "" : value })}
          >
            <SelectTrigger id="template-account" className="font-mono">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel htmlFor="template-party">Party (optional)</FieldLabel>
          <Input
            id="template-party"
            value={data.party}
            onChange={e => setData({ ...data, party: e.target.value })}
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

        <div className="md:col-span-2">
          <FieldLabel htmlFor="template-tags">Tags (optional, comma-separated)</FieldLabel>
          <Input
            id="template-tags"
            value={data.tags}
            onChange={e => setData({ ...data, tags: e.target.value })}
            placeholder="e.g., subscription, recurring"
            className="font-mono"
          />
        </div>

        <div>
          <FieldLabel htmlFor="template-icon">Icon</FieldLabel>
          <div className="flex gap-2 flex-wrap mt-2">
            {iconOptions.map(icon => (
              <button
                key={icon}
                type="button"
                className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                  data.icon === icon
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                }`}
                onClick={() => setData({ ...data, icon })}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="template-color">Color</FieldLabel>
          <div className="flex gap-2 flex-wrap mt-2">
            {colorOptions.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  data.color === value
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: value }}
                onClick={() => setData({ ...data, color: value })}
                title={label}
              />
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <FieldLabel htmlFor="template-notes">Notes (optional)</FieldLabel>
          <Input
            id="template-notes"
            value={data.notes}
            onChange={e => setData({ ...data, notes: e.target.value })}
            placeholder="Additional notes"
            className="font-mono"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="font-mono">Transaction Templates</CardTitle>
              <CardDescription className="font-mono text-xs">
                Create templates for frequently used transactions
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2 w-full sm:w-auto">
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
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => {
                const account = accounts.find(a => a.id === template.accountId)
                return (
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
                        {account && (
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-muted-foreground">Account:</span>
                            <span className="font-medium">{account.name}</span>
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
                          Use Template
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Create New Template</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a template for frequently used transactions
            </DialogDescription>
          </DialogHeader>
          {renderTemplateForm()}
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => handleAddDialogChange(false)}
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
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">Edit Template</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update template details
            </DialogDescription>
          </DialogHeader>
          {renderTemplateForm()}
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => handleEditDialogChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTemplate} disabled={!formData.name || !formData.category}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isUseTemplateDialogOpen}
        onOpenChange={open => {
          setIsUseTemplateDialogOpen(open)
          if (!open) setTemplatePrefill(undefined)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              The form is pre-filled from your template. Date and time default to now.
            </DialogDescription>
          </DialogHeader>
          <TransactionFormModern
            key={`template-transaction-${templateFormSeed}`}
            mode="add"
            prefill={templatePrefill}
            onSubmit={closeUseTemplateDialog}
            onCancel={closeUseTemplateDialog}
          />
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
