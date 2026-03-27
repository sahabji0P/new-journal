"use client"

import { useInView } from "framer-motion"
import { useRef } from "react"
import { DiagramNodeComponent } from "@/components/diagrams/diagram-node"
import { DiagramEdge } from "@/components/diagrams/diagram-edge"
import type { DiagramData } from "@/lib/diagrams/project-diagrams"
import { NODE_COLORS } from "@/lib/diagrams/project-diagrams"

interface ArchitectureDiagramProps {
  diagram: DiagramData
  className?: string
}

const SVG_WIDTH = 1000
const SVG_HEIGHT = 500

function toSvgPos(xPercent: number, yPercent: number) {
  return {
    x: (xPercent / 100) * SVG_WIDTH,
    y: (yPercent / 100) * SVG_HEIGHT,
  }
}

export function ArchitectureDiagram({ diagram, className }: ArchitectureDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-100px" })

  const nodePositions = new Map<string, { x: number; y: number }>()
  for (const node of diagram.nodes) {
    nodePositions.set(node.id, toSvgPos(node.x, node.y))
  }

  return (
    <div ref={containerRef} className={className}>
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {diagram.title}
      </p>
      <div className="overflow-hidden rounded-xl border border-border/30 bg-card/20 backdrop-blur-sm">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Architecture diagram: ${diagram.title}`}
        >
          {/* Edges */}
          {diagram.edges.map((edge, i) => {
            const from = nodePositions.get(edge.from)
            const to = nodePositions.get(edge.to)
            if (!from || !to) return null

            const sourceNode = diagram.nodes.find(n => n.id === edge.from)
            const color = sourceNode ? NODE_COLORS[sourceNode.type] : "#ffffff"

            return (
              <DiagramEdge
                key={`${edge.from}-${edge.to}`}
                edgeId={`${edge.from}-${edge.to}`}
                fromPos={from}
                toPos={to}
                label={edge.label}
                style={edge.style}
                color={color}
                index={i}
                isVisible={isInView}
              />
            )
          })}

          {/* Nodes */}
          {diagram.nodes.map((node, i) => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null

            return (
              <DiagramNodeComponent
                key={node.id}
                node={node}
                svgX={pos.x}
                svgY={pos.y}
                index={i}
                isVisible={isInView}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
