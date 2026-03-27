export interface DiagramNode {
  id: string
  label: string
  type: "frontend" | "api" | "service" | "database" | "ml-model" | "queue" | "cache" | "external"
  x: number // percentage 0-100
  y: number // percentage 0-100
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
  style?: "solid" | "dashed" | "animated"
}

export interface DiagramData {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  title: string
}

// Color map for node types
export const NODE_COLORS: Record<DiagramNode["type"], string> = {
  frontend: "#22d3ee",   // cyan-400
  api: "#a3e635",        // lime-400
  service: "#fbbf24",    // amber-400
  database: "#a78bfa",   // violet-400
  "ml-model": "#f472b6", // pink-400
  queue: "#fb923c",      // orange-400
  cache: "#38bdf8",      // sky-400
  external: "#9ca3af",   // gray-400
}

// Diagrams for each project
const DIAGRAMS: Record<string, DiagramData> = {
  "neural-canvas": {
    title: "Neural Canvas Architecture",
    nodes: [
      { id: "ui", label: "React UI", type: "frontend", x: 10, y: 50 },
      { id: "api", label: "FastAPI", type: "api", x: 35, y: 50 },
      { id: "model", label: "PyTorch Model", type: "ml-model", x: 60, y: 25 },
      { id: "queue", label: "Task Queue", type: "queue", x: 60, y: 75 },
      { id: "db", label: "PostgreSQL", type: "database", x: 85, y: 50 },
    ],
    edges: [
      { from: "ui", to: "api", label: "REST" },
      { from: "api", to: "model", label: "Inference", style: "animated" },
      { from: "api", to: "queue", label: "Async Jobs", style: "dashed" },
      { from: "model", to: "db", label: "Results" },
      { from: "queue", to: "db", label: "Store" },
    ],
  },
  "quantum-analytics": {
    title: "Quantum Analytics Pipeline",
    nodes: [
      { id: "ingest", label: "Data Ingestion", type: "service", x: 10, y: 50 },
      { id: "transform", label: "Transform", type: "service", x: 35, y: 30 },
      { id: "cache", label: "Redis Cache", type: "cache", x: 35, y: 70 },
      { id: "viz", label: "D3.js Frontend", type: "frontend", x: 60, y: 50 },
      { id: "db", label: "TimescaleDB", type: "database", x: 85, y: 50 },
    ],
    edges: [
      { from: "ingest", to: "transform", label: "Stream" },
      { from: "ingest", to: "cache", label: "Hot Data", style: "dashed" },
      { from: "transform", to: "db", label: "Store" },
      { from: "cache", to: "viz", label: "Real-time", style: "animated" },
      { from: "db", to: "viz", label: "Query" },
    ],
  },
  "realtime-collab": {
    title: "Real-time Collaboration System",
    nodes: [
      { id: "client", label: "React Client", type: "frontend", x: 10, y: 50 },
      { id: "ws", label: "WebSocket Server", type: "api", x: 35, y: 30 },
      { id: "crdt", label: "CRDT Engine", type: "service", x: 35, y: 70 },
      { id: "sync", label: "Sync Service", type: "service", x: 60, y: 50 },
      { id: "db", label: "MongoDB", type: "database", x: 85, y: 50 },
    ],
    edges: [
      { from: "client", to: "ws", label: "WebSocket", style: "animated" },
      { from: "client", to: "crdt", label: "Local Ops" },
      { from: "ws", to: "sync", label: "Broadcast" },
      { from: "crdt", to: "sync", label: "Merge", style: "dashed" },
      { from: "sync", to: "db", label: "Persist" },
    ],
  },
}

export function getDiagramForProject(slug: string): DiagramData | null {
  return DIAGRAMS[slug] ?? null
}
