"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/contexts/AppContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Plus, CheckCircle, Clock, Trash2, ArrowRight, DollarSign } from "lucide-react"
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
    fromPerson: "",
    toPerson: "",
    amount: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  })

  const resetForm = () => {
    setFormData({
      fromPerson: "",
      toPerson: "",
      amount: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
    })
  }

  // Calculate net debts (who owes whom overall)
  const netDebts = useMemo(() => {
    const debts = new Map<string, Map<string, number>>()

    settlements.forEach(settlement => {
      if (settlement.status === "completed") return

      if (!debts.has(settlement.fromPerson)) {
        debts.set(settlement.fromPerson, new Map())
      }
      const fromDebts = debts.get(settlement.fromPerson)!
      const currentDebt = fromDebts.get(settlement.toPerson) || 0
      fromDebts.set(settlement.toPerson, currentDebt + settlement.amount)
    })

    // Convert to array for display
    const result: Array<{ from: string; to: string; amount: number }> = []
    debts.forEach((toMap, from) => {
      toMap.forEach((amount, to) => {
        result.push({ from, to, amount })
      })
    })

    return result.sort((a, b) => b.amount - a.amount)
  }, [settlements])

  const handleAddSettlement = () => {
    if (!formData.fromPerson || !formData.toPerson || !formData.amount) return

    addSettlement({
      fromPerson: formData.fromPerson,
      toPerson: formData.toPerson,
      amount: parseFloat(formData.amount),
      date: formData.date,
      status: "pending",
      notes: formData.notes || undefined,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleCompleteSettlement = (settlement: Settlement) => {
    completeSettlement(settlement.id, new Date().toISOString().split("T")[0])
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

  const pendingSettlements = settlements.filter(s => s.status === "pending")
  const completedSettlements = settlements.filter(s => s.status === "completed")

  return (
    <div className="space-y-6">
      {/* Net Debts Summary */}
      {netDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Outstanding Balances</CardTitle>
            <CardDescription className="font-mono text-xs">
              Net amounts owed between people
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {netDebts.map((debt, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-600">
                        {debt.from.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{debt.from}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-muted-foreground mx-4" />

                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600">
                        {debt.to.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{debt.to}</p>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className="font-bold text-lg text-orange-600">
                      {formatCurrency(debt.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Settlements */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-mono">Pending Settlements</CardTitle>
              <CardDescription className="font-mono text-xs">
                {pendingSettlements.length} pending payment{pendingSettlements.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
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
                No pending settlements. All debts are settled!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSettlements.map(settlement => (
                <Card key={settlement.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{settlement.fromPerson}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{settlement.toPerson}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatDate(settlement.date)}
                        </p>
                        {settlement.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{settlement.notes}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-orange-600">
                          {formatCurrency(settlement.amount)}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteSettlement(settlement)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Mark Paid
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

      {/* Completed Settlements */}
      {completedSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono">Completed Settlements</CardTitle>
            <CardDescription className="font-mono text-xs">
              {completedSettlements.length} completed payment{completedSettlements.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedSettlements.map(settlement => (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{settlement.fromPerson}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{settlement.toPerson}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        Paid on {settlement.paidDate ? formatDate(settlement.paidDate) : formatDate(settlement.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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

      {/* Add Settlement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Record Settlement</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Record a payment between two people
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="from-person">From (Who Owes)*</Label>
              <Input
                id="from-person"
                value={formData.fromPerson}
                onChange={e => setFormData({ ...formData, fromPerson: e.target.value })}
                placeholder="Person's name"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="to-person">To (Who is Owed)*</Label>
              <Input
                id="to-person"
                value={formData.toPerson}
                onChange={e => setFormData({ ...formData, toPerson: e.target.value })}
                placeholder="Person's name"
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount*</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="pl-10 font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="settlement-date">Date*</Label>
              <Input
                id="settlement-date"
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
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
            <Button
              onClick={handleAddSettlement}
              disabled={!formData.fromPerson || !formData.toPerson || !formData.amount}
            >
              Record Settlement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Settlement Dialog */}
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
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{selectedSettlement.fromPerson}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{selectedSettlement.toPerson}</span>
              </div>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(selectedSettlement.amount)}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {formatDate(selectedSettlement.date)} • {selectedSettlement.status}
              </p>
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
