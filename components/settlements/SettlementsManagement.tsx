"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import {
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Mail,
  MessageSquare,
  Download,
  UserPlus,
  Handshake,
} from "lucide-react"
import { toast } from "sonner"
import type { Settlement } from "@/lib/types"

type SplitDraft = {
  id: string
  name: string
  amount: string
}

export function SettlementsManagement() {
  const {
    settlements,
    addSettlement,
    deleteSettlement,
    completeSettlement,
    formatCurrency,
    formatDate,
    settlementGroups,
    settlementInvitations,
    loadSettlementWorkspace,
    createSettlementGroup,
    inviteToSettlementGroup,
    respondToSettlementInvite,
    addSettlementGroupTransaction,
    addTransaction,
    accounts,
    categories,
  } = useApp()

  const [activeTab, setActiveTab] = useState<"groups" | "personal">("groups")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")

  const [selectedGroupId, setSelectedGroupId] = useState<string>("")

  const [inviteEmail, setInviteEmail] = useState("")
  const [groupTransactionDescription, setGroupTransactionDescription] = useState("")
  const [groupTransactionTotal, setGroupTransactionTotal] = useState("")
  const [groupTransactionPayer, setGroupTransactionPayer] = useState("")
  const [groupTransactionNotes, setGroupTransactionNotes] = useState("")

  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([])

  const [personalDescription, setPersonalDescription] = useState("")
  const [personalTotal, setPersonalTotal] = useState("")
  const [personalCategory, setPersonalCategory] = useState("")
  const [personalCounterparty, setPersonalCounterparty] = useState("")
  const [personalSplits, setPersonalSplits] = useState<SplitDraft[]>([
    { id: `p-${Date.now()}-1`, name: "Me", amount: "" },
  ])

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

  useEffect(() => {
    void loadSettlementWorkspace()
  }, [loadSettlementWorkspace])

  useEffect(() => {
    if (!selectedGroupId && settlementGroups.length > 0) {
      setSelectedGroupId(settlementGroups[0].id)
    }
  }, [selectedGroupId, settlementGroups])

  const selectedGroup = useMemo(
    () => settlementGroups.find(group => group.id === selectedGroupId),
    [selectedGroupId, settlementGroups]
  )

  useEffect(() => {
    if (!selectedGroup) {
      setGroupTransactionPayer("")
      setSplitDrafts([])
      return
    }

    if (!groupTransactionPayer || !selectedGroup.members.some(member => member.userId === groupTransactionPayer)) {
      setGroupTransactionPayer(selectedGroup.members[0]?.userId || "")
    }

    if (splitDrafts.length === 0) {
      setSplitDrafts(
        selectedGroup.members.map(member => ({
          id: member.userId,
          name: member.name,
          amount: "",
        }))
      )
    }
  }, [selectedGroup, groupTransactionPayer, splitDrafts.length])

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

  const myPendingInvites = settlementInvitations.filter(invite => invite.status === "pending")

  const groupNetRows = useMemo(() => {
    if (!selectedGroup) return []

    type LedgerRow = {
      userId: string
      name: string
      paid: number
      owed: number
      net: number
    }

    const ledger = new Map<string, LedgerRow>()

    selectedGroup.members.forEach(member => {
      ledger.set(member.userId, {
        userId: member.userId,
        name: member.name,
        paid: 0,
        owed: 0,
        net: 0,
      })
    })

    selectedGroup.transactions.forEach(transaction => {
      const payerRow = ledger.get(transaction.paidByUserId)
      if (payerRow) {
        payerRow.paid += transaction.totalAmount
      }

      transaction.shares.forEach(share => {
        const row = ledger.get(share.userId)
        if (row) {
          row.owed += share.amount
        }
      })
    })

    ledger.forEach(row => {
      row.net = row.paid - row.owed
    })

    return [...ledger.values()].sort((left, right) => right.net - left.net)
  }, [selectedGroup])

  const debtSummary = useMemo(() => {
    const creditors = groupNetRows.filter(row => row.net > 0.01).map(row => ({ ...row }))
    const debtors = groupNetRows.filter(row => row.net < -0.01).map(row => ({ ...row, debt: Math.abs(row.net) }))

    const lines: string[] = []

    debtors.forEach(debtor => {
      let remaining = debtor.debt

      for (const creditor of creditors) {
        if (remaining <= 0.01) break
        if (creditor.net <= 0.01) continue

        const amount = Math.min(remaining, creditor.net)
        creditor.net -= amount
        remaining -= amount

        lines.push(`${debtor.name} owes ${creditor.name}: ${formatCurrency(amount)}`)
      }
    })

    return lines
  }, [formatCurrency, groupNetRows])

  const selectedGroupTotalSpent = useMemo(() => {
    if (!selectedGroup) return 0
    return selectedGroup.transactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0)
  }, [selectedGroup])

  const groupSplitTotal = useMemo(() => {
    return splitDrafts.reduce((sum, draft) => {
      const amount = Number(draft.amount)
      return sum + (Number.isFinite(amount) ? amount : 0)
    }, 0)
  }, [splitDrafts])

  const parsedGroupTotal = useMemo(() => {
    const total = Number(groupTransactionTotal)
    return Number.isFinite(total) ? total : 0
  }, [groupTransactionTotal])

  const groupSplitDifference = useMemo(() => {
    if (!Number.isFinite(parsedGroupTotal)) return 0
    return parsedGroupTotal - groupSplitTotal
  }, [groupSplitTotal, parsedGroupTotal])

  const onCreateGroup = async () => {
    if (!groupName.trim()) return
    await createSettlementGroup({ name: groupName.trim(), description: groupDescription.trim() || undefined })
    setGroupName("")
    setGroupDescription("")
    setGroupDialogOpen(false)
    await loadSettlementWorkspace()
  }

  const onSendInvite = async () => {
    if (!selectedGroupId || !inviteEmail.trim()) return
    const normalizedEmail = inviteEmail.trim()
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      toast.error("Enter a valid email address")
      return
    }
    await inviteToSettlementGroup(selectedGroupId, inviteEmail.trim())
    setInviteEmail("")
  }

  const updateSplitDraft = (id: string, amount: string) => {
    setSplitDrafts(previous =>
      previous.map(draft =>
        draft.id === id
          ? {
              ...draft,
              amount,
            }
          : draft
      )
    )
  }

  const fillGroupSharesEqually = () => {
    if (splitDrafts.length === 0) {
      toast.error("No members available to split")
      return
    }

    const totalAmount = Number(groupTransactionTotal)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Enter a valid total amount first")
      return
    }

    const perHead = Number((totalAmount / splitDrafts.length).toFixed(2))
    const updated = splitDrafts.map((draft, index) => {
      if (index === splitDrafts.length - 1) {
        const previousTotal = perHead * (splitDrafts.length - 1)
        const remainder = Number((totalAmount - previousTotal).toFixed(2))
        return { ...draft, amount: remainder.toFixed(2) }
      }

      return { ...draft, amount: perHead.toFixed(2) }
    })

    setSplitDrafts(updated)
  }

  const onAddGroupTransaction = async () => {
    if (!selectedGroup) return

    const totalAmount = Number(groupTransactionTotal)
    if (!groupTransactionDescription.trim() || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Enter description and valid total amount")
      return
    }

    if (!groupTransactionPayer) {
      toast.error("Select who paid for this transaction")
      return
    }

    const shares = splitDrafts
      .map(draft => ({
        userId: draft.id,
        amount: Number(draft.amount),
      }))
      .filter(share => Number.isFinite(share.amount) && share.amount > 0)

    const totalShares = shares.reduce((sum, share) => sum + share.amount, 0)
    if (Math.abs(totalShares - totalAmount) > 0.01) {
      toast.error("Split total must match transaction total")
      return
    }

    await addSettlementGroupTransaction({
      groupId: selectedGroup.id,
      description: groupTransactionDescription.trim(),
      paidByUserId: groupTransactionPayer,
      totalAmount,
      notes: groupTransactionNotes.trim() || undefined,
      shares,
    })

    setGroupTransactionDescription("")
    setGroupTransactionTotal("")
    setGroupTransactionNotes("")
    setSplitDrafts(
      selectedGroup.members.map(member => ({
        id: member.userId,
        name: member.name,
        amount: "",
      }))
    )
    await loadSettlementWorkspace()
  }

  const addPersonalSplitPerson = () => {
    setPersonalSplits(previous => [
      ...previous,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        amount: "",
      },
    ])
  }

  const removePersonalSplitPerson = (id: string) => {
    setPersonalSplits(previous => previous.filter(split => split.id !== id))
  }

  const updatePersonalSplit = (id: string, patch: Partial<SplitDraft>) => {
    setPersonalSplits(previous =>
      previous.map(split => (split.id === id ? { ...split, ...patch } : split))
    )
  }

  const personalSplitTotal = personalSplits.reduce((sum, split) => {
    const amount = Number(split.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  const onCreatePersonalSplit = () => {
    const totalAmount = Number(personalTotal)
    if (!personalDescription.trim() || !personalCategory || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return
    }

    if (Math.abs(personalSplitTotal - totalAmount) > 0.01) {
      return
    }

    const defaultAccount = accounts[0]
    if (!defaultAccount) {
      return
    }

    addTransaction({
      description: personalDescription.trim(),
      amount: -Math.abs(totalAmount),
      date: new Date().toISOString().split("T")[0],
      category: personalCategory,
      type: "expense",
      accountId: defaultAccount.id,
      accountName: defaultAccount.name,
      party: personalCounterparty.trim() || undefined,
      notes: [
        "Split details:",
        ...personalSplits.map(split => `${split.name || "Unknown"}: ${formatCurrency(Number(split.amount) || 0)}`),
      ].join("\n"),
      isShared: true,
      totalAmount,
      splits: personalSplits.map(split => ({
        id: split.id,
        personName: split.name || "Unknown",
        amount: Number(split.amount) || 0,
        isPaid: split.name.trim().toLowerCase() === "me",
      })),
    })

    setPersonalDescription("")
    setPersonalTotal("")
    setPersonalCounterparty("")
    setPersonalSplits([{ id: `p-${Date.now()}-1`, name: "Me", amount: "" }])
  }

  const onDownloadPersonalSplit = () => {
    const totalAmount = Number(personalTotal)
    if (!personalDescription.trim() || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return
    }

    const validRows = personalSplits
      .filter(split => split.name.trim())
      .map(split => ({
        name: split.name.trim(),
        amount: Number(split.amount) || 0,
      }))

    if (validRows.length === 0) return

    const splitTotal = validRows.reduce((sum, split) => sum + split.amount, 0)
    const difference = totalAmount - splitTotal

    const canvas = document.createElement("canvas")
    const width = 1400
    const rowHeight = 68
    const pagePadding = 54
    const cardHeaderHeight = 230
    const tableHeaderHeight = 56
    const summaryHeight = 170
    const footerHeight = 72
    const cardVerticalPadding = 36
    const cardHeight =
      cardHeaderHeight +
      tableHeaderHeight +
      (validRows.length * rowHeight) +
      summaryHeight +
      footerHeight +
      cardVerticalPadding
    const height = cardHeight + (pagePadding * 2)

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) return

    const brand = {
      primary: "#2563eb",
      primaryDark: "#1d4ed8",
      slate: "#0f172a",
      softBg: "#f8fafc",
      muted: "#64748b",
      success: "#166534",
      danger: "#b91c1c",
      cardBorder: "#dbeafe",
      rowAlt: "#f1f5f9",
    }

    const truncateText = (text: string, maxWidth: number) => {
      if (context.measureText(text).width <= maxWidth) return text
      let current = text
      while (current.length > 0 && context.measureText(`${current}…`).width > maxWidth) {
        current = current.slice(0, -1)
      }
      return `${current}…`
    }

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
      context.beginPath()
      context.moveTo(x + radius, y)
      context.lineTo(x + w - radius, y)
      context.quadraticCurveTo(x + w, y, x + w, y + radius)
      context.lineTo(x + w, y + h - radius)
      context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
      context.lineTo(x + radius, y + h)
      context.quadraticCurveTo(x, y + h, x, y + h - radius)
      context.lineTo(x, y + radius)
      context.quadraticCurveTo(x, y, x + radius, y)
      context.closePath()
    }

    const pageGradient = context.createLinearGradient(0, 0, width, height)
    pageGradient.addColorStop(0, "#e0ecff")
    pageGradient.addColorStop(1, "#dbeafe")
    context.fillStyle = pageGradient
    context.fillRect(0, 0, width, height)

    const cardX = pagePadding
    const cardY = pagePadding
    const cardWidth = width - (pagePadding * 2)

    context.shadowColor = "rgba(15, 23, 42, 0.18)"
    context.shadowBlur = 24
    context.shadowOffsetY = 8
    drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 26)
    context.fillStyle = "#ffffff"
    context.fill()
    context.shadowColor = "transparent"
    context.shadowBlur = 0
    context.shadowOffsetY = 0

    const headerGradient = context.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeaderHeight)
    headerGradient.addColorStop(0, brand.primaryDark)
    headerGradient.addColorStop(1, brand.primary)
    drawRoundedRect(cardX, cardY, cardWidth, cardHeaderHeight, 26)
    context.fillStyle = headerGradient
    context.fill()

    context.strokeStyle = brand.cardBorder
    context.lineWidth = 2
    drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 26)
    context.stroke()

    const logoCenterX = cardX + 96
    const logoCenterY = cardY + 88

    context.beginPath()
    context.arc(logoCenterX, logoCenterY, 38, 0, Math.PI * 2)
    context.fillStyle = "rgba(255, 255, 255, 0.18)"
    context.fill()

    context.fillStyle = "#ffffff"
    context.font = "bold 34px sans-serif"
    context.textAlign = "center"
    context.fillText("CR", logoCenterX, logoCenterY + 12)
    context.textAlign = "left"

    context.fillStyle = "#e2e8f0"
    context.font = "600 24px sans-serif"
    context.fillText("CORE", cardX + 156, cardY + 68)

    context.fillStyle = "#ffffff"
    context.font = "bold 54px sans-serif"
    context.fillText("Split Bill", cardX + 156, cardY + 128)

    context.font = "28px sans-serif"
    context.fillStyle = "#dbeafe"
    context.fillText(truncateText(personalDescription.trim(), cardWidth - 540), cardX + 156, cardY + 174)

    const amountChipWidth = 320
    const amountChipHeight = 96
    const amountChipX = cardX + cardWidth - amountChipWidth - 48
    const amountChipY = cardY + 48

    drawRoundedRect(amountChipX, amountChipY, amountChipWidth, amountChipHeight, 18)
    context.fillStyle = "rgba(255, 255, 255, 0.18)"
    context.fill()

    context.fillStyle = "#dbeafe"
    context.font = "600 22px sans-serif"
    context.textAlign = "center"
    context.fillText("TOTAL", amountChipX + (amountChipWidth / 2), amountChipY + 34)
    context.fillStyle = "#ffffff"
    context.font = "bold 36px sans-serif"
    context.fillText(formatCurrency(totalAmount), amountChipX + (amountChipWidth / 2), amountChipY + 76)
    context.textAlign = "left"

    const metaY = cardY + 214
    context.fillStyle = "#bfdbfe"
    context.font = "22px sans-serif"
    context.fillText(`Category: ${personalCategory || "—"}`, cardX + 72, metaY)
    context.fillText(`Party: ${personalCounterparty.trim() || "—"}`, cardX + 500, metaY)
    context.fillText(`Date: ${new Date().toLocaleDateString()}`, cardX + 930, metaY)

    const tableX = cardX + 36
    const tableY = cardY + cardHeaderHeight + 26
    const tableWidth = cardWidth - 72

    drawRoundedRect(tableX, tableY, tableWidth, tableHeaderHeight, 14)
    context.fillStyle = brand.softBg
    context.fill()

    context.fillStyle = brand.slate
    context.font = "bold 24px sans-serif"
    context.fillText("Name", tableX + 24, tableY + 37)
    context.textAlign = "right"
    context.fillText("Amount", tableX + tableWidth - 24, tableY + 37)
    context.textAlign = "left"

    validRows.forEach((split, index) => {
      const rowY = tableY + tableHeaderHeight + (index * rowHeight)
      const rowTextY = rowY + 44

      if (index % 2 === 0) {
        drawRoundedRect(tableX, rowY + 4, tableWidth, rowHeight - 8, 12)
        context.fillStyle = brand.rowAlt
        context.fill()
      }

      context.fillStyle = brand.slate
      context.font = "22px sans-serif"
      context.fillText(truncateText(split.name, tableWidth - 280), tableX + 24, rowTextY)

      context.textAlign = "right"
      context.fillText(formatCurrency(split.amount), tableX + tableWidth - 24, rowTextY)
      context.textAlign = "left"
    })

    const summaryY = tableY + tableHeaderHeight + (validRows.length * rowHeight) + 26
    const summaryX = tableX
    const summaryWidth = tableWidth

    drawRoundedRect(summaryX, summaryY, summaryWidth, summaryHeight, 16)
    context.fillStyle = brand.softBg
    context.fill()

    context.fillStyle = brand.slate
    context.font = "bold 28px sans-serif"
    context.fillText(`Split Total: ${formatCurrency(splitTotal)}`, summaryX + 24, summaryY + 54)

    context.fillStyle = Math.abs(difference) < 0.01 ? brand.success : brand.danger
    context.font = "bold 24px sans-serif"
    context.fillText(
      Math.abs(difference) < 0.01
        ? "Balanced split ✓"
        : `Difference: ${formatCurrency(difference)}`,
      summaryX + 24,
      summaryY + 98
    )

    context.fillStyle = brand.muted
    context.font = "20px sans-serif"
    context.fillText(`Generated on ${new Date().toLocaleString()}`, summaryX + 24, summaryY + 136)

    const footerY = summaryY + summaryHeight + 42
    context.fillStyle = brand.muted
    context.font = "600 19px sans-serif"
    context.fillText("Generated with CORE", cardX + 40, footerY)
    context.textAlign = "right"
    context.fillText("Smart expense splitting", cardX + cardWidth - 40, footerY)
    context.textAlign = "left"

    const exportDataURL = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.href = exportDataURL
    link.download = `split-bill-${new Date().toISOString().slice(0, 10)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "groups" | "personal")}>
        <TabsList>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="w-4 h-4" />
            Group Settlements
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            <Handshake className="w-4 h-4" />
            Personal Split + Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono">Your Groups</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Create and manage settlement groups
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setGroupDialogOpen(true)} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {settlementGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No groups yet. Create one to start splitting.</p>
                ) : (
                  settlementGroups.map(group => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        selectedGroupId === group.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {group.members.length} members • {group.transactions.length} entries
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-wrap gap-3 items-start justify-between">
                  <div>
                    <CardTitle className="font-mono">{selectedGroup?.name || "Select a Group"}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Chat-like ledger of who owes whom
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {!selectedGroup ? (
                  <p className="text-sm text-muted-foreground">Pick a group to see members, debts, and transactions.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Members</p>
                        <p className="text-xl font-semibold mt-1">{selectedGroup.members.length}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Transactions</p>
                        <p className="text-xl font-semibold mt-1">{selectedGroup.transactions.length}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Spent</p>
                        <p className="text-xl font-semibold mt-1">{formatCurrency(selectedGroupTotalSpent)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-gradient-to-b from-primary/5 to-transparent p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        <p className="text-sm font-medium">Invite by Email</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="member@email.com"
                          className="sm:flex-1"
                        />
                        <Button onClick={onSendInvite} className="gap-1">
                          <UserPlus className="w-4 h-4" />
                          Invite
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Invitation works only if that email already belongs to a platform user.
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-medium mb-2">Debt Summary</p>
                      {debtSummary.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Everyone is settled up.</p>
                      ) : (
                        <div className="space-y-2">
                          {debtSummary.map((line, idx) => (
                            <div
                              key={`${line}-${idx}`}
                              className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm"
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border p-3 space-y-3">
                      <p className="text-sm font-medium">New Group Transaction</p>

                      <Input
                        value={groupTransactionDescription}
                        onChange={e => setGroupTransactionDescription(e.target.value)}
                        placeholder="Dinner at downtown"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={groupTransactionTotal}
                          onChange={e => setGroupTransactionTotal(e.target.value)}
                          placeholder="Total amount"
                        />

                        <Select value={groupTransactionPayer} onValueChange={setGroupTransactionPayer}>
                          <SelectTrigger>
                            <SelectValue placeholder="Who paid?" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedGroup.members.map(member => (
                              <SelectItem key={member.userId} value={member.userId}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        {splitDrafts.map(draft => (
                          <div key={draft.id} className="grid grid-cols-2 gap-2">
                            <Input value={draft.name} disabled />
                            <Input
                              type="number"
                              step="0.01"
                              value={draft.amount}
                              onChange={e => updateSplitDraft(draft.id, e.target.value)}
                              placeholder="Share amount"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Split total: <span className="font-semibold text-foreground">{formatCurrency(groupSplitTotal)}</span>
                          </p>
                          <Button variant="outline" size="sm" onClick={fillGroupSharesEqually}>
                            Split Equally
                          </Button>
                        </div>
                        <p
                          className={`text-xs ${
                            Math.abs(groupSplitDifference) < 0.01
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {Math.abs(groupSplitDifference) < 0.01
                            ? "Split is balanced ✓"
                            : `Difference: ${formatCurrency(groupSplitDifference)}`}
                        </p>
                      </div>

                      <Input
                        value={groupTransactionNotes}
                        onChange={e => setGroupTransactionNotes(e.target.value)}
                        placeholder="Notes (optional)"
                      />

                      <Button onClick={onAddGroupTransaction} className="w-full gap-2">
                        <Plus className="w-4 h-4" />
                        Add Group Transaction
                      </Button>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <p className="text-sm font-medium">Activity Feed</p>
                      </div>

                      {selectedGroup.transactions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No transactions yet.</p>
                      ) : (
                        <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
                          {selectedGroup.transactions.map(tx => (
                            <div key={tx.id} className="rounded-xl border bg-gradient-to-b from-background to-muted/40 p-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <p className="text-sm font-semibold">
                                  {tx.paidByName} paid {formatCurrency(tx.totalAmount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(tx.createdAt)}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{tx.description}</p>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {tx.shares.map(share => (
                                  <div
                                    key={`${tx.id}-${share.userId}`}
                                    className="rounded-md border bg-background/80 px-2.5 py-1.5 text-xs flex justify-between gap-2"
                                  >
                                    <span>{share.name}</span>
                                    <span className="font-medium">{formatCurrency(share.amount)}</span>
                                  </div>
                                ))}
                              </div>
                              {tx.notes && (
                                <p className="text-xs mt-2 text-muted-foreground border-t pt-2">
                                  Note: {tx.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono">Invitations</CardTitle>
              <CardDescription className="font-mono text-xs">
                Accept or decline group invites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {myPendingInvites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending invitations.</p>
              ) : (
                myPendingInvites.map(invite => (
                  <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{invite.groupName}</p>
                      <p className="text-xs text-muted-foreground">Invited by {invite.invitedByName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => respondToSettlementInvite(invite.id, "decline")}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => respondToSettlementInvite(invite.id, "accept")}>
                        Accept
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono">Personal Split Bill</CardTitle>
              <CardDescription className="font-mono text-xs">
                Create split in your account and download PNG split bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={personalDescription}
                onChange={e => setPersonalDescription(e.target.value)}
                placeholder="Description (e.g., Weekend trip groceries)"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={personalTotal}
                  onChange={e => setPersonalTotal(e.target.value)}
                  placeholder="Total amount"
                />

                <Input
                  value={personalCounterparty}
                  onChange={e => setPersonalCounterparty(e.target.value)}
                  placeholder="Party (optional)"
                />
              </div>

              <Select value={personalCategory} onValueChange={setPersonalCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(category => category.type !== "income")
                    .map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                {personalSplits.map(split => (
                  <div key={split.id} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-6"
                      value={split.name}
                      onChange={e => updatePersonalSplit(split.id, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input
                      className="col-span-5"
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={e => updatePersonalSplit(split.id, { amount: e.target.value })}
                      placeholder="Amount"
                    />
                    <Button
                      className="col-span-1"
                      variant="ghost"
                      disabled={personalSplits.length <= 1}
                      onClick={() => removePersonalSplitPerson(split.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={addPersonalSplitPerson} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Person
              </Button>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">Split Summary</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Entered total: {formatCurrency(Number(personalTotal) || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Split total: {formatCurrency(personalSplitTotal)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={onCreatePersonalSplit} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Save to History
                </Button>
                <Button variant="outline" onClick={onDownloadPersonalSplit} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download Split Bill (PNG)
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  <p className="text-muted-foreground mb-4 font-mono text-sm">No pending settlements.</p>
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
                              <Button size="sm" onClick={() => handleCompleteSettlement(settlement)} className="gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Mark Settled
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(settlement)}>
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
                        <p className="font-bold text-emerald-600">{formatCurrency(settlement.amount)}</p>
                        <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(settlement)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Create Group</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a shared settlement group and invite members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="group-name">Group Name*</FieldLabel>
              <Input
                id="group-name"
                value={groupName}
                onChange={event => setGroupName(event.target.value)}
                placeholder="Trip to Goa"
              />
            </div>
            <div>
              <FieldLabel htmlFor="group-description">Description (optional)</FieldLabel>
              <Input
                id="group-description"
                value={groupDescription}
                onChange={event => setGroupDescription(event.target.value)}
                placeholder="Friends travel split"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={onCreateGroup} disabled={!groupName.trim()}>
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => handleAddDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSettlement} disabled={!formData.party || !formData.amount}>
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
