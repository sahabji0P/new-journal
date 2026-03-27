"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"
import { lazy, Suspense, type ReactNode } from "react"

interface ParticleHeroProps {
    children: ReactNode
    className?: string
    reducedMotion?: boolean
}

const LazyParticleField = lazy(() => import("@/components/hero/particle-field"))

function ParticleFallback({ shouldReduceEffects }: { shouldReduceEffects: boolean }) {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(163,230,53,0.22),transparent_42%),radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.18),transparent_35%),linear-gradient(180deg,rgba(9,11,15,0.84),rgba(9,11,15,0.96))]" />
            <div
                className={cn(
                    "absolute inset-x-[8%] top-[12%] h-64 rounded-full blur-3xl",
                    shouldReduceEffects ? "bg-lime-400/10" : "animate-pulse bg-lime-400/15"
                )}
            />
            <div
                className={cn(
                    "absolute bottom-[8%] right-[10%] h-56 w-56 rounded-full blur-3xl",
                    shouldReduceEffects ? "bg-cyan-400/10" : "animate-pulse bg-cyan-400/15"
                )}
                style={shouldReduceEffects ? undefined : { animationDuration: "4s" }}
            />
        </div>
    )
}

export function ParticleHero({ children, className, reducedMotion }: ParticleHeroProps) {
    const motionState = useReducedMotion()
    const shouldReduceEffects = reducedMotion ?? motionState.shouldReduceEffects
    const lowPower = motionState.lowPower
    const renderCanvas = !shouldReduceEffects && !lowPower

    return (
        <section
            id="intro"
            className={cn(
                "relative isolate overflow-hidden border-b border-border/70 pt-0",
                className
            )}
        >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,16,0.88),rgba(10,12,16,0.98))]" />
            {renderCanvas ? (
                <div className="absolute inset-0">
                    <Suspense fallback={<ParticleFallback shouldReduceEffects={shouldReduceEffects} />}>
                        <LazyParticleField reducedMotion={shouldReduceEffects} />
                    </Suspense>
                </div>
            ) : (
                <ParticleFallback shouldReduceEffects={shouldReduceEffects} />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,10,0.14)_58%,rgba(5,7,10,0.62)_100%)]" />
            <div className="relative pointer-events-auto">{children}</div>
        </section>
    )
}
