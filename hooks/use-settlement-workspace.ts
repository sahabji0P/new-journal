"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useApp } from "@/contexts/AppContext"
import { useSession } from "next-auth/react"
import { useFormCloseGuard } from "@/hooks/use-form-close-guard"
import { toast } from "@/lib/toast"
import type { Settlement } from "@/lib/types"
import { calculateGroupBalances, generateSettlementSuggestions, amountToCents } from "@/lib/settlements/group-ledger"

export type SplitDraft = {
  id: string
  name: string
  amount: string
}

export type SettleDraft = {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: string
  maxAmount: number
  notes: string
}

export type PersonalFormData = {
  party: string
  type: "i_owe" | "owed_to_me"
  amount: string
  reason: string
}

const defaultFormData: PersonalFormData = {
  party: "",
  type: "i_owe",
  amount: "",
  reason: "",
}

export function useSettlementWorkspace() {
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

  // ── Tab state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"groups" | "personal">("groups")

  // ── Personal settlement dialog state ───────────────────────────────
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

  // ── Group dialog state ─────────────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")

  // ── Selected group ─────────────────────────────────────────────────
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")

  // ── Invite ─────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState("")

  // ── Group transaction form ─────────────────────────────────────────
  const [groupTransactionDescription, setGroupTransactionDescription] = useState("")
  const [groupTransactionTotal, setGroupTransactionTotal] = useState("")
  const [groupTransactionPayer, setGroupTransactionPayer] = useState("")
  const [groupTransactionNotes, setGroupTransactionNotes] = useState("")

  // ── Split state ────────────────────────────────────────────────────
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[]>([])
  const [percentageDrafts, setPercentageDrafts] = useState<SplitDraft[]>([])
  const [groupSplitMode, setGroupSplitMode] = useState<"equal" | "custom" | "percentage">("equal")
  const [groupParticipants, setGroupParticipants] = useState<string[]>([])

  // ── Settle dialog ──────────────────────────────────────────────────
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [settleDraft, setSettleDraft] = useState<SettleDraft | null>(null)

  // ── Personal split state ───────────────────────────────────────────
  const [personalDescription, setPersonalDescription] = useState("")
  const [personalTotal, setPersonalTotal] = useState("")
  const [personalCategory, setPersonalCategory] = useState("")
  const [personalCounterparty, setPersonalCounterparty] = useState("")
  const [personalSplits, setPersonalSplits] = useState<SplitDraft[]>([
    { id: `p-${Date.now()}-1`, name: "Me", amount: "" },
  ])

  // ── Personal form ──────────────────────────────────────────────────
  const [formData, setFormData] = useState<PersonalFormData>(defaultFormData)
  const addFormGuard = useFormCloseGuard<PersonalFormData>()

  // ── Effects ────────────────────────────────────────────────────────

  // Load settlement workspace on mount
  useEffect(() => {
    void loadSettlementWorkspace()
  }, [loadSettlementWorkspace])

  // Auto-select first group when none selected
  useEffect(() => {
    if (!selectedGroupId && settlementGroups.length > 0) {
      setSelectedGroupId(settlementGroups[0].id)
    }
  }, [selectedGroupId, settlementGroups])

  // Sync split/percentage drafts and participants when selectedGroup changes
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

  // ── Derived values (useMemo) ───────────────────────────────────────

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

  const groupActivity = useMemo(() => {
    if (!selectedGroup) return []
    return [...selectedGroup.transactions].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  }, [selectedGroup])

  const pendingSettlements = useMemo(
    () => settlements.filter(s => !s.isSettled),
    [settlements]
  )

  const completedSettlements = useMemo(
    () => settlements.filter(s => s.isSettled),
    [settlements]
  )

  const totalIOwe = useMemo(
    () =>
      pendingSettlements
        .filter(s => s.type === "i_owe")
        .reduce((sum, s) => sum + s.amount, 0),
    [pendingSettlements]
  )

  const totalOwedToMe = useMemo(
    () =>
      pendingSettlements
        .filter(s => s.type === "owed_to_me")
        .reduce((sum, s) => sum + s.amount, 0),
    [pendingSettlements]
  )

  const myPendingInvites = useMemo(
    () => settlementInvitations.filter(invite => invite.status === "pending"),
    [settlementInvitations]
  )

  const personalSplitTotal = useMemo(
    () =>
      personalSplits.reduce((sum, split) => {
        const amount = Number(split.amount)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0),
    [personalSplits]
  )

  // ── Handlers ───────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData(defaultFormData)
  }, [])

  const handleAddSettlement = useCallback(() => {
    if (!formData.party.trim() || !formData.amount) return

    addSettlement({
      party: formData.party.trim(),
      amount: parseFloat(formData.amount),
      type: formData.type,
      reason: formData.reason.trim() || undefined,
      isSettled: false,
    })

    addFormGuard.clearSnapshot()
    setFormData(defaultFormData)
    setIsAddDialogOpen(false)
  }, [formData, addSettlement, addFormGuard])

  const handleCompleteSettlement = useCallback(
    (settlement: { id: string }) => {
      completeSettlement(settlement.id, new Date().toISOString())
    },
    [completeSettlement]
  )

  const handleDeleteSettlement = useCallback(() => {
    if (!selectedSettlement) return
    deleteSettlement(selectedSettlement.id)
    setIsDeleteDialogOpen(false)
    setSelectedSettlement(null)
  }, [selectedSettlement, deleteSettlement])

  const openDeleteDialog = useCallback((settlement: { id: string; party: string; amount: number; type: string }) => {
    setSelectedSettlement(settlement as Settlement)
    setIsDeleteDialogOpen(true)
  }, [])

  const openAddDialog = useCallback(() => {
    setFormData(defaultFormData)
    addFormGuard.rememberSnapshot(defaultFormData)
    setIsAddDialogOpen(true)
  }, [addFormGuard])

  const handleAddDialogChange = useCallback(
    (open: boolean) => {
      if (open) {
        setIsAddDialogOpen(true)
        return
      }
      if (!addFormGuard.confirmClose(formData)) return
      addFormGuard.clearSnapshot()
      setIsAddDialogOpen(false)
      setFormData(defaultFormData)
    },
    [addFormGuard, formData]
  )

  const onCreateGroup = useCallback(async () => {
    if (!groupName.trim()) return
    await createSettlementGroup({ name: groupName.trim(), description: groupDescription.trim() || undefined })
    setGroupName("")
    setGroupDescription("")
    setGroupDialogOpen(false)
    await loadSettlementWorkspace()
  }, [groupName, groupDescription, createSettlementGroup, loadSettlementWorkspace])

  const onSendInvite = useCallback(async () => {
    if (!selectedGroupId || !inviteEmail.trim()) return
    const normalizedEmail = inviteEmail.trim()
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      toast.warning("Enter a valid email address")
      return
    }
    await inviteToSettlementGroup(selectedGroupId, normalizedEmail)
    setInviteEmail("")
  }, [selectedGroupId, inviteEmail, inviteToSettlementGroup])

  const toggleGroupParticipant = useCallback((userId: string, checked: boolean) => {
    setGroupParticipants(previous => {
      if (checked) {
        if (previous.includes(userId)) return previous
        return [...previous, userId]
      }

      if (previous.length <= 1) {
        toast.warning("At least one participant is required")
        return previous
      }

      return previous.filter(id => id !== userId)
    })
  }, [])

  const updateSplitDraft = useCallback((id: string, amount: string) => {
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
  }, [])

  const updatePercentageDraft = useCallback((id: string, amount: string) => {
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
  }, [])

  const fillGroupSharesEqually = useCallback(() => {
    if (groupParticipants.length === 0) {
      toast.warning("Select participants first")
      return
    }

    const totalAmount = Number(groupTransactionTotal)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.warning("Enter a valid total amount first")
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
  }, [groupParticipants, groupTransactionTotal])

  const fillPercentagesEqually = useCallback(() => {
    if (groupParticipants.length === 0) {
      toast.warning("Select participants first")
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
  }, [groupParticipants])

  const onAddGroupTransaction = useCallback(async () => {
    if (!selectedGroup) return

    const totalAmount = Number(groupTransactionTotal)
    if (!groupTransactionDescription.trim() || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.warning("Enter description and valid total amount")
      return
    }

    if (!groupTransactionPayer) {
      toast.warning("Select who paid for this transaction")
      return
    }

    if (groupParticipants.length === 0) {
      toast.warning("Select at least one split participant")
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
        toast.warning("Enter valid split amounts for all selected participants")
        return
      }

      const totalShares = shares.reduce((sum, share) => sum + share.amount, 0)
      if (Math.abs(totalShares - totalAmount) > 0.01) {
        toast.warning("Custom split total must match transaction total")
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
        toast.warning("Enter valid percentages for selected participants")
        return
      }

      const totalPercentage = percentageShares.reduce((sum, share) => sum + share.percentage, 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.warning("Percentage total must equal 100%")
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
  }, [
    selectedGroup,
    groupTransactionTotal,
    groupTransactionDescription,
    groupTransactionPayer,
    groupParticipants,
    groupSplitMode,
    splitDrafts,
    percentageDrafts,
    groupTransactionNotes,
    addSettlementGroupTransaction,
    loadSettlementWorkspace,
  ])

  const openSettleDialog = useCallback((suggestion: {
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
  }, [])

  const onRecordSettlement = useCallback(async () => {
    if (!selectedGroup || !settleDraft) return

    const amount = Number(settleDraft.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.warning("Enter a valid payment amount")
      return
    }

    if (amount - settleDraft.maxAmount > 0.0001) {
      toast.warning(`Amount cannot exceed ${formatCurrency(settleDraft.maxAmount)}`)
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
  }, [selectedGroup, settleDraft, formatCurrency, recordSettlementGroupPayment])

  const onSendReminder = useCallback(
    async (suggestion: { fromUserId: string; amount: number }) => {
      if (!selectedGroup) return

      await sendSettlementGroupReminder({
        groupId: selectedGroup.id,
        toUserId: suggestion.fromUserId,
        amount: suggestion.amount,
      })
    },
    [selectedGroup, sendSettlementGroupReminder]
  )

  const addPersonalSplitPerson = useCallback(() => {
    setPersonalSplits(previous => [
      ...previous,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        amount: "",
      },
    ])
  }, [])

  const removePersonalSplitPerson = useCallback((id: string) => {
    setPersonalSplits(previous => previous.filter(split => split.id !== id))
  }, [])

  const updatePersonalSplit = useCallback((id: string, patch: Partial<SplitDraft>) => {
    setPersonalSplits(previous =>
      previous.map(split => (split.id === id ? { ...split, ...patch } : split))
    )
  }, [])

  const onCreatePersonalSplit = useCallback(() => {
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
  }, [
    personalTotal,
    personalDescription,
    personalCategory,
    personalSplitTotal,
    accounts,
    personalCounterparty,
    personalSplits,
    addTransaction,
    formatCurrency,
  ])

  const onDownloadPersonalSplit = useCallback(async () => {
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
        ? "Balanced split \u2713"
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
  }, [
    personalTotal,
    personalDescription,
    personalSplits,
    personalCategory,
    personalCounterparty,
    formatCurrency,
  ])

  // ── Record group expense in personal accounts ──────────────────────

  const recordInPersonalAccounts = useCallback(async (
    recordGroupId: string,
    transactionId: string,
    accountId: string,
    category: string
  ) => {
    const loadingToast = toast.loading("Recording in your accounts...")
    try {
      const res = await fetch(`/api/settlements/groups/${recordGroupId}/record-personal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, accountId, category }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to record" }))
        throw new Error(data.error || "Failed to record")
      }

      const data = await res.json()
      toast.dismiss(loadingToast)
      toast.success(`Expense recorded in ${data.accountName || "your account"}`)
      return data
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : "Failed to record expense")
      throw error
    }
  }, [])

  // ── Return ─────────────────────────────────────────────────────────

  return {
    // Re-exposed AppContext values
    formatCurrency,
    formatDate,
    categories,
    accounts,
    settlements,
    settlementGroups,
    settlementInvitations,
    respondToSettlementInvite,
    addSettlementGroupTransaction,
    loadSettlementWorkspace,

    // Tab state
    activeTab,
    setActiveTab,

    // Group dialog state
    groupDialogOpen,
    setGroupDialogOpen,
    groupName,
    setGroupName,
    groupDescription,
    setGroupDescription,

    // Selected group
    selectedGroupId,
    setSelectedGroupId,
    selectedGroup,
    currentUserId,

    // Invite
    inviteEmail,
    setInviteEmail,

    // Group transaction form
    groupTransactionDescription,
    setGroupTransactionDescription,
    groupTransactionTotal,
    setGroupTransactionTotal,
    groupTransactionPayer,
    setGroupTransactionPayer,
    groupTransactionNotes,
    setGroupTransactionNotes,

    // Split state
    splitDrafts,
    percentageDrafts,
    groupSplitMode,
    setGroupSplitMode,
    groupParticipants,

    // Settle dialog
    settleDialogOpen,
    setSettleDialogOpen,
    settleDraft,
    setSettleDraft,

    // Personal split state
    personalDescription,
    setPersonalDescription,
    personalTotal,
    setPersonalTotal,
    personalCategory,
    setPersonalCategory,
    personalCounterparty,
    setPersonalCounterparty,
    personalSplits,

    // Personal settlement dialog
    isAddDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedSettlement,
    setSelectedSettlement,

    // Personal form
    formData,
    setFormData,

    // Derived values
    fallbackLedger,
    groupBalances,
    groupSuggestions,
    selectedGroupTotalSpent,
    groupSplitTotal,
    groupPercentageTotal,
    parsedGroupTotal,
    groupSplitDifference,
    groupPercentageDifference,
    myNetBalance,
    groupActivity,
    pendingSettlements,
    completedSettlements,
    totalIOwe,
    totalOwedToMe,
    myPendingInvites,
    personalSplitTotal,

    // Handlers
    onCreateGroup,
    onSendInvite,
    toggleGroupParticipant,
    updateSplitDraft,
    updatePercentageDraft,
    fillGroupSharesEqually,
    fillPercentagesEqually,
    onAddGroupTransaction,
    openSettleDialog,
    onRecordSettlement,
    onSendReminder,
    addPersonalSplitPerson,
    removePersonalSplitPerson,
    updatePersonalSplit,
    onCreatePersonalSplit,
    onDownloadPersonalSplit,
    handleAddSettlement,
    handleCompleteSettlement,
    handleDeleteSettlement,
    openDeleteDialog,
    openAddDialog,
    handleAddDialogChange,
    resetForm,
    recordInPersonalAccounts,
  }
}
