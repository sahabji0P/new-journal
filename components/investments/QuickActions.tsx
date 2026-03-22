"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Shield, UserPlus } from "lucide-react"

interface QuickActionsProps {
  onAddInvestment?: () => void
  onAddPolicy?: () => void
  onAddMember?: () => void
}

export function QuickActions({
  onAddInvestment,
  onAddPolicy,
  onAddMember,
}: QuickActionsProps) {
  const router = useRouter()

  const handleAddInvestment = () => {
    if (onAddInvestment) {
      onAddInvestment()
    } else {
      router.push("/investments/holdings?action=add")
    }
  }

  const handleAddPolicy = () => {
    if (onAddPolicy) {
      onAddPolicy()
    } else {
      router.push("/investments/insurance?action=add")
    }
  }

  const handleAddMember = () => {
    if (onAddMember) {
      onAddMember()
    } else {
      router.push("/investments/family?action=add")
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Add new entries quickly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleAddInvestment}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Add Investment
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleAddPolicy}
        >
          <Shield className="w-4 h-4 mr-2" />
          Add Policy
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleAddMember}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Family Member
        </Button>
      </CardContent>
    </Card>
  )
}
