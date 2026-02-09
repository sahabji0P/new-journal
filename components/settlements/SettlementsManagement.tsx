"use client"

import { useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Plus, CheckCircle, Clock, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import type { Settlement } from "@/lib/types"

export function SettlementsManagement() {
  const {
    settlements,
    addSettlement,
    deleteSettlement,
    completeSettlement,
    formatCurrency,
    formatDate,
  } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

  const [formData, setFormData] = useState({
    party: "",
    type: "i_owe" as "i_owe" | "owed_to_me",
    amount: "",
    reason: "",
  })
  const addFormGuard = useFormCloseGuard<typeof formData>()
  const defaultFormData = {
    party: "",
    type: "i_owe" as "i_owe" | "owed_to_me",
    amount: "",
    reason: "",
  }

  const resetForm = () => {
    setFormData(defaultFormData)
  }

  const handleAddSettlement = () => {
    if (!formData.party.trim() || !formData.amount) return

    addSettlement({
      party: formData.party.trim(),
      amount: parseFloat(formData.amount),
      type: formData.type,
      reason: formData.reason.trim() || undefined,
      isSettled: false,
    })

    addFormGuard.clearSnapshot()
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleCompleteSettlement = (settlement: Settlement) => {
    completeSettlement(settlement.id, new Date().toISOString())
  }

  const handleDeleteSettlement = () => {
    if (!selectedSettlement) return
    deleteSettlement(selectedSettlement.id)
    setIsDeleteDialogOpen(false)
    setSelectedSettlement(null)
  }

  const openDeleteDialog = (settlement: Settlement) => {
    setSelectedSettlement(settlement)
    setIsDeleteDialogOpen(true)
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

  const pendingSettlements = settlements.filter(s => !s.isSettled)
  const completedSettlements = settlements.filter(s => s.isSettled)

  const totalIOwe = pendingSettlements
    .filter(s => s.type === "i_owe")
    .reduce((sum, s) => sum + s.amount, 0)

  const totalOwedToMe = pendingSettlements
    .filter(s => s.type === "owed_to_me")
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>I Owe</CardDescription>
            <CardTitle className="text-2xl text-red-500">{formatCurrency(totalIOwe)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Owed To Me</CardDescription>
            <CardTitle className="text-2xl text-emerald-500">{formatCurrency(totalOwedToMe)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Net</CardDescription>
            <CardTitle className={`text-2xl ${totalOwedToMe - totalIOwe >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatCurrency(totalOwedToMe - totalIOwe)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle className="font-mono">Pending Settlements</CardTitle>
              <CardDescription className="font-mono text-xs">
                {pendingSettlements.length} pending settlement{pendingSettlements.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Record Settlement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingSettlements.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4 font-mono text-sm">
                No pending settlements.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSettlements.map(settlement => (
                <Card
                  key={settlement.id}
                  className={`border-l-4 ${settlement.type === "i_owe" ? "border-l-red-500" : "border-l-emerald-500"}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {settlement.type === "i_owe" ? (
                            <ArrowUpCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                          )}
                          <span className="font-semibold">{settlement.party}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono capitalize">
                          {settlement.type === "i_owe" ? "I owe this amount" : "This amount is owed to me"}
                        </p>
                        {settlement.reason && (
                          <p className="text-sm text-muted-foreground mt-2">{settlement.reason}</p>
                        )}
                      </div>
                      <div className="sm:text-right sm:ml-4">
                        <p className={`font-bold text-lg ${settlement.type === "i_owe" ? "text-red-500" : "text-emerald-500"}`}>
                          {formatCurrency(settlement.amount)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteSettlement(settlement)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Mark Settled
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(settlement)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {completedSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Completed Settlements</CardTitle>
            <CardDescription className="font-mono text-xs">
              {completedSettlements.length} completed settlement{completedSettlements.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSettlements.map(settlement => (
                <div
                  key={settlement.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">{settlement.party}</p>
                      <p className="text-xs text-muted-foreground font-mono capitalize">
                        {settlement.type === "i_owe" ? "I owed" : "Was owed to me"}
                      </p>
                      {settlement.settledAt && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Settled on {formatDate(settlement.settledAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(settlement.amount)}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDeleteDialog(settlement)}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Record Settlement</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Track money you owe or money owed to you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor="settlement-party">Party*</FieldLabel>
              <Input
                id="settlement-party"
                value={formData.party}
                onChange={e => setFormData({ ...formData, party: e.target.value })}
                placeholder="Person's name"
                className="font-mono"
              />
            </div>

            <div>
              <FieldLabel htmlFor="settlement-type">Type*</FieldLabel>
              <Select
                value={formData.type}
                onValueChange={(value: "i_owe" | "owed_to_me") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="settlement-type" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_owe">I Owe</SelectItem>
                  <SelectItem value="owed_to_me">Owed To Me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="settlement-amount">Amount*</FieldLabel>
              <Input
                id="settlement-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="font-mono"
              />
            </div>

            <div>
              <FieldLabel htmlFor="settlement-reason">Reason (optional)</FieldLabel>
              <Input
                id="settlement-reason"
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Dinner split, rent, travel, etc."
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => handleAddDialogChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSettlement}
              disabled={!formData.party || !formData.amount}
            >
              Record Settlement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Delete Settlement</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Are you sure you want to delete this settlement record?
            </DialogDescription>
          </DialogHeader>
          {selectedSettlement && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedSettlement.party}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1 capitalize">
                {selectedSettlement.type === "i_owe" ? "I Owe" : "Owed To Me"}
              </p>
              <p className="text-lg font-bold mt-2">{formatCurrency(selectedSettlement.amount)}</p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedSettlement(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSettlement}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
