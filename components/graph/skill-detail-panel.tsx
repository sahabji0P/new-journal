"use client"

import { AnimatePresence, motion } from "framer-motion"
import { X, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { GraphNode } from "@/lib/skill-graph"

interface Props {
  node: GraphNode | null
  onClose: () => void
  allNodes?: GraphNode[]
}

const TYPE_LABELS: Record<string, string> = {
  experience: "Experience",
  project: "Project",
  research: "Research",
}

const TYPE_COLORS: Record<string, string> = {
  skill: "#a3e635",
  project: "#22d3ee",
  research: "#f59e0b",
  experience: "#a78bfa",
}

const TYPE_BG: Record<string, string> = {
  skill: "bg-lime-400/10 text-lime-400 border-lime-400/20",
  project: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  research: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  experience: "bg-violet-400/10 text-violet-400 border-violet-400/20",
}

const ITEM_HREF: Record<string, string> = {
  experience: "/experience",
  project: "/projects",
  research: "/work",
}

function NodeLink({ type, slug, name }: { type: string; slug: string; name: string }) {
  const base = ITEM_HREF[type] ?? "/"
  const colorClass = TYPE_BG[type] ?? ""
  return (
    <Link
      href={`${base}/${slug}`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono transition-opacity hover:opacity-80 ${colorClass}`}
    >
      {name}
      <ExternalLink className="w-3 h-3 opacity-60" />
    </Link>
  )
}

function SkillNodeContent({ node }: { node: GraphNode }) {
  // Group usedIn by type
  const byType: Record<string, typeof node.metadata.usedIn> = {}
  for (const item of node.metadata.usedIn) {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type].push(item)
  }

  return (
    <div className="space-y-5">
      {/* Frequency bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Frequency</span>
          <span className="text-xs font-mono" style={{ color: node.color }}>
            {node.metadata.count} {node.metadata.count === 1 ? "use" : "uses"}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: node.color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (node.metadata.count / 6) * 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Used in */}
      {Object.keys(byType).length > 0 && (
        <div className="space-y-4">
          {Object.entries(byType).map(([type, items]) => (
            <div key={type}>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">
                {TYPE_LABELS[type] ?? type}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map(item => (
                  <NodeLink key={`${item.type}-${item.slug}`} type={item.type} slug={item.slug} name={item.name} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemNodeContent({ node }: { node: GraphNode }) {
  const baseHref = ITEM_HREF[node.type] ?? "/"
  // Extract slug from id (format: "type-slug")
  const slug = node.id.replace(`${node.type}-`, "")

  return (
    <div className="space-y-5">
      {node.metadata.description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {node.metadata.description}
        </p>
      )}

      {node.metadata.usedIn.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-2">
            Related Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {node.metadata.usedIn.map(item => (
              <span
                key={item.name}
                className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono bg-lime-400/10 text-lime-400 border-lime-400/20"
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`${baseHref}/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-mono text-foreground/70 hover:text-foreground transition-colors group"
      >
        View details
        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  )
}

export default function SkillDetailPanel({ node, onClose }: Props) {
  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop (mobile) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className={[
              "fixed z-30",
              // Desktop: right side panel
              "md:right-4 md:top-20 md:bottom-4 md:w-80",
              // Mobile: bottom sheet
              "bottom-0 left-0 right-0 max-h-[55vh] md:max-h-none md:left-auto",
              "rounded-t-2xl md:rounded-2xl",
              "bg-card/80 backdrop-blur-xl border border-border/50",
              "flex flex-col overflow-hidden",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 pb-3 border-b border-border/30">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[node.type] }}
                  />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {node.type}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-foreground truncate" title={node.label}>
                  {node.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-white/10">
              {node.type === "skill" ? (
                <SkillNodeContent node={node} />
              ) : (
                <ItemNodeContent node={node} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
