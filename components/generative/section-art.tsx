"use client"

import { contentHash } from "@/lib/generative/noise"
import { FlowFieldHeader } from "./flow-field-header"

type SectionType = "journey" | "builds" | "notes" | "research" | "skills"

interface ExperienceItem {
  company: string
  startDate: string
  [key: string]: unknown
}

interface ProjectItem {
  name: string
  tech?: string[]
  [key: string]: unknown
}

interface ThoughtItem {
  title: string
  category?: string
  [key: string]: unknown
}

interface WorkItem {
  title: string
  venue?: string
  [key: string]: unknown
}

type SectionData =
  | ExperienceItem[]
  | ProjectItem[]
  | ThoughtItem[]
  | WorkItem[]
  | undefined

interface SectionArtProps {
  section: SectionType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  className?: string
}

function computeParams(section: SectionType, data: SectionData) {
  switch (section) {
    case "journey": {
      const experiences = (data as ExperienceItem[] | undefined) ?? []
      return {
        seed: contentHash(experiences.map((e) => e.company + e.startDate)),
        complexity: Math.min(10, experiences.length * 2),
        particleCount: Math.min(400, experiences.length * 80),
        colorScheme: "lime" as const,
      }
    }

    case "builds": {
      const projects = (data as ProjectItem[] | undefined) ?? []
      const allTech = projects.flatMap((p) => p.tech ?? [])
      const uniqueTechCount = new Set(allTech).size
      return {
        seed: contentHash(projects.map((p) => p.name)),
        complexity: Math.min(10, uniqueTechCount),
        particleCount: Math.min(400, projects.length * 100),
        colorScheme: "cyan" as const,
      }
    }

    case "notes": {
      const thoughts = (data as ThoughtItem[] | undefined) ?? []
      const uniqueCategories = new Set(
        thoughts.map((t) => t.category ?? "").filter(Boolean)
      ).size
      return {
        seed: contentHash(thoughts.map((t) => t.title)),
        complexity: Math.min(8, uniqueCategories),
        particleCount: Math.min(300, thoughts.length * 60),
        colorScheme: "amber" as const,
      }
    }

    case "research": {
      const work = (data as WorkItem[] | undefined) ?? []
      const uniqueVenues = new Set(
        work.map((w) => w.venue ?? "").filter(Boolean)
      ).size
      return {
        seed: contentHash(work.map((w) => w.title)),
        complexity: Math.min(10, uniqueVenues),
        particleCount: Math.min(350, work.length * 80),
        colorScheme: "mixed" as const,
      }
    }

    case "skills":
    default:
      return {
        seed: contentHash(["skills-section"]),
        complexity: 7,
        particleCount: 250,
        colorScheme: "lime" as const,
      }
  }
}

export function SectionArt({ section, data, className }: SectionArtProps) {
  const { seed, complexity, particleCount, colorScheme } = computeParams(
    section,
    data as SectionData
  )

  return (
    <div className={`relative ${className ?? ""}`}>
      <FlowFieldHeader
        seed={seed}
        complexity={complexity}
        particleCount={particleCount}
        colorScheme={colorScheme}
      />
    </div>
  )
}
