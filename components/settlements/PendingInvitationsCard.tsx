"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PendingInvitationsCardProps {
  invitations: Array<{
    id: string
    groupName: string
    invitedByName: string
  }>
  onRespond: (invitationId: string, action: "accept" | "decline") => Promise<void> | void
}

export function PendingInvitationsCard({
  invitations,
  onRespond,
}: PendingInvitationsCardProps) {
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const handleRespond = async (id: string, action: "accept" | "decline") => {
    setRespondingId(id)
    try {
      await onRespond(id, action)
    } finally {
      setRespondingId(null)
    }
  }

  if (invitations.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-1">
        Pending Invitations
      </p>
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {invitation.groupName}
            </p>
            <p className="text-xs text-muted-foreground">
              from {invitation.invitedByName}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={respondingId === invitation.id}
              onClick={() => handleRespond(invitation.id, "decline")}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={respondingId === invitation.id}
              onClick={() => handleRespond(invitation.id, "accept")}
            >
              {respondingId === invitation.id ? "..." : "Accept"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
