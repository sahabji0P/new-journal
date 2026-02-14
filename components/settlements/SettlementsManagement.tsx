"use client"

import { useEffect, useMemo, useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Checkbox } from "../ui/checkbox"
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
  BellRing,
  Landmark,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import type { Settlement } from "@/lib/types"
import { calculateGroupBalances, generateSettlementSuggestions, amountToCents } from "@/lib/settlements/group-ledger"

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
    recordSettlementGroupPayment,
    sendSettlementGroupReminder,
    addTransaction,
    accounts,
    categories,
  } = useApp()
  const { data: session } = useSession()

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
  const [percentageDrafts, setPercentageDrafts] = useState<SplitDraft[]>([])
  const [groupSplitMode, setGroupSplitMode] = useState<"equal" | "custom" | "percentage">("equal")
  const [groupParticipants, setGroupParticipants] = useState<string[]>([])
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [settleDraft, setSettleDraft] = useState<{
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: string
    maxAmount: number
    notes: string
  } | null>(null)

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
  const currentUserId = session?.user?.id || ""

  useEffect(() => {
    if (!selectedGroup) {
      setGroupTransactionPayer("")
      setSplitDrafts([])
      setPercentageDrafts([])
      setGroupParticipants([])
      return
    }

    if (!groupTransactionPayer || !selectedGroup.members.some(member => member.userId === groupTransactionPayer)) {
      setGroupTransactionPayer(selectedGroup.members[0]?.userId || "")
    }

    const memberIds = selectedGroup.members.map(member => member.userId)

    setGroupParticipants(previous => {
      if (previous.length === 0) return memberIds
      const filtered = previous.filter(id => memberIds.includes(id))
      return filtered.length > 0 ? filtered : memberIds
    })

    setSplitDrafts(previous => {
      const previousById = new Map(previous.map(draft => [draft.id, draft]))
      return selectedGroup.members.map(member => ({
        id: member.userId,
        name: member.name,
        amount: previousById.get(member.userId)?.amount || "",
      }))
    })

    setPercentageDrafts(previous => {
      const previousById = new Map(previous.map(draft => [draft.id, draft]))
      return selectedGroup.members.map(member => ({
        id: member.userId,
        name: member.name,
        amount: previousById.get(member.userId)?.amount || "",
      }))
    })
  }, [selectedGroup, groupTransactionPayer])

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
  const fallbackLedger = useMemo(() => {
    if (!selectedGroup) {
      return {
        balances: [] as ReturnType<typeof calculateGroupBalances>,
        suggestions: [] as ReturnType<typeof generateSettlementSuggestions>,
      }
    }

    const expenses = selectedGroup.transactions
      .filter(transaction => (transaction.transactionType || "expense") === "expense")
      .map(transaction => ({
        paidByUserId: transaction.paidByUserId,
        totalAmountCents: transaction.totalAmountCents ?? amountToCents(transaction.totalAmount),
        shares: transaction.shares.map(share => ({
          userId: share.userId,
          amountCents: share.amountCents ?? amountToCents(share.amount),
        })),
      }))

    const settlements = selectedGroup.transactions
      .filter(transaction => transaction.transactionType === "settlement")
      .map(transaction => ({
        fromUserId: transaction.fromUserId,
        toUserId: transaction.toUserId,
        amountCents: transaction.totalAmountCents ?? amountToCents(transaction.totalAmount),
      }))
      .filter(
        (
          settlement
        ): settlement is { fromUserId: string; toUserId: string; amountCents: number } =>
          Boolean(settlement.fromUserId && settlement.toUserId)
      )

    const balances = calculateGroupBalances({
      users: selectedGroup.members.map(member => ({
        id: member.userId,
        name: member.name,
        email: member.email || "",
      })),
      expenses,
      settlements,
    })
    const suggestions = generateSettlementSuggestions(balances)

    return {
      balances,
      suggestions,
    }
  }, [selectedGroup])

  const groupBalances = useMemo(() => {
    if (!selectedGroup) return []
    if (selectedGroup.balances && selectedGroup.balances.length > 0) {
      return selectedGroup.balances
    }

    return fallbackLedger.balances.map(balance => ({
      userId: balance.userId,
      name: balance.userName,
      email: balance.userEmail,
      balance: balance.balanceCents / 100,
      balanceCents: balance.balanceCents,
    }))
  }, [fallbackLedger.balances, selectedGroup])

  const groupSuggestions = useMemo(() => {
    if (!selectedGroup) return []
    if (selectedGroup.suggestions && selectedGroup.suggestions.length > 0) {
      return selectedGroup.suggestions
    }

    return fallbackLedger.suggestions.map(suggestion => ({
      fromUserId: suggestion.fromUserId,
      fromUserName: suggestion.fromUserName,
      toUserId: suggestion.toUserId,
      toUserName: suggestion.toUserName,
      amount: suggestion.amountCents / 100,
      amountCents: suggestion.amountCents,
    }))
  }, [fallbackLedger.suggestions, selectedGroup])

  const selectedGroupTotalSpent = useMemo(() => {
    if (!selectedGroup) return 0
    return selectedGroup.transactions
      .filter(transaction => (transaction.transactionType || "expense") === "expense")
      .reduce((sum, transaction) => sum + transaction.totalAmount, 0)
  }, [selectedGroup])

  const groupSplitTotal = useMemo(() => {
    return splitDrafts
      .filter(draft => groupParticipants.includes(draft.id))
      .reduce((sum, draft) => {
        const amount = Number(draft.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
  }, [groupParticipants, splitDrafts])

  const groupPercentageTotal = useMemo(() => {
    return percentageDrafts
      .filter(draft => groupParticipants.includes(draft.id))
      .reduce((sum, draft) => {
        const amount = Number(draft.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
  }, [groupParticipants, percentageDrafts])

  const parsedGroupTotal = useMemo(() => {
    const total = Number(groupTransactionTotal)
    return Number.isFinite(total) ? total : 0
  }, [groupTransactionTotal])

  const groupSplitDifference = useMemo(() => {
    return parsedGroupTotal - groupSplitTotal
  }, [groupSplitTotal, parsedGroupTotal])

  const groupPercentageDifference = useMemo(() => {
    return 100 - groupPercentageTotal
  }, [groupPercentageTotal])

  const myNetBalance = useMemo(() => {
    if (!currentUserId) return 0
    const row = groupBalances.find(balance => balance.userId === currentUserId)
    return row?.balance || 0
  }, [currentUserId, groupBalances])

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
    await inviteToSettlementGroup(selectedGroupId, normalizedEmail)
    setInviteEmail("")
  }

  const toggleGroupParticipant = (userId: string, checked: boolean) => {
    setGroupParticipants(previous => {
      if (checked) {
        if (previous.includes(userId)) return previous
        return [...previous, userId]
      }

      if (previous.length <= 1) {
        toast.error("At least one participant is required")
        return previous
      }

      return previous.filter(id => id !== userId)
    })
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

  const updatePercentageDraft = (id: string, amount: string) => {
    setPercentageDrafts(previous =>
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
    if (groupParticipants.length === 0) {
      toast.error("Select participants first")
      return
    }

    const totalAmount = Number(groupTransactionTotal)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Enter a valid total amount first")
      return
    }

    const perHead = Number((totalAmount / groupParticipants.length).toFixed(2))
    let assigned = 0

    setSplitDrafts(previous => previous.map(draft => {
      if (!groupParticipants.includes(draft.id)) {
        return {
          ...draft,
          amount: "",
        }
      }

      assigned += 1
      if (assigned === groupParticipants.length) {
        const previousTotal = Number((perHead * (groupParticipants.length - 1)).toFixed(2))
        return {
          ...draft,
          amount: Number((totalAmount - previousTotal).toFixed(2)).toString(),
        }
      }

      return {
        ...draft,
        amount: perHead.toString(),
      }
    }))
  }

  const fillPercentagesEqually = () => {
    if (groupParticipants.length === 0) {
      toast.error("Select participants first")
      return
    }

    const perHead = Number((100 / groupParticipants.length).toFixed(2))
    let assigned = 0

    setPercentageDrafts(previous => previous.map(draft => {
      if (!groupParticipants.includes(draft.id)) {
        return {
          ...draft,
          amount: "",
        }
      }

      assigned += 1
      if (assigned === groupParticipants.length) {
        const previousTotal = Number((perHead * (groupParticipants.length - 1)).toFixed(2))
        return {
          ...draft,
          amount: Number((100 - previousTotal).toFixed(2)).toString(),
        }
      }

      return {
        ...draft,
        amount: perHead.toString(),
      }
    }))
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

    if (groupParticipants.length === 0) {
      toast.error("Select at least one split participant")
      return
    }

    if (groupSplitMode === "custom") {
      const shares = splitDrafts
        .filter(draft => groupParticipants.includes(draft.id))
        .map(draft => ({
          userId: draft.id,
          amount: Number(draft.amount),
        }))

      if (shares.some(share => !Number.isFinite(share.amount) || share.amount < 0)) {
        toast.error("Enter valid split amounts for all selected participants")
        return
      }

      const totalShares = shares.reduce((sum, share) => sum + share.amount, 0)
      if (Math.abs(totalShares - totalAmount) > 0.01) {
        toast.error("Custom split total must match transaction total")
        return
      }

      await addSettlementGroupTransaction({
        groupId: selectedGroup.id,
        description: groupTransactionDescription.trim(),
        paidByUserId: groupTransactionPayer,
        totalAmount,
        splitType: "custom",
        notes: groupTransactionNotes.trim() || undefined,
        shares,
      })
    } else if (groupSplitMode === "percentage") {
      const percentageShares = percentageDrafts
        .filter(draft => groupParticipants.includes(draft.id))
        .map(draft => ({
          userId: draft.id,
          percentage: Number(draft.amount),
        }))

      if (percentageShares.some(share => !Number.isFinite(share.percentage) || share.percentage < 0)) {
        toast.error("Enter valid percentages for selected participants")
        return
      }

      const totalPercentage = percentageShares.reduce((sum, share) => sum + share.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error("Percentage total must equal 100%")
        return
      }

      await addSettlementGroupTransaction({
        groupId: selectedGroup.id,
        description: groupTransactionDescription.trim(),
        paidByUserId: groupTransactionPayer,
        totalAmount,
        splitType: "percentage",
        percentageShares,
        notes: groupTransactionNotes.trim() || undefined,
        shares: [],
      })
    } else {
      await addSettlementGroupTransaction({
        groupId: selectedGroup.id,
        description: groupTransactionDescription.trim(),
        paidByUserId: groupTransactionPayer,
        totalAmount,
        splitType: "equal",
        splitBetween: groupParticipants,
        notes: groupTransactionNotes.trim() || undefined,
        shares: [],
      })
    }

    setGroupTransactionDescription("")
    setGroupTransactionTotal("")
    setGroupTransactionNotes("")
    setSplitDrafts(previous => previous.map(draft => ({ ...draft, amount: "" })))
    setPercentageDrafts(previous => previous.map(draft => ({ ...draft, amount: "" })))
    await loadSettlementWorkspace()
  }

  const openSettleDialog = (suggestion: {
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: number
  }) => {
    setSettleDraft({
      fromUserId: suggestion.fromUserId,
      fromUserName: suggestion.fromUserName,
      toUserId: suggestion.toUserId,
      toUserName: suggestion.toUserName,
      amount: suggestion.amount.toFixed(2),
      maxAmount: suggestion.amount,
      notes: "",
    })
    setSettleDialogOpen(true)
  }

  const onRecordSettlement = async () => {
    if (!selectedGroup || !settleDraft) return

    const amount = Number(settleDraft.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount")
      return
    }

    if (amount - settleDraft.maxAmount > 0.0001) {
      toast.error(`Amount cannot exceed ${formatCurrency(settleDraft.maxAmount)}`)
      return
    }

    await recordSettlementGroupPayment({
      groupId: selectedGroup.id,
      fromUserId: settleDraft.fromUserId,
      toUserId: settleDraft.toUserId,
      amount,
      notes: settleDraft.notes.trim() || undefined,
    })

    setSettleDialogOpen(false)
    setSettleDraft(null)
  }

  const onSendReminder = async (suggestion: { fromUserId: string; amount: number }) => {
    if (!selectedGroup) return

    await sendSettlementGroupReminder({
      groupId: selectedGroup.id,
      toUserId: suggestion.fromUserId,
      amount: suggestion.amount,
    })
  }

  const groupActivity = useMemo(() => {
    if (!selectedGroup) return []
    return [...selectedGroup.transactions].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  }, [selectedGroup])

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

  const onDownloadPersonalSplit = async () => {
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
    const logoRadius = 38

    context.beginPath()
    context.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2)
    context.fillStyle = "rgba(255, 255, 255, 0.18)"
    context.fill()

    const logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(null)
      image.src = "/favicon.jpeg"
    })

    if (logoImage) {
      context.save()
      context.beginPath()
      context.arc(logoCenterX, logoCenterY, logoRadius - 4, 0, Math.PI * 2)
      context.clip()
      context.drawImage(
        logoImage,
        logoCenterX - (logoRadius - 4),
        logoCenterY - (logoRadius - 4),
        (logoRadius - 4) * 2,
        (logoRadius - 4) * 2
      )
      context.restore()
    } else {
      context.fillStyle = "#ffffff"
      context.font = "bold 34px sans-serif"
      context.textAlign = "center"
      context.fillText("CR", logoCenterX, logoCenterY + 12)
    }
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
        <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="groups" className="shrink-0 gap-2">
            <Users className="w-4 h-4" />
            Group Settlements
          </TabsTrigger>
          <TabsTrigger value="personal" className="shrink-0 gap-2">
            <Handshake className="w-4 h-4" />
            Personal Split + Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Card className="xl:col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="font-mono flex items-center gap-2">
                      <Landmark className="w-4 h-4" />
                      Settlement Groups
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Create groups, invite members, and split expenses
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
                  <p className="text-sm text-muted-foreground">No groups yet. Create your first group to start.</p>
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
                        {group.members.length} members • {group.transactions.length} records
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-8">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-mono">{selectedGroup?.name || "Select a Group"}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Real-time balances, suggestions, and expense feed
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedGroup ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Pick a group from the left to view balances and add transactions.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Members</p>
                        <p className="text-xl font-semibold mt-1">{selectedGroup.members.length}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Entries</p>
                        <p className="text-xl font-semibold mt-1">{selectedGroup.transactions.length}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Expense</p>
                        <p className="text-xl font-semibold mt-1">{formatCurrency(selectedGroupTotalSpent)}</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">My Net</p>
                        <p className={`text-xl font-semibold mt-1 ${myNetBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(myNetBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-gradient-to-b from-primary/10 to-transparent p-3">
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
                          Send Invite
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Invite is sent only if the email belongs to an existing platform user.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm font-medium mb-3">Group Balances</p>
                        {groupBalances.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No balances available yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {groupBalances.map(balance => (
                              <div key={balance.userId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                <span>{balance.name}</span>
                                <span className={balance.balance >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                                  {formatCurrency(balance.balance)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <p className="text-sm font-medium">Suggested Settlements</p>
                        </div>
                        {groupSuggestions.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Everyone is settled up.</p>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {groupSuggestions.map((suggestion, index) => {
                              const canSettle = currentUserId === suggestion.fromUserId
                              const canRemind = currentUserId === suggestion.toUserId

                              return (
                                <div key={`${suggestion.fromUserId}-${suggestion.toUserId}-${index}`} className="rounded-md border bg-muted/20 p-2.5">
                                  <div className="flex items-center justify-between gap-2 text-sm">
                                    <p className="font-medium flex items-center gap-1.5">
                                      <span>{suggestion.fromUserName}</span>
                                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                      <span>{suggestion.toUserName}</span>
                                    </p>
                                    <span className="font-semibold">{formatCurrency(suggestion.amount)}</span>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    {canSettle && (
                                      <Button
                                        size="sm"
                                        onClick={() => openSettleDialog(suggestion)}
                                        className="gap-1"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Settle Up
                                      </Button>
                                    )}
                                    {canRemind && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onSendReminder({ fromUserId: suggestion.fromUserId, amount: suggestion.amount })}
                                        className="gap-1"
                                      >
                                        <BellRing className="w-3.5 h-3.5" />
                                        Remind
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        <p className="text-sm font-medium">Add Group Expense</p>
                      </div>

                      <Input
                        value={groupTransactionDescription}
                        onChange={e => setGroupTransactionDescription(e.target.value)}
                        placeholder="Dinner at downtown"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                        <Select value={groupSplitMode} onValueChange={value => setGroupSplitMode(value as "equal" | "custom" | "percentage")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Split mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equal">Equal split</SelectItem>
                            <SelectItem value="custom">Custom split</SelectItem>
                            <SelectItem value="percentage">Percentage split</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="rounded-md border bg-muted/20 p-2.5">
                        <p className="text-xs font-medium mb-2">Split Participants</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedGroup.members.map(member => (
                            <label key={member.userId} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={groupParticipants.includes(member.userId)}
                                onCheckedChange={checked => toggleGroupParticipant(member.userId, Boolean(checked))}
                              />
                              <span>{member.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {groupSplitMode === "custom" && (
                        <div className="space-y-2">
                          {splitDrafts
                            .filter(draft => groupParticipants.includes(draft.id))
                            .map(draft => (
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
                          <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                Split total: <span className="font-semibold text-foreground">{formatCurrency(groupSplitTotal)}</span>
                              </p>
                              <Button variant="outline" size="sm" onClick={fillGroupSharesEqually}>
                                Fill equally
                              </Button>
                            </div>
                            <p className={`text-xs ${Math.abs(groupSplitDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                              {Math.abs(groupSplitDifference) < 0.01
                                ? "Custom split is balanced ✓"
                                : `Difference: ${formatCurrency(groupSplitDifference)}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {groupSplitMode === "percentage" && (
                        <div className="space-y-2">
                          {percentageDrafts
                            .filter(draft => groupParticipants.includes(draft.id))
                            .map(draft => (
                              <div key={draft.id} className="grid grid-cols-2 gap-2">
                                <Input value={draft.name} disabled />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={draft.amount}
                                  onChange={e => updatePercentageDraft(draft.id, e.target.value)}
                                  placeholder="Percentage"
                                />
                              </div>
                            ))}
                          <div className="rounded-lg border bg-muted/20 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                Total percentage: <span className="font-semibold text-foreground">{groupPercentageTotal.toFixed(2)}%</span>
                              </p>
                              <Button variant="outline" size="sm" onClick={fillPercentagesEqually}>
                                Fill equally
                              </Button>
                            </div>
                            <p className={`text-xs ${Math.abs(groupPercentageDifference) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                              {Math.abs(groupPercentageDifference) < 0.01
                                ? "Percentage split is valid ✓"
                                : `Remaining: ${groupPercentageDifference.toFixed(2)}%`}
                            </p>
                          </div>
                        </div>
                      )}

                      {groupSplitMode === "equal" && (
                        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
                          Equal split will divide the total amount among selected participants automatically.
                        </p>
                      )}

                      <Input
                        value={groupTransactionNotes}
                        onChange={e => setGroupTransactionNotes(e.target.value)}
                        placeholder="Notes (optional)"
                      />

                      <Button onClick={onAddGroupTransaction} className="w-full gap-2">
                        <Plus className="w-4 h-4" />
                        Add Expense
                      </Button>
                    </div>

                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4" />
                        <p className="text-sm font-medium">Activity Feed</p>
                      </div>

                      {groupActivity.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No transactions yet.</p>
                      ) : (
                        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                          {groupActivity.map(tx => {
                            const isSettlement = tx.transactionType === "settlement"
                            return (
                              <div
                                key={tx.id}
                                className={`rounded-xl border p-3 ${
                                  isSettlement
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-gradient-to-b from-background to-muted/40"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <p className="text-sm font-semibold">
                                    {isSettlement
                                      ? `${tx.fromUserName || tx.paidByName} paid ${tx.toUserName || "Member"} ${formatCurrency(tx.totalAmount)}`
                                      : `${tx.paidByName} paid ${formatCurrency(tx.totalAmount)}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(tx.createdAt)}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{tx.description}</p>
                                {!isSettlement && tx.shares.length > 0 && (
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
                                )}
                                {tx.notes && (
                                  <p className="text-xs mt-2 text-muted-foreground border-t pt-2">
                                    Note: {tx.notes}
                                  </p>
                                )}
                              </div>
                            )
                          })}
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
              <CardTitle className="font-mono">Pending Invitations</CardTitle>
              <CardDescription className="font-mono text-xs">
                Join existing groups shared with your account
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
                  <div key={split.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <Input
                      className="sm:col-span-6"
                      value={split.name}
                      onChange={e => updatePersonalSplit(split.id, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input
                      className="sm:col-span-5"
                      type="number"
                      step="0.01"
                      value={split.amount}
                      onChange={e => updatePersonalSplit(split.id, { amount: e.target.value })}
                      placeholder="Amount"
                    />
                    <Button
                      className="sm:col-span-1"
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

      <Dialog
        open={settleDialogOpen}
        onOpenChange={(open) => {
          setSettleDialogOpen(open)
          if (!open) setSettleDraft(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Settle Up</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Record a full or partial settlement payment.
            </DialogDescription>
          </DialogHeader>

          {settleDraft && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  <span>{settleDraft.fromUserName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{settleDraft.toUserName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum suggested amount: {formatCurrency(settleDraft.maxAmount)}
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="settle-amount">Amount*</FieldLabel>
                <Input
                  id="settle-amount"
                  type="number"
                  step="0.01"
                  value={settleDraft.amount}
                  onChange={event => setSettleDraft(previous => previous ? { ...previous, amount: event.target.value } : previous)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="settle-note">Note (optional)</FieldLabel>
                <Input
                  id="settle-note"
                  value={settleDraft.notes}
                  onChange={event => setSettleDraft(previous => previous ? { ...previous, notes: event.target.value } : previous)}
                  placeholder="Paid via UPI / cash / bank transfer"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setSettleDialogOpen(false)
                  setSettleDraft(null)
                }}>
                  Cancel
                </Button>
                <Button onClick={onRecordSettlement} className="gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Record Payment
                </Button>
              </div>
            </div>
          )}
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
