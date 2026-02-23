"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GroupOverviewTab } from "./group/GroupOverviewTab"
import { GroupExpensesTab } from "./group/GroupExpensesTab"
import { GroupMembersTab } from "./group/GroupMembersTab"

interface SettlementGroupDetailProps {
  group:
    | {
        name: string
        members: Array<{
          userId: string
          name: string
          email: string
          role: string
        }>
        transactions: Array<{
          id: string
          transactionType?: string
          paidByName: string
          fromUserName?: string
          toUserName?: string
          totalAmount: number
          description: string
          shares: Array<{ userId: string; name: string; amount: number }>
          notes?: string
          createdAt: string
        }>
      }
    | undefined
  memberCount: number
  entryCount: number
  totalSpent: number
  myNetBalance: number
  balances: Array<{ userId: string; name: string; balance: number }>
  suggestions: Array<{
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: number
  }>
  groupActivity: Array<{
    id: string
    transactionType?: string
    paidByName: string
    fromUserName?: string
    toUserName?: string
    totalAmount: number
    description: string
    shares: Array<{ userId: string; name: string; amount: number }>
    notes?: string
    createdAt: string
  }>
  currentUserId: string
  inviteEmail: string
  onInviteEmailChange: (email: string) => void
  onSendInvite: () => void
  onSettleUp: (suggestion: {
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    amount: number
  }) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
  onAddExpense: () => void
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}

export function SettlementGroupDetail({
  group,
  memberCount,
  entryCount,
  totalSpent,
  myNetBalance,
  balances,
  suggestions,
  groupActivity,
  currentUserId,
  inviteEmail,
  onInviteEmailChange,
  onSendInvite,
  onSettleUp,
  onRemind,
  onAddExpense,
  formatCurrency,
  formatDate,
}: SettlementGroupDetailProps) {
  return (
    <Card className="xl:col-span-8">
      <CardHeader>
        <CardTitle>{group ? group.name : "Select a Group"}</CardTitle>
        <CardDescription>
          Real-time balances, suggestions, and expense feed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!group ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Pick a group from the left to view balances and add transactions.
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <GroupOverviewTab
                memberCount={memberCount}
                entryCount={entryCount}
                totalSpent={totalSpent}
                myNetBalance={myNetBalance}
                balances={balances}
                suggestions={suggestions}
                currentUserId={currentUserId}
                formatCurrency={formatCurrency}
                onSettleUp={onSettleUp}
                onRemind={onRemind}
              />
            </TabsContent>
            <TabsContent value="expenses">
              <GroupExpensesTab
                transactions={groupActivity}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                onAddExpense={onAddExpense}
              />
            </TabsContent>
            <TabsContent value="members">
              <GroupMembersTab
                members={group.members}
                balances={balances}
                inviteEmail={inviteEmail}
                onInviteEmailChange={onInviteEmailChange}
                onSendInvite={onSendInvite}
                formatCurrency={formatCurrency}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
