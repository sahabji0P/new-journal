import { apiResponse } from "@/lib/api/response"
import { getAllProjects } from "@/lib/project-utils"
import { getAllExperiences } from "@/lib/experience-utils"
import { getAllWork } from "@/lib/work-utils"
import { getAllThoughts } from "@/lib/mdx-utils"
import { aggregateSkills } from "@/lib/api/skills"

const SKILL_CATEGORIES: Record<string, string[]> = {
  "AI/ML": [
    "python", "pytorch", "tensorflow", "scikit-learn", "huggingface", "transformers",
    "langchain", "openai", "anthropic", "llm", "nlp", "ml", "ai", "deep learning",
    "machine learning", "neural networks", "diffusion", "stable diffusion",
    "reinforcement learning", "computer vision", "cv", "pandas", "numpy",
  ],
  "Backend": [
    "node.js", "nodejs", "fastapi", "flask", "django", "express", "rust",
    "go", "golang", "java", "spring", "postgresql", "mysql", "redis",
    "mongodb", "prisma", "supabase", "firebase", "graphql", "rest", "api",
    "websocket", "kafka", "rabbitmq", "celery", "nginx", "docker", "kubernetes",
  ],
  "Frontend": [
    "react", "next.js", "nextjs", "vue", "svelte", "typescript", "javascript",
    "tailwind", "css", "html", "framer-motion", "gsap", "three.js", "webgl",
    "shadcn", "radix", "zustand", "redux", "tanstack",
  ],
}

function categorizeSkills(skills: { name: string; count: number }[]) {
  const categories: Record<string, number> = { "AI/ML": 0, "Backend": 0, "Frontend": 0 }

  for (const skill of skills) {
    const lower = skill.name.toLowerCase()
    for (const [cat, keywords] of Object.entries(SKILL_CATEGORIES)) {
      if (keywords.some((kw) => lower.includes(kw) || kw.includes(lower))) {
        categories[cat] += skill.count
        break
      }
    }
  }

  return Object.entries(categories)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export async function GET() {
  const projects = getAllProjects()
  const experiences = getAllExperiences()
  const publications = getAllWork()
  const thoughts = getAllThoughts()
  const skills = aggregateSkills()

  const totalWords = [
    ...projects.map((p) => p.content),
    ...experiences.map((e) => e.content),
    ...publications.map((w) => w.content),
    ...thoughts.map((t) => t.content),
  ].reduce((sum, content) => sum + Math.floor((content?.length ?? 0) / 5), 0)

  const metrics = {
    content: {
      projects: projects.length,
      experiences: experiences.length,
      publications: publications.length,
      thoughts: thoughts.length,
      totalWords,
    },
    skills: {
      total: skills.length,
      topCategories: categorizeSkills(skills),
    },
    api: {
      status: "healthy",
      responseTime: 0,
      endpoints: 12,
    },
    github: {
      username: "sahabji0P",
      profileUrl: "https://github.com/sahabji0P",
    },
  }

  return apiResponse(metrics, undefined, "public, max-age=300")
}
