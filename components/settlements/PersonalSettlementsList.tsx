"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react"

interface PersonalSettlementsListProps {
  pendingSettlements: Array<{
    id: string
    party: string
    amount: number
    type: "i_owe" | "owed_to_me"
    reason?: string
  }>
  completedSettlements: Array<{
    id: string
    party: string
    amount: number
    type: "i_owe" | "owed_to_me"
    settledAt?: string
  }>
  totalIOwe: number
  totalOwedToMe: number
  isAddDialogOpen: boolean
  onAddDialogChange: (open: boolean) => void
  onOpenAddDialog: () => void
  formData: {
    party: string
    type: "i_owe" | "owed_to_me"
    amount: string
    reason: string
  }
  onFormDataChange: (data: {
    party: string
    type: "i_owe" | "owed_to_me"
    amount: string
    reason: string
  }) => void
  onAddSettlement: () => void
  isDeleteDialogOpen: boolean
  onDeleteDialogChange: (open: boolean) => void
  selectedSettlement: {
    id: string
    party: string
    amount: number
    type: string
  } | null
  onDeleteSettlement: () => void
  onClearSelectedSettlement: () => void
  onCompleteSettlement: (settlement: { id: string }) => void
  onOpenDeleteDialog: (settlement: {
    id: string
    party: string
    amount: number
    type: string
  }) => void
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}

export function PersonalSettlementsList({
  pendingSettlements,
  completedSettlements,
  totalIOwe,
  totalOwedToMe,
  isAddDialogOpen,
  onAddDialogChange,
  onOpenAddDialog,
  formData,
  onFormDataChange,
  onAddSettlement,
  isDeleteDialogOpen,
  onDeleteDialogChange,
  selectedSettlement,
  onDeleteSettlement,
  onClearSelectedSettlement,
  onCompleteSettlement,
  onOpenDeleteDialog,
  formatCurrency,
  formatDate,
}: PersonalSettlementsListProps) {
  const net = totalOwedToMe - totalIOwe

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">I Owe</p>
            <p className="text-2xl font-semibold text-red-500">
              {formatCurrency(totalIOwe)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Owed To Me</p>
            <p className="text-2xl font-semibold text-emerald-500">
              {formatCurrency(totalOwedToMe)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Net</p>
            <p
              className={`text-2xl font-semibold ${
                net > 0
                  ? "text-emerald-500"
                  : net < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            >
              {formatCurrency(net)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Settlements */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Settlements ({pendingSettlements.length})
          </CardTitle>
          <CardDescription>
            <Button size="sm" onClick={onOpenAddDialog}>
              <Plus className="size-4 mr-1" />
              Record Settlement
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingSettlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="size-8 mb-2" />
              <p className="text-sm">No pending settlements.</p>
            </div>
          ) : (
            pendingSettlements.map((settlement) => (
              <Card
                key={settlement.id}
                className={`border-l-4 ${
                  settlement.type === "i_owe"
                    ? "border-l-red-500"
                    : "border-l-emerald-500"
                }`}
              >
                <CardContent className="flex items-center justify-between gap-3 pt-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {settlement.type === "i_owe" ? (
                      <ArrowUpCircle className="size-5 text-red-500 shrink-0" />
                    ) : (
                      <ArrowDownCircle className="size-5 text-emerald-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {settlement.party}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {settlement.type === "i_owe"
                          ? "You owe"
                          : "Owes you"}
                      </p>
                      {settlement.reason && (
                        <p className="text-xs text-muted-foreground truncate">
                          {settlement.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-semibold text-sm ${
                        settlement.type === "i_owe"
                          ? "text-red-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {formatCurrency(settlement.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCompleteSettlement(settlement)}
                    >
                      Mark Settled
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onOpenDeleteDialog(settlement)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Completed Settlements */}
      {completedSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Completed Settlements ({completedSettlements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedSettlements.map((settlement) => (
              <div
                key={settlement.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {settlement.party}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {settlement.type === "i_owe" ? "You owed" : "Owed you"}
                      {settlement.settledAt &&
                        ` - Settled ${formatDate(settlement.settledAt)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(settlement.amount)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onOpenDeleteDialog(settlement)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Settlement Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={onAddDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Settlement</DialogTitle>
            <DialogDescription>
              Add a new personal settlement to track.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <FieldLabel>Party</FieldLabel>
              <Input
                placeholder="Who is this with?"
                value={formData.party}
                onChange={(e) =>
                  onFormDataChange({ ...formData, party: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Type</FieldLabel>
              <Select
                value={formData.type}
                onValueChange={(value: "i_owe" | "owed_to_me") =>
                  onFormDataChange({ ...formData, type: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_owe">I Owe</SelectItem>
                  <SelectItem value="owed_to_me">Owed To Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Amount</FieldLabel>
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) =>
                  onFormDataChange({ ...formData, amount: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Reason</FieldLabel>
              <Input
                placeholder="Reason (optional)"
                value={formData.reason}
                onChange={(e) =>
                  onFormDataChange({ ...formData, reason: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onAddDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={onAddSettlement}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Settlement Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Settlement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this settlement?
            </DialogDescription>
          </DialogHeader>
          {selectedSettlement && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Party:</span>{" "}
                {selectedSettlement.party}
              </p>
              <p>
                <span className="text-muted-foreground">Amount:</span>{" "}
                {formatCurrency(selectedSettlement.amount)}
              </p>
              <p>
                <span className="text-muted-foreground">Type:</span>{" "}
                {selectedSettlement.type === "i_owe" ? "I Owe" : "Owed To Me"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onDeleteDialogChange(false)
                onClearSelectedSettlement()
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteSettlement}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
