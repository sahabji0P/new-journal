"use client"

import { useScroll, type MotionValue } from "framer-motion"
import { useRef } from "react"

interface UseSectionScrollOptions {
    offset?: [string, string]
}

interface UseSectionScrollReturn {
    ref: React.RefObject<HTMLDivElement | null>
    progress: MotionValue<number>
}

export function useSectionScroll(options?: UseSectionScrollOptions): UseSectionScrollReturn {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        offset: (options?.offset ?? ["start end", "end start"]) as any,
    })
    return { ref, progress: scrollYProgress }
}
