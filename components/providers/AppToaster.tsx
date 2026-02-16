"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Toaster } from "sileo"
import { toast } from "@/lib/toast"

type SwipeState = {
  toastEl: HTMLElement
  pointerId: number
  startX: number
  startY: number
}

const HORIZONTAL_DISMISS_THRESHOLD_PX = 32

const getToastIdFromElement = (toastEl: HTMLElement): string | null => {
  const filterNode = toastEl.querySelector("[id^='sileo-gooey-']") as HTMLElement | null
  if (!filterNode?.id.startsWith("sileo-gooey-")) return null
  return filterNode.id.slice("sileo-gooey-".length)
}

export function AppToaster() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"
  const swipeRef = useRef<SwipeState | null>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      const toastEl = target.closest("[data-sileo-toast]") as HTMLElement | null
      if (!toastEl) return

      swipeRef.current = {
        toastEl,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      const swipe = swipeRef.current
      if (!swipe || swipe.pointerId !== event.pointerId) return

      const dx = event.clientX - swipe.startX
      const dy = event.clientY - swipe.startY
      swipeRef.current = null

      if (Math.abs(dx) < HORIZONTAL_DISMISS_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
        return
      }

      const toastId = getToastIdFromElement(swipe.toastEl)
      if (toastId) {
        toast.dismiss(toastId)
      }
    }

    const onPointerCancel = () => {
      swipeRef.current = null
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("pointerup", onPointerUp, true)
    document.addEventListener("pointercancel", onPointerCancel, true)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointerup", onPointerUp, true)
      document.removeEventListener("pointercancel", onPointerCancel, true)
    }
  }, [])

  return (
    <Toaster
      position="top-right"
      offset={12}
      options={{
        duration: 5500,
        // Use hex values for SVG fill compatibility across browsers.
        fill: isDark ? "#171A20" : "#F8FAFC",
        roundness: 16,
        autopilot: { expand: 150, collapse: 3600 },
        styles: {
          title: "font-medium tracking-tight",
          description: isDark ? "text-sm leading-5 text-zinc-200" : "text-sm leading-5 text-zinc-700",
          button: "font-medium",
        },
      }}
    />
  )
}
