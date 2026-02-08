"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { Category } from "@/lib/types"
import { Edit, Folder, Plus, Trash2, Eye } from "lucide-react"
import { useState } from "react"
import { TransactionsSidebar } from "../TransactionsSidebar"

export function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, transactions } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarCategory, setSidebarCategory] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense" | "both",
  })
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const editFormGuard = useFormCloseGuard<typeof formData>()

  const getCategoryTransactionCount = (categoryName: string) => {
    return transactions.filter(t => t.category === categoryName).length
  }

  const getCategoryTypeLabel = (type: string) => {
    switch (type) {
      case "income":
        return "Income"
      case "expense":
        return "Expense"
      case "both":
        return "Income & Expense"
      default:
        return type
    }
  }

  const getCategoryTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-green-500/10 text-green-500"
      case "expense":
        return "bg-red-500/10 text-red-500"
      case "both":
        return "bg-blue-500/10 text-blue-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const handleAddCategory = () => {
    if (!formData.name.trim()) return

    addCategory({
      name: formData.name,
      type: formData.type,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditCategory = () => {
    if (!selectedCategory || !formData.name.trim()) return

    updateCategory(selectedCategory.id, {
      name: formData.name,
      type: formData.type,
    })

    editFormGuard.clearSnapshot()
    resetForm()
    setIsEditDialogOpen(false)
    setSelectedCategory(null)
  }

  const handleDeleteCategory = () => {
    if (!selectedCategory) return

    const transactionCount = getCategoryTransactionCount(selectedCategory.name)
    if (transactionCount > 0) {
      alert(`Cannot delete category with ${transactionCount} transaction(s). Please update or delete the transactions first.`)
      return
    }

    deleteCategory(selectedCategory.id)
    setIsDeleteDialogOpen(false)
    setSelectedCategory(null)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "expense",
    })
  }

  const openEditDialog = (category: Category) => {
    const editData = {
      name: category.name,
      type: category.type,
    }
    setSelectedCategory(category)
    setFormData(editData)
    editFormGuard.rememberSnapshot(editData)
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    const initialData = {
      name: "",
      type: "expense" as "income" | "expense" | "both",
    }
    setFormData(initialData)
    addFormGuard.rememberSnapshot(initialData)
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
    setSelectedCategory(null)
    resetForm()
  }

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category)
    setIsDeleteDialogOpen(true)
  }

  const openTransactionsSidebar = (categoryName: string) => {
    setSidebarCategory(categoryName)
    setIsSidebarOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>Organize your transactions with custom categories</CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No categories yet. Create your first category to organize transactions!</p>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryTypeColor(category.type)}`}>
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{getCategoryTypeLabel(category.type)}</span>
                        <span>•</span>
                        <span>{getCategoryTransactionCount(category.name)} transaction(s)</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTransactionsSidebar(category.name)}
                      title="View transactions"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(category)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category to organize your transactions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-category-name">Category Name</Label>
              <Input
                id="add-category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Groceries, Utilities, Freelance"
              />
            </div>
            <div>
              <Label htmlFor="add-category-type">Category Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "income" | "expense" | "both") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="add-category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="both">Income & Expense</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This determines where the category appears in transaction forms
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category-type">Category Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "income" | "expense" | "both") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="edit-category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="both">Income & Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedCategory && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold">{getCategoryTransactionCount(selectedCategory.name)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleEditDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditCategory}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${getCategoryTypeColor(selectedCategory.type)}`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedCategory.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getCategoryTypeLabel(selectedCategory.type)}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Transactions:</span>{" "}
                  <span className="font-medium">{getCategoryTransactionCount(selectedCategory.name)}</span>
                </div>
              </div>
              {getCategoryTransactionCount(selectedCategory.name) > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p className="text-sm text-red-500">
                    ⚠️ This category has {getCategoryTransactionCount(selectedCategory.name)} transaction(s).
                    You must update or delete all transactions before deleting this category.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedCategory(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={selectedCategory ? getCategoryTransactionCount(selectedCategory.name) > 0 : false}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions Sidebar */}
      <TransactionsSidebar
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
        filterType="category"
        filterValue={sidebarCategory}
        title={sidebarCategory ? `${sidebarCategory} Transactions` : "Transactions"}
      />
    </div>
  )
}
