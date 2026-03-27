"use client"

import { useEffect, useState } from "react"

interface ReducedMotionState {
    reducedMotion: boolean
    lowPower: boolean
    shouldReduceEffects: boolean
}

function getMotionPreference(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function getLowPowerPreference(): boolean {
    if (typeof navigator === "undefined") {
        return false
    }

    return typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency < 4
}

export function useReducedMotion(): ReducedMotionState {
    const [reducedMotion, setReducedMotion] = useState(false)
    const [lowPower, setLowPower] = useState(false)

    useEffect(() => {
        setReducedMotion(getMotionPreference())
        setLowPower(getLowPowerPreference())

        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return
        }

        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
        const handleChange = (event: MediaQueryListEvent) => {
            setReducedMotion(event.matches)
        }

        mediaQuery.addEventListener("change", handleChange)

        return () => {
            mediaQuery.removeEventListener("change", handleChange)
        }
    }, [])

    return {
        reducedMotion,
        lowPower,
        shouldReduceEffects: reducedMotion || lowPower,
    }
}
