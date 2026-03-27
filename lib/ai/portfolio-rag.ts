import { getAllExperiences } from "@/lib/experience-utils"
import { getAllProjects } from "@/lib/project-utils"
import { getAllWork } from "@/lib/work-utils"
import { getAllThoughts } from "@/lib/mdx-utils"

export function getPortfolioContext(): string {
  // Load all content and format as context string
  const experiences = getAllExperiences()
  const projects = getAllProjects()
  const work = getAllWork()
  const thoughts = getAllThoughts()

  let context = "## About\nShashwat Jain — AI & Backend Engineer based in Uttar Pradesh, India.\n\n"

  context += "## Experience\n"
  for (const exp of experiences) {
    context += `### ${exp.company} — ${exp.role}\n`
    context += `Type: ${exp.type} | ${exp.startDate} to ${exp.endDate} | ${exp.location}\n`
    context += `${exp.description}\n`
    if (exp.highlights.length > 0) context += `Highlights: ${exp.highlights.join("; ")}\n`
    if (exp.skills.length > 0) context += `Skills: ${exp.skills.join(", ")}\n`
    context += "\n"
  }

  context += "## Projects\n"
  for (const proj of projects) {
    context += `### ${proj.name}\n`
    context += `${proj.shortDescription}\n${proj.description}\n`
    context += `Tech: ${proj.tech.join(", ")}\n`
    context += `Category: ${proj.category}\n\n`
  }

  context += "## Research & Publications\n"
  for (const w of work) {
    context += `### ${w.title}\n`
    context += `Venue: ${w.venue} (${w.year})\n`
    context += `${w.description}\n`
    context += `Tags: ${w.tags.join(", ")}\n`
    context += `Authors: ${w.authors.join(", ")}\n\n`
  }

  context += "## Thoughts/Blog Posts\n"
  for (const t of thoughts) {
    context += `### ${t.title}\n`
    context += `${t.excerpt}\n`
    context += `Category: ${t.category} | Date: ${t.date}\n\n`
  }

  return context
}

export function getSystemPrompt(): string {
  const context = getPortfolioContext()
  return `You are Shashwat's portfolio assistant. You help visitors learn about Shashwat's work, skills, projects, and experience.

Rules:
- Be conversational, concise, and friendly
- Only answer from the context provided below
- If asked something not in the context, say you don't have that information
- Cite specific projects, roles, or papers when relevant
- Keep responses under 150 words unless the question requires detail
- Use markdown formatting for readability

Portfolio Context:
${context}`
}

export function getSuggestedQuestions(): string[] {
  return [
    "What AI projects has Shashwat built?",
    "Tell me about his research papers",
    "What's his tech stack?",
    "What is he working on right now?",
    "What experience does he have?",
  ]
}
