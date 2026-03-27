"use client"

import { useRef } from "react"
import { motion } from "framer-motion"

interface DiagramEdgeProps {
  fromPos: { x: number; y: number }
  toPos: { x: number; y: number }
  label?: string
  style?: "solid" | "dashed" | "animated"
  color: string
  index: number
  isVisible: boolean
  edgeId: string
}

function getEdgePath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const isMoreHorizontal = Math.abs(dx) >= Math.abs(dy)

  let cx1: number, cy1: number, cx2: number, cy2: number

  if (isMoreHorizontal) {
    // Horizontal dominant: curve vertically
    cx1 = from.x + dx * 0.5
    cy1 = from.y
    cx2 = from.x + dx * 0.5
    cy2 = to.y
  } else {
    // Vertical dominant: curve horizontally
    cx1 = from.x
    cy1 = from.y + dy * 0.5
    cx2 = to.x
    cy2 = from.y + dy * 0.5
  }

  return `M ${from.x} ${from.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${to.x} ${to.y}`
}

function getMidpoint(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  }
}

export function DiagramEdge({
  fromPos,
  toPos,
  label,
  style = "solid",
  color,
  index,
  isVisible,
  edgeId,
}: DiagramEdgeProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const markerId = `arrow-${edgeId}`
  const pathD = getEdgePath(fromPos, toPos)
  const mid = getMidpoint(fromPos, toPos)

  // pathRef used for invisible path measurement — getTotalLength available if needed
  void pathRef

  const drawDelay = 0.5 + index * 0.2
  const labelDelay = drawDelay + 0.4
  const flowDelay = 1.5

  // Final dash array for dashed style
  const finalDashArray = style === "dashed" ? "8 4" : "none"

  return (
    <g>
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill={color} fillOpacity={0.6} />
        </marker>
      </defs>

      {/* Invisible path for length measurement */}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke="none"
      />

      {/* Animated draw path */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="white"
        strokeOpacity={0.2}
        strokeWidth={1.5}
        strokeDasharray={style === "dashed" ? "8 4" : undefined}
        markerEnd={`url(#${markerId})`}
        initial={{
          pathLength: 0,
          opacity: 0,
        }}
        animate={
          isVisible
            ? {
                pathLength: 1,
                opacity: 1,
                strokeDasharray: finalDashArray === "none" ? undefined : finalDashArray,
              }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{
          pathLength: {
            delay: drawDelay,
            duration: 0.6,
            ease: "easeInOut",
          },
          opacity: {
            delay: drawDelay,
            duration: 0.2,
          },
        }}
      />

      {/* Edge label */}
      {label && (
        <motion.text
          x={mid.x}
          y={mid.y - 8}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={10}
          fontFamily="monospace"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: labelDelay, duration: 0.3 }}
        >
          {label}
        </motion.text>
      )}

      {/* Animated flow dot for "animated" style edges */}
      {style === "animated" && (
        <motion.circle
          r={4}
          fill={color}
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 0.9 } : { opacity: 0 }}
          transition={{ delay: flowDelay, duration: 0.3 }}
        >
          {isVisible && (
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin={`${flowDelay}s`}
              path={pathD}
            />
          )}
        </motion.circle>
      )}
    </g>
  )
}
