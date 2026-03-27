"use client"

import { useEffect, useRef, useCallback } from "react"
import type { GraphNode, SkillGraphData } from "@/lib/skill-graph"

interface Props {
  data: SkillGraphData
  onNodeSelect: (node: GraphNode | null) => void
  selectedNode: GraphNode | null
}

// ─── Minimal force-directed simulation ────────────────────────────────────────

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}

interface SimEdge {
  source: SimNode
  target: SimNode
  weight: number
}

function createSimulation(nodes: SimNode[], edges: SimEdge[], width: number, height: number) {
  let alpha = 1
  const alphaDecay = 0.0228
  const alphaMin = 0.001
  const velocityDecay = 0.4

  function tick() {
    if (alpha < alphaMin) return false
    alpha *= 1 - alphaDecay

    // forceCenter
    const cx = width / 2
    const cy = height / 2
    const centerStrength = 0.05
    for (const n of nodes) {
      if (n.fx === null) n.vx += (cx - n.x) * centerStrength * alpha
      if (n.fy === null) n.vy += (cy - n.y) * centerStrength * alpha
    }

    // forceX / forceY (gentle pull toward center)
    const xyStrength = 0.05
    for (const n of nodes) {
      if (n.fx === null) n.vx += (cx - n.x) * xyStrength * alpha
      if (n.fy === null) n.vy += (cy - n.y) * xyStrength * alpha
    }

    // forceManyBody (repulsion)
    const repulsion = -80
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d2 = dx * dx + dy * dy || 1
        const d = Math.sqrt(d2)
        const force = (repulsion / d2) * alpha
        const fx = (dx / d) * force
        const fy = (dy / d) * force
        if (a.fx === null) { a.vx -= fx; a.vy -= fy }
        if (b.fx === null) { b.vx += fx; b.vy += fy }
      }
    }

    // forceLink
    const linkDistance = 100
    for (const edge of edges) {
      const a = edge.source
      const b = edge.target
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const delta = (d - linkDistance) / d * 0.3 * alpha
      const fx = dx * delta
      const fy = dy * delta
      if (a.fx === null) { a.vx += fx; a.vy += fy }
      if (b.fx === null) { b.vx -= fx; b.vy -= fy }
    }

    // forceCollide
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = a.size + b.size + 5
        if (d < minDist) {
          const delta = ((minDist - d) / d) * 0.5
          const fx = dx * delta
          const fy = dy * delta
          if (a.fx === null) { a.vx -= fx; a.vy -= fy }
          if (b.fx === null) { b.vx += fx; b.vy += fy }
        }
      }
    }

    // integrate positions
    for (const n of nodes) {
      if (n.fx !== null) {
        n.x = n.fx
        n.vx = 0
      } else {
        n.vx *= velocityDecay
        n.x += n.vx
      }
      if (n.fy !== null) {
        n.y = n.fy
        n.vy = 0
      } else {
        n.vy *= velocityDecay
        n.y += n.vy
      }
    }

    return true
  }

  return { tick, getAlpha: () => alpha, setAlpha: (v: number) => { alpha = v } }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillGraphCanvas({ data, onNodeSelect, selectedNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    simNodes: SimNode[]
    simEdges: SimEdge[]
    sim: ReturnType<typeof createSimulation> | null
    transform: { x: number; y: number; scale: number }
    hoveredNode: SimNode | null
    selectedNodeId: string | null
    // interaction state
    dragging: SimNode | null
    panning: boolean
    lastMouse: { x: number; y: number }
    width: number
    height: number
    rafId: number | null
    maxEdgeWeight: number
  }>({
    simNodes: [],
    simEdges: [],
    sim: null,
    transform: { x: 0, y: 0, scale: 1 },
    hoveredNode: null,
    selectedNodeId: selectedNode?.id ?? null,
    dragging: null,
    panning: false,
    lastMouse: { x: 0, y: 0 },
    width: 800,
    height: 600,
    rafId: null,
    maxEdgeWeight: 1,
  })

  // sync selectedNode from props
  useEffect(() => {
    stateRef.current.selectedNodeId = selectedNode?.id ?? null
  }, [selectedNode])

  // ── helpers ────────────────────────────────────────────────────────────────
  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const { x, y, scale } = stateRef.current.transform
    return {
      wx: (cx - x) / scale,
      wy: (cy - y) / scale,
    }
  }, [])

  const hitTest = useCallback((wx: number, wy: number): SimNode | null => {
    const nodes = stateRef.current.simNodes
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = wx - n.x
      const dy = wy - n.y
      if (dx * dx + dy * dy <= (n.size + 4) * (n.size + 4)) return n
    }
    return null
  }, [])

  // ── draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { simNodes, simEdges, transform, hoveredNode, selectedNodeId, width, height, maxEdgeWeight } = stateRef.current
    const { x: tx, y: ty, scale } = transform

    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(tx, ty)
    ctx.scale(scale, scale)

    // Collect connected node ids for hover highlighting
    const connectedIds = new Set<string>()
    if (hoveredNode) {
      connectedIds.add(hoveredNode.id)
      for (const e of simEdges) {
        if (e.source.id === hoveredNode.id) connectedIds.add(e.target.id)
        else if (e.target.id === hoveredNode.id) connectedIds.add(e.source.id)
      }
    }

    const hasHover = hoveredNode !== null
    const vMinX = (-tx) / scale
    const vMinY = (-ty) / scale
    const vMaxX = (width - tx) / scale
    const vMaxY = (height - ty) / scale

    const inViewport = (n: SimNode) =>
      n.x + n.size >= vMinX && n.x - n.size <= vMaxX &&
      n.y + n.size >= vMinY && n.y - n.size <= vMaxY

    // Draw edges
    for (const e of simEdges) {
      const edgeOpacity = (e.weight / maxEdgeWeight) * 0.3
      const isHighlighted = hasHover &&
        (e.source.id === hoveredNode?.id || e.target.id === hoveredNode?.id)
      ctx.beginPath()
      ctx.moveTo(e.source.x, e.source.y)
      ctx.lineTo(e.target.x, e.target.y)
      ctx.strokeStyle = isHighlighted
        ? `rgba(255,255,255,${edgeOpacity * 3})`
        : `rgba(255,255,255,${edgeOpacity})`
      ctx.lineWidth = isHighlighted ? 1.5 / scale : 0.8 / scale
      ctx.stroke()
    }

    // Draw nodes
    for (const n of simNodes) {
      if (!inViewport(n)) continue

      const isHovered = n === hoveredNode
      const isSelected = n.id === selectedNodeId
      const isDimmed = hasHover && !connectedIds.has(n.id)

      const alpha = isDimmed ? 0.25 : 1

      ctx.save()
      ctx.globalAlpha = alpha

      // Shadow glow for hovered/selected
      if (isHovered || isSelected) {
        ctx.shadowColor = n.color
        ctx.shadowBlur = 20
      }

      // Node fill
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2)
      ctx.fillStyle = n.color
      ctx.fill()

      // Node stroke
      ctx.strokeStyle = "rgba(255,255,255,0.15)"
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.shadowBlur = 0

      // Selected ring
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.size + 4, 0, Math.PI * 2)
        ctx.strokeStyle = n.color
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Hover ring
      if (isHovered && !isSelected) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.size + 3, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255,255,255,0.5)"
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      ctx.restore()

      // Labels
      const showLabel = n.size > 15 || scale > 1.2 || isHovered || isSelected
      if (showLabel && inViewport(n)) {
        const fontSize = n.size > 20 ? 13 : 10
        ctx.save()
        ctx.globalAlpha = isDimmed ? 0.2 : (isHovered || isSelected ? 1 : 0.75)
        ctx.font = `${fontSize}px "JetBrains Mono", monospace`
        ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "rgba(255,255,255,0.8)"
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        // Truncate long labels
        const label = n.label.length > 18 ? n.label.slice(0, 16) + "…" : n.label
        ctx.fillText(label, n.x, n.y + n.size + 3)
        ctx.restore()
      }
    }

    ctx.restore()
  }, [])

  // ── animation loop ─────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const loop = () => {
      const state = stateRef.current
      const simRunning = state.sim?.tick() ?? false
      draw()
      if (simRunning || state.dragging || state.panning) {
        state.rafId = requestAnimationFrame(loop)
      } else {
        state.rafId = null
      }
    }
    if (!stateRef.current.rafId) {
      stateRef.current.rafId = requestAnimationFrame(loop)
    }
  }, [draw])

  const ensureLoop = useCallback(() => {
    if (!stateRef.current.rafId) startLoop()
  }, [startLoop])

  // ── init simulation ────────────────────────────────────────────────────────
  useEffect(() => {
    const state = stateRef.current
    const { width, height } = state

    // Build simNodes
    const nodeById = new Map<string, SimNode>()
    const simNodes: SimNode[] = data.nodes.map(n => {
      const sn: SimNode = {
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 400,
        y: height / 2 + (Math.random() - 0.5) * 400,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      }
      nodeById.set(n.id, sn)
      return sn
    })

    // Build simEdges
    let maxW = 1
    const simEdges: SimEdge[] = []
    for (const e of data.edges) {
      const s = nodeById.get(e.source)
      const t = nodeById.get(e.target)
      if (s && t) {
        simEdges.push({ source: s, target: t, weight: e.weight })
        if (e.weight > maxW) maxW = e.weight
      }
    }

    state.simNodes = simNodes
    state.simEdges = simEdges
    state.maxEdgeWeight = maxW
    state.sim = createSimulation(simNodes, simEdges, width, height)

    startLoop()

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId)
      state.rafId = null
    }
  }, [data, startLoop])

  // ── resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      canvas.width = width
      canvas.height = height
      stateRef.current.width = width
      stateRef.current.height = height
      if (stateRef.current.sim) {
        stateRef.current.sim.setAlpha(0.3)
      }
      ensureLoop()
    })

    ro.observe(container)

    // Initial size
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    stateRef.current.width = rect.width
    stateRef.current.height = rect.height

    return () => ro.disconnect()
  }, [ensureLoop])

  // ── mouse interaction ──────────────────────────────────────────────────────
  const getCanvasXY = (e: React.MouseEvent | React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top }
  }

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasXY(e)
    const state = stateRef.current

    if (state.dragging) {
      const { wx, wy } = canvasToWorld(cx, cy)
      state.dragging.fx = wx
      state.dragging.fy = wy
      if (state.sim) state.sim.setAlpha(0.3)
      ensureLoop()
      return
    }

    if (state.panning) {
      state.transform.x += cx - state.lastMouse.x
      state.transform.y += cy - state.lastMouse.y
      state.lastMouse = { x: cx, y: cy }
      ensureLoop()
      return
    }

    const { wx, wy } = canvasToWorld(cx, cy)
    const hit = hitTest(wx, wy)
    if (hit !== state.hoveredNode) {
      state.hoveredNode = hit
      canvasRef.current!.style.cursor = hit ? "pointer" : "grab"
      ensureLoop()
    }
  }, [canvasToWorld, hitTest, ensureLoop])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasXY(e)
    const { wx, wy } = canvasToWorld(cx, cy)
    const state = stateRef.current
    const hit = hitTest(wx, wy)

    state.lastMouse = { x: cx, y: cy }

    if (hit) {
      state.dragging = hit
      hit.fx = wx
      hit.fy = wy
    } else {
      state.panning = true
      canvasRef.current!.style.cursor = "grabbing"
    }
  }, [canvasToWorld, hitTest])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasXY(e)
    const state = stateRef.current

    if (state.dragging) {
      // Only select if mouse hasn't moved much (click, not drag)
      const dx = cx - state.lastMouse.x
      const dy = cy - state.lastMouse.y
      const moved = dx * dx + dy * dy > 25
      if (!moved) {
        // release fixed position for dragged node
        state.dragging.fx = null
        state.dragging.fy = null
      }
      // select node
      const node = state.simNodes.find(n => n.id === state.dragging!.id)
      if (node) {
        state.selectedNodeId = node.id
        onNodeSelect(node)
      }
      state.dragging = null
    } else if (state.panning) {
      state.panning = false
      canvasRef.current!.style.cursor = "grab"
    }
  }, [onNodeSelect])

  const onMouseLeave = useCallback(() => {
    const state = stateRef.current
    state.hoveredNode = null
    if (state.dragging) {
      state.dragging.fx = null
      state.dragging.fy = null
      state.dragging = null
    }
    state.panning = false
    ensureLoop()
  }, [ensureLoop])

  const onClick = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasXY(e)
    const { wx, wy } = canvasToWorld(cx, cy)
    const hit = hitTest(wx, wy)
    if (!hit) {
      stateRef.current.selectedNodeId = null
      onNodeSelect(null)
      ensureLoop()
    }
  }, [canvasToWorld, hitTest, onNodeSelect, ensureLoop])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const { cx, cy } = getCanvasXY(e)
    const state = stateRef.current
    const scaleAmount = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.min(3, Math.max(0.3, state.transform.scale * scaleAmount))

    // Zoom toward mouse position
    const wx = (cx - state.transform.x) / state.transform.scale
    const wy = (cy - state.transform.y) / state.transform.scale
    state.transform.x = cx - wx * newScale
    state.transform.y = cy - wy * newScale
    state.transform.scale = newScale
    ensureLoop()
  }, [ensureLoop])

  // ── touch interaction ──────────────────────────────────────────────────────
  const touchState = useRef<{ id: number; startX: number; startY: number; node: SimNode | null } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = touch.clientX - rect.left
    const cy = touch.clientY - rect.top
    const { wx, wy } = canvasToWorld(cx, cy)
    const hit = hitTest(wx, wy)
    touchState.current = { id: touch.identifier, startX: cx, startY: cy, node: hit ?? null }
    if (hit) {
      hit.fx = wx
      hit.fy = wy
    }
  }, [canvasToWorld, hitTest])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchState.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = touch.clientX - rect.left
    const cy = touch.clientY - rect.top
    const { wx, wy } = canvasToWorld(cx, cy)
    const state = stateRef.current

    if (touchState.current.node) {
      touchState.current.node.fx = wx
      touchState.current.node.fy = wy
      if (state.sim) state.sim.setAlpha(0.3)
    } else {
      state.transform.x += cx - touchState.current.startX
      state.transform.y += cy - touchState.current.startY
      touchState.current.startX = cx
      touchState.current.startY = cy
    }
    ensureLoop()
  }, [canvasToWorld, ensureLoop])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return
    const tc = touchState.current
    if (tc.node) {
      // Check if it was a tap (not drag)
      const touch = e.changedTouches[0]
      const rect = canvasRef.current!.getBoundingClientRect()
      const cx = touch.clientX - rect.left
      const cy = touch.clientY - rect.top
      const dx = cx - tc.startX
      const dy = cy - tc.startY
      if (dx * dx + dy * dy < 100) {
        // tap — select
        tc.node.fx = null
        tc.node.fy = null
        stateRef.current.selectedNodeId = tc.node.id
        onNodeSelect(tc.node)
      } else {
        tc.node.fx = null
        tc.node.fy = null
      }
    } else {
      stateRef.current.selectedNodeId = null
      onNodeSelect(null)
    }
    touchState.current = null
    ensureLoop()
  }, [onNodeSelect, ensureLoop])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "none" }}
      />
    </div>
  )
}
