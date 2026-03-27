import { getAllExperiences } from "@/lib/experience-utils"
import { getAllProjects } from "@/lib/project-utils"
import { getAllWork } from "@/lib/work-utils"

export interface GraphNode {
  id: string
  label: string
  type: "skill" | "project" | "research" | "experience"
  size: number
  color: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  metadata: {
    count: number
    description?: string
    usedIn: { type: string; name: string; slug: string }[]
  }
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}

export interface SkillGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const COLORS = {
  skill: "#a3e635",
  project: "#22d3ee",
  research: "#f59e0b",
  experience: "#a78bfa",
}

export function buildSkillGraph(): SkillGraphData {
  const experiences = getAllExperiences()
  const projects = getAllProjects()
  const works = getAllWork()

  // Track skill metadata
  const skillMap = new Map<
    string,
    {
      label: string
      count: number
      usedIn: { type: string; name: string; slug: string }[]
      primarySource: "skill" | "project" | "research" | "experience"
    }
  >()

  const normalizeSkill = (s: string) => s.toLowerCase().trim()

  // Collect skills from experiences
  for (const exp of experiences) {
    for (const skill of exp.skills) {
      const id = normalizeSkill(skill)
      if (!skillMap.has(id)) {
        skillMap.set(id, {
          label: skill,
          count: 0,
          usedIn: [],
          primarySource: "experience",
        })
      }
      const entry = skillMap.get(id)!
      entry.count++
      entry.usedIn.push({ type: "experience", name: exp.company, slug: exp.slug })
    }
  }

  // Collect skills from projects
  for (const project of projects) {
    for (const tech of project.tech) {
      const id = normalizeSkill(tech)
      if (!skillMap.has(id)) {
        skillMap.set(id, {
          label: tech,
          count: 0,
          usedIn: [],
          primarySource: "project",
        })
      }
      const entry = skillMap.get(id)!
      entry.count++
      entry.usedIn.push({ type: "project", name: project.name, slug: project.slug })
    }
  }

  // Collect skills from work (research)
  for (const work of works) {
    for (const tag of work.tags) {
      const id = normalizeSkill(tag)
      if (!skillMap.has(id)) {
        skillMap.set(id, {
          label: tag,
          count: 0,
          usedIn: [],
          primarySource: "research",
        })
      }
      const entry = skillMap.get(id)!
      entry.count++
      entry.usedIn.push({ type: "research", name: work.title, slug: work.slug })
    }
  }

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Create skill nodes
  for (const [id, data] of skillMap.entries()) {
    const size = Math.max(12, Math.min(50, data.count * 8))
    nodes.push({
      id,
      label: data.label,
      type: "skill",
      size,
      color: COLORS.skill,
      metadata: {
        count: data.count,
        usedIn: data.usedIn,
      },
    })
  }

  // Create experience nodes + edges
  for (const exp of experiences) {
    const nodeId = `experience-${exp.slug}`
    nodes.push({
      id: nodeId,
      label: exp.company,
      type: "experience",
      size: 30,
      color: COLORS.experience,
      metadata: {
        count: exp.skills.length,
        description: exp.role,
        usedIn: [],
      },
    })
    for (const skill of exp.skills) {
      const skillId = normalizeSkill(skill)
      edges.push({ source: skillId, target: nodeId, weight: 1 })
    }
  }

  // Create project nodes + edges
  for (const project of projects) {
    const nodeId = `project-${project.slug}`
    nodes.push({
      id: nodeId,
      label: project.name,
      type: "project",
      size: 30,
      color: COLORS.project,
      metadata: {
        count: project.tech.length,
        description: project.shortDescription,
        usedIn: [],
      },
    })
    for (const tech of project.tech) {
      const skillId = normalizeSkill(tech)
      edges.push({ source: skillId, target: nodeId, weight: 1 })
    }
  }

  // Create research (work) nodes + edges
  for (const work of works) {
    const nodeId = `research-${work.slug}`
    nodes.push({
      id: nodeId,
      label: work.title,
      type: "research",
      size: 30,
      color: COLORS.research,
      metadata: {
        count: work.tags.length,
        description: work.description,
        usedIn: [],
      },
    })
    for (const tag of work.tags) {
      const skillId = normalizeSkill(tag)
      edges.push({ source: skillId, target: nodeId, weight: 1 })
    }
  }

  // Deduplicate edges and accumulate weights
  const edgeMap = new Map<string, GraphEdge>()
  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join("||")
    if (edgeMap.has(key)) {
      edgeMap.get(key)!.weight++
    } else {
      edgeMap.set(key, { ...edge })
    }
  }

  return {
    nodes,
    edges: Array.from(edgeMap.values()),
  }
}
