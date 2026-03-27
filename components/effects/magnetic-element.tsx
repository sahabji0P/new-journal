"use client"

import { cn } from "@/lib/utils"
import { motion, useMotionValue, useSpring } from "framer-motion"
import type { ReactNode } from "react"
import { useRef } from "react"

interface MagneticElementProps {
    children: ReactNode
    className?: string
    strength?: number
    radius?: number
    disabled?: boolean
}

export function MagneticElement({
    children,
    className,
    strength = 0.3,
    radius = 100,
    disabled = false,
}: MagneticElementProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const springX = useSpring(x, { stiffness: 220, damping: 26, mass: 0.4 })
    const springY = useSpring(y, { stiffness: 220, damping: 26, mass: 0.4 })

    const reset = () => {
        x.set(0)
        y.set(0)
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (disabled || !containerRef.current) {
            return
        }

        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const deltaX = event.clientX - centerX
        const deltaY = event.clientY - centerY
        const distance = Math.hypot(deltaX, deltaY)

        if (distance > radius) {
            reset()
            return
        }

        const influence = 1 - distance / radius
        x.set(deltaX * strength * influence)
        y.set(deltaY * strength * influence)
    }

    return (
        <motion.div
            ref={containerRef}
            className={cn("inline-flex", className)}
            style={{ x: springX, y: springY }}
            onPointerMove={handlePointerMove}
            onPointerLeave={reset}
        >
            {children}
        </motion.div>
    )
}
