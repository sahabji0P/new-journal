"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Landmark } from "lucide-react"

interface SettlementGroupListProps {
  groups: Array<{
    id: string
    name: string
    members: Array<unknown>
    transactions: Array<unknown>
  }>
  selectedGroupId: string
  onSelectGroup: (id: string) => void
  onCreateGroup: () => void
}

export function SettlementGroupList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
}: SettlementGroupListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            <CardTitle>Settlement Groups</CardTitle>
          </div>
          <Button size="sm" onClick={onCreateGroup} className="gap-2">
            <Plus className="w-4 h-4" />
            Group
          </Button>
        </div>
        <CardDescription>
          Create groups, invite members, and split expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups yet. Create your first group to start.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedGroupId === group.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/30"
                }`}
              >
                <p className="font-medium text-sm">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.members.length} members &bull;{" "}
                  {group.transactions.length} records
                </p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
