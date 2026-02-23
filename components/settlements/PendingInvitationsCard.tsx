"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PendingInvitationsCardProps {
  invitations: Array<{
    id: string
    groupName: string
    invitedByName: string
  }>
  onRespond: (invitationId: string, action: "accept" | "decline") => void
}

export function PendingInvitationsCard({
  invitations,
  onRespond,
}: PendingInvitationsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">Pending Invitations</CardTitle>
        <CardDescription>
          Join existing groups shared with your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending invitations.
          </p>
        ) : (
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {invitation.groupName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {invitation.invitedByName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRespond(invitation.id, "decline")}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onRespond(invitation.id, "accept")}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
