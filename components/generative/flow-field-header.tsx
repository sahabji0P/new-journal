"use client"

import { seededNoise2D, seededRandom } from "@/lib/generative/noise"
import { useEffect, useRef } from "react"

type ColorScheme = "lime" | "cyan" | "amber" | "mixed"

interface ColorRGB {
  r: number
  g: number
  b: number
}

const COLOR_MAP: Record<Exclude<ColorScheme, "mixed">, ColorRGB> = {
  lime: { r: 163, g: 230, b: 53 },
  cyan: { r: 34, g: 211, b: 238 },
  amber: { r: 251, g: 191, b: 36 },
}

const MIXED_COLORS: ColorRGB[] = [
  COLOR_MAP.lime,
  COLOR_MAP.cyan,
  COLOR_MAP.amber,
]

interface FlowFieldHeaderProps {
  seed: number
  complexity: number
  particleCount: number
  colorScheme: ColorScheme
  height?: number
  className?: string
}

export function FlowFieldHeader({
  seed,
  complexity,
  particleCount,
  colorScheme,
  height = 200,
  className,
}: FlowFieldHeaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Detect prefers-reduced-motion
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2)
    const cssWidth = canvas.offsetWidth
    const cssHeight = height

    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.scale(dpr, dpr)

    const noise = seededNoise2D(seed)
    const rand = seededRandom(seed + 1)

    const count = prefersReduced ? 50 : particleCount
    const steps = prefersReduced ? 30 : Math.floor(60 + rand() * 40)
    const noiseScale = 0.003 * complexity

    // Pick a color for each particle
    function pickColor(index: number): ColorRGB {
      if (colorScheme !== "mixed") return COLOR_MAP[colorScheme]
      return MIXED_COLORS[index % MIXED_COLORS.length]
    }

    ctx.clearRect(0, 0, cssWidth, cssHeight)

    for (let i = 0; i < count; i++) {
      const color = pickColor(i)
      const lineWidth = 0.5 + rand() * 1.0
      const alpha = 0.03 + rand() * 0.05

      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.beginPath()

      let x = rand() * cssWidth
      let y = rand() * cssHeight

      ctx.moveTo(x, y)

      for (let step = 0; step < steps; step++) {
        const noiseVal = noise(x * noiseScale, y * noiseScale)
        const angle = noiseVal * Math.PI * 2
        const speed = 1.0 + rand() * 1.0

        const prevX = x
        const prevY = y
        x += Math.cos(angle) * speed
        y += Math.sin(angle) * speed

        // Wrap around edges to keep particles in bounds
        if (x < 0) x += cssWidth
        if (x > cssWidth) x -= cssWidth
        if (y < 0) y += cssHeight
        if (y > cssHeight) y -= cssHeight

        // If we wrapped, start a new sub-path to avoid long diagonal lines
        const jumped =
          Math.abs(x - prevX) > cssWidth * 0.5 ||
          Math.abs(y - prevY) > cssHeight * 0.5
        if (jumped) {
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()
    }
  }, [seed, complexity, particleCount, colorScheme, height])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        opacity: 0.12,
        mixBlendMode: "screen",
        pointerEvents: "none",
        display: "block",
      }}
      className={className}
      aria-hidden="true"
    />
  )
}
