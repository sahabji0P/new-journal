"use client"

import type { ReactNode } from "react"

interface ScrollNarrativeProps {
    children: ReactNode
}

export function ScrollNarrative({ children }: ScrollNarrativeProps) {
    return (
        <div id="narrative" className="relative">
            {children}
        </div>
    )
}
