"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/contexts/AppContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Crown,
  Trash2,
  LogOut,
  UserPlus,
  Mail,
  AlertTriangle,
} from "lucide-react"
import type { SettlementGroup } from "@/lib/types"
import { toast } from "@/lib/toast"

interface GroupSettingsTabProps {
  group: SettlementGroup
  currentUserId: string
  isOwner: boolean
}

export function GroupSettingsTab({
  group,
  currentUserId,
  isOwner,
}: GroupSettingsTabProps) {
  const router = useRouter()
  const {
    deleteSettlementGroup,
    removeSettlementGroupMember,
    inviteToSettlementGroup,
    loadSettlementWorkspace,
  } = useApp()

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  // Remove/Leave confirmation state
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [removeMemberName, setRemoveMemberName] = useState("")
  const [isRemoving, setIsRemoving] = useState(false)

  // Delete group confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const handleInvite = async () => {
    const email = inviteEmail.trim()
    if (!email) return
    setIsInviting(true)
    try {
      await inviteToSettlementGroup(group.id, email)
      toast.success(`Invitation sent to ${email}`)
      setInviteEmail("")
      await loadSettlementWorkspace()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation"
      )
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveOrLeave = async () => {
    if (!removeMemberId) return
    setIsRemoving(true)
    try {
      await removeSettlementGroupMember(group.id, removeMemberId)
      if (removeMemberId === currentUserId) {
        router.push("/settlements")
      } else {
        toast.success(`${removeMemberName} removed from group`)
        await loadSettlementWorkspace()
        setRemoveMemberId(null)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      )
    } finally {
      setIsRemoving(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (deleteConfirmName !== group.name) return
    setIsDeleting(true)
    try {
      await deleteSettlementGroup(group.id)
      router.push("/settlements")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete group"
      )
      setIsDeleting(false)
    }
  }

  const memberBeingActedOn = removeMemberId
    ? group.members.find((m) => m.userId === removeMemberId)
    : null
  const isLeavingAction = removeMemberId === currentUserId

  return (
    <div className="max-w-2xl p-4 md:p-6 space-y-8">
      {/* Members Section */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Members</h2>

        <div className="divide-y rounded-lg border">
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {member.name}
                  </span>
                  {member.role === "owner" && (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
              </div>

              {isOwner && member.userId !== currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                  onClick={() => {
                    setRemoveMemberId(member.userId)
                    setRemoveMemberName(member.name)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove</span>
                </Button>
              )}

              {!isOwner && member.userId === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                  onClick={() => {
                    setRemoveMemberId(member.userId)
                    setRemoveMemberName(member.name)
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="sr-only">Leave</span>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Invite Form */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium">
            <UserPlus className="h-4 w-4" />
            Invite by email
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleInvite()
              }}
              className="flex-1"
            />
            <Button
              onClick={() => void handleInvite()}
              disabled={isInviting || !inviteEmail.trim()}
            >
              <Mail className="h-4 w-4 mr-1.5" />
              {isInviting ? "Sending…" : "Invite"}
            </Button>
          </div>
        </div>
      </section>

      {/* Danger Zone (owner only) */}
      {isOwner && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-destructive">
            Danger Zone
          </h2>
          <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span>
                Deleting this group is permanent. All transactions and balances
                will be lost.
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Group
            </Button>
          </div>
        </section>
      )}

      {/* Remove / Leave Confirmation Dialog */}
      <Dialog
        open={!!removeMemberId}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isLeavingAction ? "Leave group?" : "Remove member?"}
            </DialogTitle>
            <DialogDescription>
              {isLeavingAction
                ? `You will lose access to "${group.name}". This cannot be undone.`
                : `Remove ${memberBeingActedOn?.name ?? "this member"} from "${group.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveMemberId(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRemoveOrLeave()}
              disabled={isRemoving}
            >
              {isRemoving
                ? "Removing…"
                : isLeavingAction
                  ? "Leave"
                  : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeleteConfirmName("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              Type{" "}
              <span className="font-semibold text-foreground">{group.name}</span>{" "}
              to confirm. This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={group.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteConfirmName("")
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteGroup()}
              disabled={isDeleting || deleteConfirmName !== group.name}
            >
              {isDeleting ? "Deleting…" : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
