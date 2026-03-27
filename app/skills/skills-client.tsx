"use client"

import { useState } from "react"
import { useNavPageConfig, DEFAULT_NAV_ITEMS, NAV_ICONS } from "@/lib/nav-context"
import SkillGraphCanvas from "@/components/graph/skill-graph-canvas"
import SkillDetailPanel from "@/components/graph/skill-detail-panel"
import type { GraphNode, SkillGraphData } from "@/lib/skill-graph"

interface Props {
  data: SkillGraphData
}

const LEGEND = [
  { label: "Skills", color: "#a3e635" },
  { label: "Projects", color: "#22d3ee" },
  { label: "Research", color: "#f59e0b" },
  { label: "Experience", color: "#a78bfa" },
] as const

export default function SkillsClient({ data }: Props) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useNavPageConfig({
    navItems: [
      ...DEFAULT_NAV_ITEMS,
      { id: "skills", label: "Skills", href: "/skills", icon: NAV_ICONS.projects },
    ],
    showTOC: false,
    pageTitle: "Skills",
  })

  const handleNodeSelect = (node: GraphNode | null) => {
    setSelectedNode(node)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 px-6 pt-16 pb-4 md:px-10 md:pt-20 md:pb-6">
        <div className="max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-2">
            Skills
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg">
            An interactive map of technologies, projects, research, and experience — drag nodes, scroll to zoom.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-mono text-muted-foreground">{label}</span>
              </div>
            ))}
            <span className="text-xs text-muted-foreground/50 font-mono">
              {data.nodes.length} nodes · {data.edges.length} connections
            </span>
          </div>
        </div>
      </header>

      {/* Graph canvas */}
      <main className="flex-1 relative mx-4 mb-4 md:mx-8 md:mb-6 rounded-2xl overflow-hidden border border-border/30 bg-card/20 backdrop-blur-sm min-h-[400px]">
        <SkillGraphCanvas
          data={data}
          onNodeSelect={handleNodeSelect}
          selectedNode={selectedNode}
        />

        {/* Empty state */}
        {data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground text-sm font-mono">
              No skills data found. Add content to /content/projects, /content/experience, or /content/work.
            </p>
          </div>
        )}
      </main>

      {/* Detail panel */}
      <SkillDetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  )
}
