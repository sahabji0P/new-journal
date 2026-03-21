import type { Transaction } from "@/lib/types"
import {
  BriefcaseBusiness,
  CarFront,
  CreditCard,
  House,
  ShoppingBag,
  Utensils,
  Wallet,
} from "lucide-react"
import { format, isSameDay, isToday, subDays } from "date-fns"

export function iconForTransaction(transaction: Transaction) {
  const value = `${transaction.category} ${transaction.description}`.toLowerCase()

  if (value.includes("grocery") || value.includes("market") || value.includes("shop")) {
    return ShoppingBag
  }
  if (value.includes("food") || value.includes("restaurant") || value.includes("cafe") || value.includes("coffee")) {
    return Utensils
  }
  if (value.includes("car") || value.includes("fuel") || value.includes("uber") || value.includes("transport")) {
    return CarFront
  }
  if (value.includes("rent") || value.includes("home") || value.includes("house")) {
    return House
  }
  if (value.includes("salary") || value.includes("income") || value.includes("payroll")) {
    return BriefcaseBusiness
  }
  if (value.includes("card") || value.includes("bank") || value.includes("credit")) {
    return CreditCard
  }
  return Wallet
}

export function transactionTimeLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--:--"
  return format(date, "hh:mm a")
}

export function getSignedAmountText(amount: number, formatCurrency: (amount: number) => string): string {
  if (amount === 0) return formatCurrency(0)
  return `${amount > 0 ? "+" : "-"} ${formatCurrency(Math.abs(amount))}`
}

export function getDayHeading(date: Date): string {
  if (isToday(date)) return "Today"
  if (isSameDay(date, subDays(new Date(), 1))) return "Yesterday"
  return format(date, "EEEE")
}
