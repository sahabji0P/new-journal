"use client"

import { MenuBar } from "@/components/menu-bar"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

interface SubBudget {
    id: number
    category: string
    allocated: number
    spent: number
}

interface Budget {
    id: number
    name: string
    type: "monthly" | "event" | "trip"
    totalAllocated: number
    totalSpent: number
    subBudgets: SubBudget[]
}

const initialBudgets: Budget[] = [
    {
        id: 1,
        name: "Monthly Budget",
        type: "monthly",
        totalAllocated: 1000,
        totalSpent: 350,
        subBudgets: [
            { id: 1, category: "Food & Drink", allocated: 500, spent: 150 },
            { id: 2, category: "Transport", allocated: 200, spent: 100 },
            { id: 3, category: "Entertainment", allocated: 300, spent: 100 },
        ],
    },
    {
        id: 2,
        name: "Goa Trip",
        type: "trip",
        totalAllocated: 2000,
        totalSpent: 800,
        subBudgets: [
            { id: 1, category: "Travel", allocated: 1000, spent: 600 },
            { id: 2, category: "Stays", allocated: 500, spent: 200 },
            { id: 3, category: "Food", allocated: 500, spent: 0 },
        ],
    },
]

function CreateBudgetForm({
    onAddBudget,
}: {
    onAddBudget: (budget: Budget) => void
}) {
    const [type, setType] = useState<"monthly" | "event" | "trip">("monthly")
    const [name, setName] = useState("")
    const [amount, setAmount] = useState(0)

    const handleSubmit = () => {
        const budgetName = type === "monthly" ? "Monthly Budget" : name
        const newBudget: Budget = {
            id: Date.now(),
            name: budgetName,
            type,
            totalAllocated: amount,
            totalSpent: 0,
            subBudgets: [],
        }
        onAddBudget(newBudget)
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="type">Budget Type</Label>
                <Select onValueChange={(value: any) => setType(value)} defaultValue={type}>
                    <SelectTrigger id="type">
                        <SelectValue placeholder="Select a budget type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="trip">Trip</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {type !== "monthly" && (
                <div className="space-y-2">
                    <Label htmlFor="name">Budget Name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Goa Trip"
                    />
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="amount">Total Amount</Label>
                <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(parseInt(e.target.value))}
                />
            </div>
            <Button onClick={handleSubmit}>Create Budget</Button>
        </div>
    )
}

export default function BudgetPage() {
    const [budgets, setBudgets] = useState<Budget[]>(initialBudgets)
    const [selectedBudget, setSelectedBudget] = useState<Budget>(budgets[0])
    const [isCreateModalOpen, setCreateModalOpen] = useState(false)

    const handleAddBudget = (budget: Budget) => {
        setBudgets([...budgets, budget])
        setCreateModalOpen(false)
    }

    const handleSubBudgetChange = (
        subBudgetId: number,
        field: "allocated",
        value: number
    ) => {
        const updatedBudgets = budgets.map(b => {
            if (b.id === selectedBudget.id) {
                const updatedSubBudgets = b.subBudgets.map(sb =>
                    sb.id === subBudgetId ? { ...sb, [field]: value } : sb
                )
                const newTotalAllocated = updatedSubBudgets.reduce(
                    (sum, sb) => sum + sb.allocated,
                    0
                )
                return {
                    ...b,
                    subBudgets: updatedSubBudgets,
                    totalAllocated: newTotalAllocated,
                }
            }
            return b
        })
        setBudgets(updatedBudgets)
        setSelectedBudget(
            updatedBudgets.find(b => b.id === selectedBudget.id) || selectedBudget
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <MenuBar />
            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Monthly Budgets</h1>
                    <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button>Create New Budget</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Budget</DialogTitle>
                            </DialogHeader>
                            <CreateBudgetForm onAddBudget={handleAddBudget} />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Budget List */}
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Budgets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {budgets.map(budget => (
                                        <button
                                            key={budget.id}
                                            onClick={() => setSelectedBudget(budget)}
                                            className={`w-full text-left p-3 rounded-lg transition-colors ${selectedBudget.id === budget.id
                                                    ? "bg-primary/20 text-primary"
                                                    : "hover:bg-muted/50"
                                                }`}
                                        >
                                            <p className="font-semibold">{budget.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {budget.totalSpent} / {budget.totalAllocated}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected Budget Details */}
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{selectedBudget.name}</CardTitle>
                                <CardDescription>
                                    Manage your spending for this budget.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label>Total Budget</Label>
                                    <h2 className="text-2xl font-bold">
                                        {selectedBudget.totalAllocated}
                                    </h2>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-4">Category Budgets</h3>
                                    <div className="space-y-4">
                                        {selectedBudget.subBudgets.map(sb => (
                                            <div key={sb.id} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label>{sb.category}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            value={sb.allocated}
                                                            onChange={e =>
                                                                handleSubBudgetChange(
                                                                    sb.id,
                                                                    "allocated",
                                                                    parseInt(e.target.value)
                                                                )
                                                            }
                                                            className="w-24 bg-background/50"
                                                        />
                                                        <span className="text-muted-foreground">
                                                            / {sb.spent} spent
                                                        </span>
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={(sb.spent / sb.allocated) * 100}
                                                    className="h-2"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end">
                                <Button>Add Category</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
