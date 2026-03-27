"use client"
import { useEffect, useRef, useState } from "react"

interface UseCountUpOptions {
  duration?: number
  delay?: number
  decimals?: number
}

export function useCountUp(target: number, options?: UseCountUpOptions): number {
  const duration = options?.duration ?? 1500
  const delay = options?.delay ?? 0
  const decimals = options?.decimals ?? 0

  const [value, setValue] = useState(0)
  const startValueRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef(target)

  useEffect(() => {
    startValueRef.current = value
    targetRef.current = target

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const current = startValueRef.current + (targetRef.current - startValueRef.current) * easedProgress

      const factor = Math.pow(10, decimals)
      setValue(Math.round(current * factor) / factor)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    startTimeRef.current = null

    const timeoutId = setTimeout(() => {
      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay, decimals])

  return value
}
