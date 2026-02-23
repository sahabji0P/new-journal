"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, CheckCircle, Download, Trash2 } from "lucide-react"

type SplitDraft = { id: string; name: string; amount: string }

interface PersonalSplitBillFormProps {
  description: string
  onDescriptionChange: (value: string) => void
  total: string
  onTotalChange: (value: string) => void
  counterparty: string
  onCounterpartyChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  categories: Array<{ id: string; name: string; type: string }>
  splits: SplitDraft[]
  onAddPerson: () => void
  onRemovePerson: (id: string) => void
  onUpdateSplit: (id: string, patch: Partial<SplitDraft>) => void
  splitTotal: number
  onCreateSplit: () => void
  onDownloadSplit: () => void
  formatCurrency: (n: number) => string
}

export function PersonalSplitBillForm({
  description,
  onDescriptionChange,
  total,
  onTotalChange,
  counterparty,
  onCounterpartyChange,
  category,
  onCategoryChange,
  categories,
  splits,
  onAddPerson,
  onRemovePerson,
  onUpdateSplit,
  splitTotal,
  onCreateSplit,
  onDownloadSplit,
  formatCurrency,
}: PersonalSplitBillFormProps) {
  const expenseCategories = categories.filter((c) => c.type !== "income")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono">Personal Split Bill</CardTitle>
        <CardDescription>
          Create split in your account and download PNG split bill
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Description (e.g., Weekend trip groceries)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="0.01"
            placeholder="Total amount"
            value={total}
            onChange={(e) => onTotalChange(e.target.value)}
          />
          <Input
            placeholder="Party (optional)"
            value={counterparty}
            onChange={(e) => onCounterpartyChange(e.target.value)}
          />
        </div>

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-y-2">
          {splits.map((split) => (
            <div key={split.id} className="grid sm:grid-cols-12 gap-2">
              <Input
                className="col-span-6"
                placeholder="Name"
                value={split.name}
                onChange={(e) =>
                  onUpdateSplit(split.id, { name: e.target.value })
                }
              />
              <Input
                className="col-span-5"
                type="number"
                step="0.01"
                placeholder="Amount"
                value={split.amount}
                onChange={(e) =>
                  onUpdateSplit(split.id, { amount: e.target.value })
                }
              />
              <Button
                className="col-span-1"
                variant="ghost"
                size="icon"
                disabled={splits.length <= 1}
                onClick={() => onRemovePerson(split.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={onAddPerson}>
          <Plus className="size-4 mr-1" />
          Add Person
        </Button>

        <div className="rounded-md border p-3 text-sm space-y-1">
          <p>
            Entered total:{" "}
            <span className="font-medium">
              {formatCurrency(parseFloat(total) || 0)}
            </span>
          </p>
          <p>
            Split total:{" "}
            <span className="font-medium">{formatCurrency(splitTotal)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onCreateSplit}>
            <CheckCircle className="size-4 mr-1" />
            Save to History
          </Button>
          <Button variant="outline" onClick={onDownloadSplit}>
            <Download className="size-4 mr-1" />
            Download Split Bill (PNG)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
