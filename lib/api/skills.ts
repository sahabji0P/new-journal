import { getAllExperiences } from "@/lib/experience-utils"
import { getAllProjects } from "@/lib/project-utils"
import { getAllWork } from "@/lib/work-utils"

export interface AggregatedSkill {
  name: string
  count: number
  sources: string[]
}

export function aggregateSkills(): AggregatedSkill[] {
  const experiences = getAllExperiences()
  const projects = getAllProjects()
  const research = getAllWork()

  const skillMap = new Map<string, { name: string; count: number; sources: Set<string> }>()

  const add = (name: string, source: string) => {
    const key = name.toLowerCase()
    const entry = skillMap.get(key) ?? { name, count: 0, sources: new Set<string>() }
    entry.count += 1
    entry.sources.add(source)
    skillMap.set(key, entry)
  }

  for (const exp of experiences) {
    for (const skill of exp.skills ?? []) add(skill, "experience")
  }
  for (const project of projects) {
    for (const tech of project.tech ?? []) add(tech, "projects")
  }
  for (const paper of research) {
    for (const tag of paper.tags ?? []) add(tag, "research")
  }

  return Array.from(skillMap.values())
    .map(({ name, count, sources }) => ({ name, count, sources: Array.from(sources) }))
    .sort((a, b) => b.count - a.count)
}

export function countUniqueSkills(): number {
  return aggregateSkills().length
}
