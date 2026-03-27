import type { TerminalContext } from "./commands"
import { COMMANDS } from "./commands"

const SECTION_NAMES = ["projects", "experience", "thoughts", "research", "skills"]
const PAGE_NAMES = ["home", "projects", "experience", "thoughts", "research", "api"]
const API_ENDPOINTS = [
  "/api/v1/projects",
  "/api/v1/experience",
  "/api/v1/thoughts",
  "/api/v1/research",
  "/api/v1/skills",
  "/api/v1/stats",
  "/api/v1/profile",
]
const COMMAND_NAMES = COMMANDS.flatMap((c) => [c.name, ...c.aliases])

/**
 * Returns an array of possible completions for the given partial input.
 *
 * Rules:
 *  - Empty/partial command → complete command names
 *  - "ls <partial>" → complete section names
 *  - "cat projects/<partial>" → complete project slugs
 *  - "cat experience/<partial>" → complete experience slugs
 *  - "cd <partial>" → complete page names
 *  - "curl <partial>" → complete API endpoint paths
 */
export function getCompletions(input: string, context: TerminalContext): string[] {
  const lower = input.toLowerCase()

  // Complete command names when input has no space yet
  if (!input.includes(" ")) {
    return COMMAND_NAMES.filter((name) => name.startsWith(lower) && name !== lower)
  }

  // ls <section>
  if (/^ls\s+/i.test(input)) {
    const partial = input.slice(3).trimStart()
    return SECTION_NAMES
      .filter((s) => s.startsWith(partial.toLowerCase()) && s !== partial.toLowerCase())
      .map((s) => `ls ${s}`)
  }

  // cat projects/<slug>
  if (/^cat\s+projects\//i.test(input)) {
    const partial = input.replace(/^cat\s+projects\//i, "")
    return context.projects
      .map((p) => p.slug)
      .filter((slug) => slug.startsWith(partial) && slug !== partial)
      .map((slug) => `cat projects/${slug}`)
  }

  // cat experience/<slug>
  if (/^cat\s+experience\//i.test(input)) {
    const partial = input.replace(/^cat\s+experience\//i, "")
    return context.experiences
      .map((e) => e.slug)
      .filter((slug) => slug.startsWith(partial) && slug !== partial)
      .map((slug) => `cat experience/${slug}`)
  }

  // cat <prefix> — complete the path prefix (projects/ or experience/)
  if (/^cat\s+/i.test(input)) {
    const partial = input.slice(4).trimStart()
    const prefixes = ["projects/", "experience/"]
    return prefixes
      .filter((p) => p.startsWith(partial))
      .map((p) => `cat ${p}`)
  }

  // cd <page>
  if (/^cd\s+/i.test(input)) {
    const partial = input.slice(3).trimStart()
    return PAGE_NAMES
      .filter((p) => p.startsWith(partial.toLowerCase()) && p !== partial.toLowerCase())
      .map((p) => `cd ${p}`)
  }

  // curl <endpoint>
  if (/^curl\s+/i.test(input)) {
    const partial = input.slice(5).trimStart()
    return API_ENDPOINTS
      .filter((ep) => ep.startsWith(partial) && ep !== partial)
      .map((ep) => `curl ${ep}`)
  }

  return []
}
