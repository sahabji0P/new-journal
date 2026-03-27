"use client"

import { cn } from "@/lib/utils"
import { useEffect, useMemo, useRef, useState } from "react"

interface SplitFlapTextProps {
    text: string
    speed?: number
    cyclesPerChar?: number
    charset?: string
    triggerOnView?: boolean
    delay?: number
    className?: string
    reducedMotion?: boolean
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

export function SplitFlapText({
    text,
    speed = 60,
    cyclesPerChar = 4,
    charset = DEFAULT_CHARSET,
    triggerOnView = true,
    delay = 0,
    className,
    reducedMotion = false,
}: SplitFlapTextProps) {
    const [displayChars, setDisplayChars] = useState(() => text.split(""))
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [hasStarted, setHasStarted] = useState(!triggerOnView)
    const containerRef = useRef<HTMLSpanElement | null>(null)

    useEffect(() => {
        if (!triggerOnView || reducedMotion) {
            setHasStarted(true)
            return
        }

        const node = containerRef.current
        if (!node || typeof IntersectionObserver === "undefined") {
            setHasStarted(true)
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setHasStarted(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.5 }
        )

        observer.observe(node)

        return () => observer.disconnect()
    }, [reducedMotion, triggerOnView])

    useEffect(() => {
        if (!hasStarted) {
            return
        }

        if (reducedMotion) {
            setDisplayChars(text.split(""))
            setActiveIndex(null)
            return
        }

        setDisplayChars(text.split("").map((char) => (char === " " ? " " : charset[0] ?? char)))

        let cancelled = false
        const timers: number[] = []

        const startAnimation = () => {
            let elapsedDelay = 0

            text.split("").forEach((char, index) => {
                if (char === " ") {
                    timers.push(
                        window.setTimeout(() => {
                            if (cancelled) return
                            setDisplayChars((current) => {
                                const next = [...current]
                                next[index] = " "
                                return next
                            })
                        }, elapsedDelay)
                    )
                    elapsedDelay += speed
                    return
                }

                for (let cycle = 0; cycle < cyclesPerChar; cycle += 1) {
                    timers.push(
                        window.setTimeout(() => {
                            if (cancelled) return
                            setActiveIndex(index)
                            setDisplayChars((current) => {
                                const next = [...current]
                                next[index] = charset[Math.floor(Math.random() * charset.length)] ?? char
                                return next
                            })
                        }, elapsedDelay + cycle * Math.max(16, Math.floor(speed / Math.max(cyclesPerChar, 1))))
                    )
                }

                timers.push(
                    window.setTimeout(() => {
                        if (cancelled) return
                        setDisplayChars((current) => {
                            const next = [...current]
                            next[index] = char
                            return next
                        })
                        setActiveIndex((current) => (current === index ? null : current))
                    }, elapsedDelay + speed)
                )

                elapsedDelay += speed
            })

            timers.push(
                window.setTimeout(() => {
                    if (cancelled) return
                    setActiveIndex(null)
                }, elapsedDelay + 24)
            )
        }

        const startTimer = window.setTimeout(startAnimation, delay)
        timers.push(startTimer)

        return () => {
            cancelled = true
            timers.forEach((timer) => window.clearTimeout(timer))
        }
    }, [charset, cyclesPerChar, delay, hasStarted, reducedMotion, speed, text])

    const resolvedText = useMemo(() => text.split(""), [text])

    return (
        <span ref={containerRef} className={cn("inline-flex flex-wrap font-mono", className)} aria-label={text}>
            {displayChars.map((char, index) => {
                const isResolved = char === resolvedText[index]
                const isActive = activeIndex === index && !isResolved

                return (
                    <span
                        key={`${resolvedText[index]}-${index}`}
                        className={cn(
                            "transition-colors duration-150",
                            isActive && "text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.45)]",
                            isResolved ? "text-foreground" : "text-muted-foreground/70"
                        )}
                        aria-hidden="true"
                    >
                        {char === " " ? "\u00A0" : char}
                    </span>
                )
            })}
        </span>
    )
}
