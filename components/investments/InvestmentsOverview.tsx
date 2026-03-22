"use client"

import { useInvestments } from "@/contexts/InvestmentsContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PortfolioSummaryCards } from "./PortfolioSummaryCards"
import { AssetAllocationChart } from "./AssetAllocationChart"
import { QuickActions } from "./QuickActions"
import { FamilyDistributionChart } from "./FamilyDistributionChart"
import { MaturityTimeline } from "./MaturityTimeline"
import { TopPerformers } from "./TopPerformers"
import { InvestmentActivityFeed } from "./InvestmentActivityFeed"
import { TrendingUp, Users, Shield } from "lucide-react"
import Link from "next/link"

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function WelcomeCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-1">
          Welcome to Investments
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Track your family&apos;s investments, insurance policies, devices, and
          vehicles all in one place. Get started by adding a family member.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild>
            <Link href="/investments/family?action=add">
              <Users className="w-4 h-4 mr-2" />
              Add Family Member
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/investments/holdings?action=add">
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Investment
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/investments/insurance?action=add">
              <Shield className="w-4 h-4 mr-2" />
              Add Policy
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function InvestmentsOverview() {
  const {
    isLoading,
    familyMembers,
    investments,
    policies,
    devices,
    vehicles,
  } = useInvestments()

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasNoData =
    familyMembers.length === 0 &&
    investments.length === 0 &&
    policies.length === 0 &&
    devices.length === 0 &&
    vehicles.length === 0

  if (hasNoData) {
    return <WelcomeCard />
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Summary cards */}
      <section>
        <PortfolioSummaryCards />
      </section>

      {/* Row 2: Asset Allocation + Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AssetAllocationChart />
        </div>
        <QuickActions />
      </section>

      {/* Row 3: Family Distribution + Maturity Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FamilyDistributionChart />
        <div className="lg:col-span-2">
          <MaturityTimeline />
        </div>
      </section>

      {/* Row 4: Top Performers + Activity Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopPerformers />
        <div className="lg:col-span-2">
          <InvestmentActivityFeed />
        </div>
      </section>
    </div>
  )
}
