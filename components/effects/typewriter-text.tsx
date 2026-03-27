"use client"

import { cn } from "@/lib/utils"
import { useEffect, useMemo, useRef, useState } from "react"

interface TypewriterTextProps {
    text: string | string[]
    speed?: number
    delay?: number
    cursor?: boolean
    cursorChar?: string
    onComplete?: () => void
    className?: string
    reducedMotion?: boolean
}

export function TypewriterText({
    text,
    speed = 30,
    delay = 0,
    cursor = true,
    cursorChar = "|",
    onComplete,
    className,
    reducedMotion = false,
}: TypewriterTextProps) {
    const segments = useMemo(() => (Array.isArray(text) ? text : [text]), [text])
    const fullText = useMemo(() => segments.join("\n"), [segments])
    const [output, setOutput] = useState(reducedMotion ? fullText : "")
    const [isDone, setIsDone] = useState(reducedMotion)
    const onCompleteRef = useRef(onComplete)
    useEffect(() => { onCompleteRef.current = onComplete })

    useEffect(() => {
        if (reducedMotion) {
            setOutput(fullText)
            setIsDone(true)
            onCompleteRef.current?.()
            return
        }

        setIsDone(false)
        let frameId = 0
        let timeoutId = 0
        let startTime = 0
        let completed = false

        const tick = (now: number) => {
            if (startTime === 0) {
                startTime = now
            }

            const elapsed = now - startTime
            const totalChars = Math.min(fullText.length, Math.floor(elapsed / speed))
            const nextValue = fullText.slice(0, totalChars)
            setOutput(nextValue)

            if (totalChars >= fullText.length) {
                if (!completed) {
                    completed = true
                    setIsDone(true)
                    onCompleteRef.current?.()
                }
                return
            }

            frameId = window.requestAnimationFrame(tick)
        }

        timeoutId = window.setTimeout(() => {
            frameId = window.requestAnimationFrame(tick)
        }, delay)

        return () => {
            window.clearTimeout(timeoutId)
            window.cancelAnimationFrame(frameId)
        }
    }, [delay, fullText, reducedMotion, speed])

    return (
        <span className={cn("whitespace-pre-line", className)}>
            {output}
            {cursor && (
                <span
                    className={cn(
                        "ml-1 inline-block text-lime-400",
                        reducedMotion ? "opacity-70" : isDone ? "opacity-0 transition-opacity duration-1000" : "animate-pulse"
                    )}
                    aria-hidden="true"
                >
                    {cursorChar}
                </span>
            )}
        </span>
    )
}
