import { GoalsManagement } from "@/components/goals/GoalsManagement"

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-mono">Savings Goals</h2>
        <p className="text-muted-foreground font-mono text-sm">
          Set and track your financial goals
        </p>
      </div>
      <GoalsManagement />
    </div>
  )
}
