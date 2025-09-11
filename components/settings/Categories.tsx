"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

interface Category {
    id: number
    name: string
}

interface Budget {
    id: number
    name: string
}

const initialCategories: Category[] = [
    { id: 1, name: "Food & Drink" },
    { id: 2, name: "Transport" },
    { id: 3, name: "Entertainment" },
]

export function Categories({ budgets }: { budgets: Budget[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories)
    const [newCategory, setNewCategory] = useState("")
    const [selectedBudgets, setSelectedBudgets] = useState<number[]>([])

    const handleAddCategory = () => {
        if (newCategory.trim() !== "") {
            const newCat: Category = {
                id: categories.length + 1,
                name: newCategory,
            }
            setCategories([...categories, newCat])
            setNewCategory("")
            setSelectedBudgets([])
            // Here you would also update the budgets with the new category
        }
    }

    return (
        <div>
            <div className="grid gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Add New Category</h3>
                    <div className="flex items-center gap-4">
                        <Input
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="Category Name"
                        />
                        <Button onClick={handleAddCategory}>Add Category</Button>
                    </div>
                    <div className="space-y-2">
                        <Label>Add to Budgets</Label>
                        <div className="flex flex-wrap gap-4">
                            {budgets.map(budget => (
                                <div key={budget.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`budget-${budget.id}`}
                                        onCheckedChange={checked => {
                                            setSelectedBudgets(prev =>
                                                checked
                                                    ? [...prev, budget.id]
                                                    : prev.filter(id => id !== budget.id)
                                            )
                                        }}
                                    />
                                    <Label htmlFor={`budget-${budget.id}`}>{budget.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium">Existing Categories</h3>
                    <ul className="space-y-2 mt-4">
                        {categories.map(cat => (
                            <li
                                key={cat.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                                <span>{cat.name}</span>
                                <Button variant="ghost" size="sm">
                                    Edit
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
