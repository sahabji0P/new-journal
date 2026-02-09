"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import type { Party } from "@/lib/types"
import { Building2, Edit, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

export function Parties() {
  const { parties, addParty, updateParty, deleteParty, transactions, formatCurrency } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)

  const [formData, setFormData] = useState({
    name: "",
  })
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const editFormGuard = useFormCloseGuard<typeof formData>()

  const getPartyTransactions = (partyName: string) => {
    return transactions.filter(t => t.party === partyName)
  }

  const getPartyTransactionCount = (partyName: string) => {
    return getPartyTransactions(partyName).length
  }

  const getPartyStats = (partyName: string) => {
    const partyTransactions = getPartyTransactions(partyName)
    const totalIncome = partyTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = Math.abs(
      partyTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    )
    return {
      count: partyTransactions.length,
      income: totalIncome,
      expense: totalExpense,
    }
  }

  const handleAddParty = () => {
    if (!formData.name.trim()) return

    addParty({
      name: formData.name,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditParty = () => {
    if (!selectedParty || !formData.name.trim()) return

    updateParty(selectedParty.id, {
      name: formData.name,
    })

    editFormGuard.clearSnapshot()
    resetForm()
    setIsEditDialogOpen(false)
    setSelectedParty(null)
  }

  const handleDeleteParty = () => {
    if (!selectedParty) return

    const transactionCount = getPartyTransactionCount(selectedParty.name)
    if (transactionCount > 0) {
      alert(`Cannot delete party with ${transactionCount} transaction(s). Please update or delete the transactions first.`)
      return
    }

    deleteParty(selectedParty.id)
    setIsDeleteDialogOpen(false)
    setSelectedParty(null)
  }

  const resetForm = () => {
    setFormData({
      name: "",
    })
  }

  const openEditDialog = (party: Party) => {
    const editData = { name: party.name }
    setSelectedParty(party)
    setFormData(editData)
    editFormGuard.rememberSnapshot(editData)
    setIsEditDialogOpen(true)
  }

  const openAddDialog = () => {
    const initialData = { name: "" }
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
    setSelectedParty(null)
    resetForm()
  }

  const openDeleteDialog = (party: Party) => {
    setSelectedParty(party)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage Parties</CardTitle>
              <CardDescription>Track people, companies, and stores you transact with</CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Party
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {parties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No parties yet. Add your first party to track payees and payers!</p>
              <Button onClick={openAddDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Party
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {parties.map(party => {
                const stats = getPartyStats(party.name)
                return (
                  <div
                    key={party.id}
                    className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium font-mono">{party.name}</p>
                        <div className="flex gap-2 text-sm text-muted-foreground font-mono">
                          <span>{stats.count} transaction(s)</span>
                          {stats.income > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600">
                                Income: {formatCurrency(stats.income)}
                              </span>
                            </>
                          )}
                          {stats.expense > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-600">
                                Expense: {formatCurrency(stats.expense)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(party)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(party)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Party Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Party</DialogTitle>
            <DialogDescription>Add a person, company, or store you transact with</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-party-name">Party Name</FieldLabel>
              <Input
                id="add-party-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amazon, Starbucks, Netflix, John Doe"
                className="font-mono"
              />
              <FieldDescription>
                The name of a person, company, or store
              </FieldDescription>
            </Field>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddParty}>Add Party</Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      {/* Edit Party Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Party</DialogTitle>
            <DialogDescription>Update party details</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-party-name">Party Name</FieldLabel>
              <Input
                id="edit-party-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
            </Field>
            {selectedParty && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold">{getPartyTransactionCount(selectedParty.name)}</span>
                </div>
                {(() => {
                  const stats = getPartyStats(selectedParty.name)
                  return (
                    <>
                      {stats.income > 0 && (
                        <div className="flex justify-between text-sm font-mono">
                          <span className="text-muted-foreground">Total Income:</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(stats.income)}</span>
                        </div>
                      )}
                      {stats.expense > 0 && (
                        <div className="flex justify-between text-sm font-mono">
                          <span className="text-muted-foreground">Total Expense:</span>
                          <span className="font-semibold text-red-600">{formatCurrency(stats.expense)}</span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => handleEditDialogChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditParty}>Save Changes</Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      {/* Delete Party Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this party? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedParty && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono">{selectedParty.name}</p>
                  </div>
                </div>
                <div className="text-sm font-mono">
                  <span className="text-muted-foreground">Transactions:</span>{" "}
                  <span className="font-medium">{getPartyTransactionCount(selectedParty.name)}</span>
                </div>
              </div>
              {getPartyTransactionCount(selectedParty.name) > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p className="text-sm text-red-500 font-mono">
                    ⚠️ This party has {getPartyTransactionCount(selectedParty.name)} transaction(s).
                    You must update or delete all transactions before deleting this party.
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
                setSelectedParty(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteParty}
              disabled={selectedParty ? getPartyTransactionCount(selectedParty.name) > 0 : false}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
