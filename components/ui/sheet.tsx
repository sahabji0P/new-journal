"use client"

import * as React from "react"

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </>
  )
}

interface SheetContentProps {
  side?: "left" | "right" | "top" | "bottom"
  className?: string
  children: React.ReactNode
}

export function SheetContent({ side = "right", className = "", children }: SheetContentProps) {
  const sideClasses = {
    right: "right-0 top-0 h-full border-l animate-in slide-in-from-right",
    left: "left-0 top-0 h-full border-r animate-in slide-in-from-left",
    top: "top-0 left-0 w-full border-b animate-in slide-in-from-top",
    bottom: "bottom-0 left-0 w-full border-t animate-in slide-in-from-bottom",
  }

  return (
    <div className={`fixed z-50 bg-background shadow-lg ${sideClasses[side]} ${className}`}>
      {children}
    </div>
  )
}

interface SheetHeaderProps {
  className?: string
  children: React.ReactNode
}

export function SheetHeader({ className = "", children }: SheetHeaderProps) {
  return <div className={`flex flex-col space-y-2 ${className}`}>{children}</div>
}

interface SheetTitleProps {
  className?: string
  children: React.ReactNode
}

export function SheetTitle({ className = "", children }: SheetTitleProps) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>
}

interface SheetDescriptionProps {
  className?: string
  children: React.ReactNode
}

export function SheetDescription({ className = "", children }: SheetDescriptionProps) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
}
