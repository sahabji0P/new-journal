"use client"

import { useApp } from "@/contexts/AppContext"
import type { Account } from "@/lib/types"
import { Building, CreditCard, Edit, Plus, PiggyBank, Trash2, Wallet, Eye } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { TransactionsSidebar } from "../TransactionsSidebar"

export function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, formatCurrency, transactions } = useApp()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarAccountId, setSidebarAccountId] = useState<string | null>(null)
  const [sidebarAccountName, setSidebarAccountName] = useState<string>("")

  const [formData, setFormData] = useState({
    name: "",
    type: "checking" as "checking" | "savings" | "credit",
  })

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return <Wallet className="w-5 h-5" />
      case "savings":
        return <PiggyBank className="w-5 h-5" />
      case "credit":
        return <CreditCard className="w-5 h-5" />
      default:
        return <Building className="w-5 h-5" />
    }
  }

  const getAccountTransactionCount = (accountId: string) => {
    return transactions.filter(t => t.accountId === accountId).length
  }

  const handleAddAccount = () => {
    if (!formData.name.trim()) return

    addAccount({
      name: formData.name,
      type: formData.type,
    })

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditAccount = () => {
    if (!selectedAccount || !formData.name.trim()) return

    updateAccount(selectedAccount.id, {
      name: formData.name,
      type: formData.type,
    })

    resetForm()
    setIsEditDialogOpen(false)
    setSelectedAccount(null)
  }

  const handleDeleteAccount = () => {
    if (!selectedAccount) return

    const transactionCount = getAccountTransactionCount(selectedAccount.id)
    if (transactionCount > 0) {
      alert(`Cannot delete account with ${transactionCount} transaction(s). Please delete or move the transactions first.`)
      return
    }

    deleteAccount(selectedAccount.id)
    setIsDeleteDialogOpen(false)
    setSelectedAccount(null)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "checking",
    })
  }

  const openEditDialog = (account: Account) => {
    setSelectedAccount(account)
    setFormData({
      name: account.name,
      type: account.type,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (account: Account) => {
    setSelectedAccount(account)
    setIsDeleteDialogOpen(true)
  }

  const openTransactionsSidebar = (accountId: string, accountName: string) => {
    setSidebarAccountId(accountId)
    setSidebarAccountName(accountName)
    setIsSidebarOpen(true)
  }

  const getAccountTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "checking":
        return "bg-blue-500/10 text-blue-500"
      case "savings":
        return "bg-green-500/10 text-green-500"
      case "credit":
        return "bg-amber-500/10 text-amber-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Manage Accounts</CardTitle>
              <CardDescription>Add and manage your financial accounts</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No accounts yet. Create your first account to start tracking your finances!</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(account => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-3 rounded-lg ${getAccountTypeColor(account.type)}`}>
                          {getAccountIcon(account.type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{account.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {getAccountTypeLabel(account.type)} Account
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Balance:</span>
                              <span className={`font-bold ${account.balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {formatCurrency(account.balance)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Transactions:</span>
                              <span className="text-sm font-medium">
                                {getAccountTransactionCount(account.id)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTransactionsSidebar(account.id, account.name)}
                          title="View transactions"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(account)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(account)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>Create a new account to track your finances</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-account-name">Account Name</Label>
              <Input
                id="add-account-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Chase Checking"
              />
            </div>
            <div>
              <Label htmlFor="add-account-type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "checking" | "savings" | "credit") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="add-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Checking Account
                    </div>
                  </SelectItem>
                  <SelectItem value="savings">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4" />
                      Savings Account
                    </div>
                  </SelectItem>
                  <SelectItem value="credit">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                The account will start with a balance of $0.00. You can adjust this by adding initial transactions.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>Add Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update account details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-account-name">Account Name</Label>
              <Input
                id="edit-account-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-account-type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: "checking" | "savings" | "credit") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="edit-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Checking Account
                    </div>
                  </SelectItem>
                  <SelectItem value="savings">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4" />
                      Savings Account
                    </div>
                  </SelectItem>
                  <SelectItem value="credit">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credit Card
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">{formatCurrency(selectedAccount.balance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold">{getAccountTransactionCount(selectedAccount.id)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedAccount(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleEditAccount}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-lg ${getAccountTypeColor(selectedAccount.type)}`}>
                    {getAccountIcon(selectedAccount.type)}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedAccount.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getAccountTypeLabel(selectedAccount.type)} Account
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="font-medium">{getAccountTransactionCount(selectedAccount.id)}</span>
                  </div>
                </div>
              </div>
              {getAccountTransactionCount(selectedAccount.id) > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  <p className="text-sm text-red-500">
                    ⚠️ This account has {getAccountTransactionCount(selectedAccount.id)} transaction(s).
                    You must delete or move all transactions before deleting this account.
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
                setSelectedAccount(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={selectedAccount ? getAccountTransactionCount(selectedAccount.id) > 0 : false}
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
        filterType="account"
        filterValue={sidebarAccountId}
        title={sidebarAccountName ? `${sidebarAccountName} Transactions` : "Transactions"}
      />
    </div>
  )
}
