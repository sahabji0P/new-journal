"use client"

import { Toaster } from "sileo"

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      offset={12}
      options={{
        duration: 5500,
        roundness: 16,
        autopilot: { expand: 150, collapse: 3600 },
        styles: {
          title: "font-medium tracking-tight",
          description: "text-sm leading-5 text-foreground/90",
          button: "font-medium",
        },
      }}
    />
  )
}
