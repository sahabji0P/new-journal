"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, UserPlus } from "lucide-react"

interface GroupMembersTabProps {
  members: Array<{ userId: string; name: string; email: string; role: string }>
  balances: Array<{ userId: string; name: string; balance: number }>
  inviteEmail: string
  onInviteEmailChange: (email: string) => void
  onSendInvite: () => void
  formatCurrency: (n: number) => string
}

export function GroupMembersTab({
  members,
  balances,
  inviteEmail,
  onInviteEmailChange,
  onSendInvite,
  formatCurrency,
}: GroupMembersTabProps) {
  return (
    <div className="space-y-4">
      {/* Invite section */}
      <div className="rounded-lg border bg-gradient-to-b from-primary/10 to-transparent p-3">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium">Invite by Email</h4>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="member@email.com"
            value={inviteEmail}
            onChange={(e) => onInviteEmailChange(e.target.value)}
            className="flex-1"
          />
          <Button onClick={onSendInvite} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Send Invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Invite is sent only if the email belongs to an existing platform user.
        </p>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => {
          const memberBalance = balances.find(
            (b) => b.userId === member.userId
          )
          return (
            <div
              key={member.userId}
              className="rounded-lg border p-3 flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-sm">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
                <span
                  className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full ${
                    member.role === "owner"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {member.role}
                </span>
              </div>
              <div>
                {memberBalance && (
                  <span
                    className={`text-sm font-medium ${
                      memberBalance.balance > 0
                        ? "text-green-600"
                        : memberBalance.balance < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {formatCurrency(memberBalance.balance)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
