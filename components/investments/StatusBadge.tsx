"use client"

import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "success" | "warning" | "danger" | "info"
}

const statusVariantMap: Record<string, StatusBadgeProps["variant"]> = {
  active: "success",
  paid: "success",
  lapsed: "danger",
  overdue: "danger",
  expired: "danger",
  rejected: "danger",
  matured: "info",
  closed: "info",
  claimed: "info",
  settled: "info",
  withdrawn: "warning",
  skipped: "warning",
  surrendered: "warning",
  upcoming: "warning",
  sold: "warning",
  in_repair: "warning",
  damaged: "danger",
  lost: "danger",
  stolen: "danger",
  retired: "default",
  filed: "info",
  approved: "success",
  pending: "warning",
}

const variantClasses: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant ?? statusVariantMap[status.toLowerCase()] ?? "default"

  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[resolvedVariant]
      )}
    >
      {label}
    </span>
  )
}
