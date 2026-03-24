"use client"

import { PendingInvitationsCard } from "@/components/settlements/PendingInvitationsCard"

interface PendingInvitesBannerProps {
  invitations: Array<{ id: string; groupName: string; invitedByName: string }>
  onRespond: (id: string, action: "accept" | "decline") => Promise<void> | void
}

export function PendingInvitesBanner({ invitations, onRespond }: PendingInvitesBannerProps) {
  if (invitations.length === 0) return null

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <PendingInvitationsCard invitations={invitations} onRespond={onRespond} />
    </div>
  )
}
