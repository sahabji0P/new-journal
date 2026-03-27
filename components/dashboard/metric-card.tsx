"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface MetricCardProps {
  title: string
  className?: string
  children: ReactNode
  delay?: number
}

export function MetricCard({ title, className, children, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-5 flex flex-col gap-3",
        className
      )}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {title}
      </p>
      {children}
    </motion.div>
  )
}
