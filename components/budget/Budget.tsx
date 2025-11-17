"use client"

import { BudgetManagement } from "./BudgetManagement"

export function Budget() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Budget</h2>
                <p className="text-muted-foreground">Manage your spending plans and track progress</p>
            </div>
            <BudgetManagement />
        </div>
    )
}
