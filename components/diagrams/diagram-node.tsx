"use client"

import { motion } from "framer-motion"
import { DiagramNode, NODE_COLORS } from "@/lib/diagrams/project-diagrams"

interface DiagramNodeProps {
  node: DiagramNode
  svgX: number
  svgY: number
  index: number
  isVisible: boolean
}

const NODE_WIDTH = 120
const NODE_HEIGHT = 50

export function DiagramNodeComponent({ node, svgX, svgY, index, isVisible }: DiagramNodeProps) {
  const color = NODE_COLORS[node.type]

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.6 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
      transition={{
        delay: index * 0.15,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      style={{ transformOrigin: `${svgX}px ${svgY}px` }}
    >
      {/* Glow effect */}
      <rect
        x={svgX - NODE_WIDTH / 2 - 2}
        y={svgY - NODE_HEIGHT / 2 - 2}
        width={NODE_WIDTH + 4}
        height={NODE_HEIGHT + 4}
        rx={14}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.2}
      />
      {/* Background rect */}
      <rect
        x={svgX - NODE_WIDTH / 2}
        y={svgY - NODE_HEIGHT / 2}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={12}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeOpacity={0.5}
        strokeWidth={1}
      />
      {/* Label */}
      <text
        x={svgX}
        y={svgY + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={13}
        fontFamily="inherit"
        fontWeight={400}
      >
        {node.label}
      </text>
      {/* Type badge */}
      <text
        x={svgX}
        y={svgY + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize={9}
        fontFamily="monospace"
        opacity={0.8}
      >
        {node.type}
      </text>
    </motion.g>
  )
}
