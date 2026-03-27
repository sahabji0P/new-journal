/* eslint-disable @typescript-eslint/no-unused-vars */
import { drawBox, drawTable, drawTree, cowsayArt } from "./ascii-art"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TerminalCommand {
  name: string
  aliases: string[]
  description: string
  handler: (
    args: string[],
    context: TerminalContext
  ) => TerminalOutput | Promise<TerminalOutput>
}

export interface TerminalOutput {
  lines: string[]
  navigateTo?: string
  clear?: boolean
  close?: boolean
  isAsync?: boolean
}

export interface TerminalContext {
  projects: {
    slug: string
    name: string
    shortDescription: string
    tech: string[]
    category?: string
    liveUrl?: string
    githubUrl?: string
    date?: string
  }[]
  experiences: {
    slug: string
    company: string
    role: string
    type: string
    startDate: string
    endDate: string
    skills: string[]
    location?: string
  }[]
  thoughts: {
    slug: string
    title: string
    date: string
    category: string
    excerpt?: string
  }[]
  research: {
    slug: string
    title: string
    venue: string
    year: string
    tags: string[]
  }[]
  history: string[]
}

// ─── Individual command handlers ─────────────────────────────────────────────

function handleHelp(_args: string[], _ctx: TerminalContext): TerminalOutput {
  const rows = COMMANDS.map((cmd) => [
    cmd.aliases.length ? `${cmd.name} (${cmd.aliases.join(", ")})` : cmd.name,
    cmd.description,
  ])
  const lines = [
    "Available commands:",
    "",
    ...drawTable(["Command", "Description"], rows),
    "",
    "Tip: Press Tab to auto-complete. Use ↑/↓ to navigate history.",
  ]
  return { lines }
}

function handleWhoami(_args: string[], _ctx: TerminalContext): TerminalOutput {
  return {
    lines: [
      "  Name     : Shashwat Jain",
      "  Title    : Software Engineer & Researcher",
      "  Location : San Francisco, CA",
      "  Status   : Open to opportunities",
      "  Focus    : AI/ML · Systems · Full-Stack",
    ],
  }
}

function handleLs(args: string[], ctx: TerminalContext): TerminalOutput {
  const section = args[0]

  if (!section) {
    return {
      lines: ["projects  experience  thoughts  research  skills"],
    }
  }

  if (section === "projects") {
    if (ctx.projects.length === 0) {
      return { lines: ["No projects found."] }
    }
    const rows = ctx.projects.map((p) => [p.slug, p.shortDescription || ""])
    return {
      lines: [
        `${ctx.projects.length} project(s):`,
        "",
        ...drawTable(["Slug", "Description"], rows),
        "",
        "Use: cat projects/<slug>  to view details",
      ],
    }
  }

  if (section === "experience") {
    if (ctx.experiences.length === 0) {
      return { lines: ["No experience entries found."] }
    }
    const rows = ctx.experiences.map((e) => [
      e.slug,
      e.company,
      e.role,
      `${e.startDate} → ${e.endDate || "Present"}`,
    ])
    return {
      lines: [
        `${ctx.experiences.length} experience(s):`,
        "",
        ...drawTable(["Slug", "Company", "Role", "Period"], rows),
        "",
        "Use: cat experience/<slug>  to view details",
      ],
    }
  }

  if (section === "thoughts") {
    if (ctx.thoughts.length === 0) {
      return { lines: ["No thoughts found."] }
    }
    const rows = ctx.thoughts.map((t) => [t.slug, t.title, t.date, t.category])
    return {
      lines: [
        `${ctx.thoughts.length} thought(s):`,
        "",
        ...drawTable(["Slug", "Title", "Date", "Category"], rows),
      ],
    }
  }

  if (section === "research") {
    if (ctx.research.length === 0) {
      return { lines: ["No research papers found."] }
    }
    const rows = ctx.research.map((r) => [r.slug, r.title, r.venue, r.year])
    return {
      lines: [
        `${ctx.research.length} paper(s):`,
        "",
        ...drawTable(["Slug", "Title", "Venue", "Year"], rows),
      ],
    }
  }

  return {
    lines: [
      `ls: '${section}' not found`,
      "Available sections: projects experience thoughts research skills",
    ],
  }
}

function handleCat(args: string[], ctx: TerminalContext): TerminalOutput {
  const pathArg = args[0] || ""

  if (pathArg.startsWith("projects/")) {
    const slug = pathArg.replace("projects/", "")
    const project = ctx.projects.find((p) => p.slug === slug)
    if (!project) {
      return { lines: [`cat: projects/${slug}: No such file or directory`] }
    }
    const techStr = project.tech.length ? project.tech.join(", ") : "N/A"
    const lines = drawBox(project.name, [
      project.shortDescription || "",
      "",
      `Tech: ${techStr}`,
      project.liveUrl ? `Live: ${project.liveUrl}` : "",
      project.githubUrl ? `GitHub: ${project.githubUrl}` : "",
      project.date ? `Date: ${project.date}` : "",
      project.category ? `Category: ${project.category}` : "",
    ].filter((l) => l !== undefined) as string[])
    return { lines }
  }

  if (pathArg.startsWith("experience/")) {
    const slug = pathArg.replace("experience/", "")
    const exp = ctx.experiences.find((e) => e.slug === slug)
    if (!exp) {
      return { lines: [`cat: experience/${slug}: No such file or directory`] }
    }
    const skillsStr = exp.skills.length ? exp.skills.join(", ") : "N/A"
    const lines = drawBox(`${exp.role} @ ${exp.company}`, [
      `Type    : ${exp.type}`,
      `Period  : ${exp.startDate} → ${exp.endDate || "Present"}`,
      exp.location ? `Location: ${exp.location}` : "",
      "",
      `Skills  : ${skillsStr}`,
    ].filter((l) => l !== undefined) as string[])
    return { lines }
  }

  return {
    lines: [
      `cat: ${pathArg}: No such file or directory`,
      "Usage: cat projects/<slug>  or  cat experience/<slug>",
    ],
  }
}

function handleSkills(_args: string[], ctx: TerminalContext): TerminalOutput {
  const skillMap = new Map<string, number>()

  for (const exp of ctx.experiences) {
    for (const skill of exp.skills) {
      skillMap.set(skill, (skillMap.get(skill) ?? 0) + 1)
    }
  }
  for (const project of ctx.projects) {
    for (const tech of project.tech) {
      skillMap.set(tech, (skillMap.get(tech) ?? 0) + 1)
    }
  }

  if (skillMap.size === 0) {
    return { lines: ["No skills data available."] }
  }

  const sorted = Array.from(skillMap.entries()).sort((a, b) => b[1] - a[1])
  const rows = sorted.map(([skill, count]) => [skill, String(count)])

  return {
    lines: [
      `${skillMap.size} unique skills detected:`,
      "",
      ...drawTable(["Skill", "Occurrences"], rows),
    ],
  }
}

function handleTree(_args: string[], _ctx: TerminalContext): TerminalOutput {
  const tree = drawTree([
    { name: "shashwat.dev", children: [
      { name: "/" },
      { name: "projects" },
      { name: "experience" },
      { name: "thoughts" },
      { name: "research" },
      { name: "api" },
    ]},
  ])
  return { lines: ["Site structure:", "", ...tree] }
}

function handleStats(_args: string[], ctx: TerminalContext): TerminalOutput {
  const skillSet = new Set<string>()
  for (const exp of ctx.experiences) exp.skills.forEach((s) => skillSet.add(s))
  for (const p of ctx.projects) p.tech.forEach((t) => skillSet.add(t))

  const rows = [
    ["Projects", String(ctx.projects.length)],
    ["Experiences", String(ctx.experiences.length)],
    ["Thoughts", String(ctx.thoughts.length)],
    ["Research papers", String(ctx.research.length)],
    ["Unique skills", String(skillSet.size)],
  ]

  return {
    lines: [
      "Portfolio stats:",
      "",
      ...drawTable(["Metric", "Count"], rows),
    ],
  }
}

function handleCd(args: string[], _ctx: TerminalContext): TerminalOutput {
  const page = args[0]
  const pageMap: Record<string, string> = {
    home: "/",
    "/": "/",
    projects: "/projects",
    experience: "/experience",
    thoughts: "/thoughts",
    research: "/research",
    api: "/api-playground",
  }

  if (!page) {
    return { lines: ["Usage: cd <page>", "Pages: home projects experience thoughts research api"] }
  }

  const url = pageMap[page.toLowerCase()]
  if (!url) {
    return {
      lines: [
        `cd: ${page}: No such page`,
        "Available: home projects experience thoughts research api",
      ],
    }
  }

  return {
    lines: [`Navigating to ${url}...`],
    navigateTo: url,
  }
}

function handleHistory(_args: string[], ctx: TerminalContext): TerminalOutput {
  if (ctx.history.length === 0) {
    return { lines: ["No command history yet."] }
  }
  const lines = ctx.history.map((cmd, i) => `  ${String(i + 1).padStart(3)}  ${cmd}`)
  return { lines: ["Command history:", "", ...lines] }
}

function handleNeofetch(_args: string[], _ctx: TerminalContext): TerminalOutput {
  return {
    lines: [
      "     ███╗   ██╗     shashwat@dev",
      "     ████╗  ██║     ──────────────────",
      "     ██╔██╗ ██║     OS: Next.js 15.5.9",
      "     ██║╚██╗██║     Kernel: React 19.0.0",
      "     ██║ ╚████║     Shell: TypeScript 5",
      "     ╚═╝  ╚═══╝     Theme: Dark (oklch)",
      "                    WM: Framer Motion",
      "                    Terminal: cmdk",
      "                    CPU: Turbopack",
      "                    Uptime: Since 2023",
    ],
  }
}

function handleSudo(args: string[], _ctx: TerminalContext): TerminalOutput {
  const subCmd = args.join(" ").toLowerCase()
  if (subCmd === "hire me" || subCmd === "hire-me") {
    return {
      lines: [
        "[sudo] password for visitor: ********",
        "✓ Authentication successful",
        "📧 Sending email to shashwat...",
        "📬 Done! (Just kidding — but email me at shashwat@example.com!)",
      ],
    }
  }
  return {
    lines: [
      `sudo: ${args[0] ?? "(unknown)"}: command not found`,
      "Hint: try  sudo hire me",
    ],
  }
}

function handlePingBrain(_args: string[], _ctx: TerminalContext): TerminalOutput {
  return {
    lines: [
      "PING brain (127.0.0.1): 56 data bytes",
      "64 bytes from brain: icmp_seq=0 ttl=64 time=0.042 ms  — thinking about type safety",
      "64 bytes from brain: icmp_seq=1 ttl=64 time=0.038 ms  — wondering about distributed systems",
      "64 bytes from brain: icmp_seq=2 ttl=64 time=0.051 ms  — recursing through ideas",
      "64 bytes from brain: icmp_seq=3 ttl=64 time=0.039 ms  — rendering the universe lazily",
      "",
      "--- brain ping statistics ---",
      "4 packets transmitted, 4 received, 0% packet loss",
      "round-trip min/avg/max = 0.038/0.043/0.051 ms",
    ],
  }
}

function handleCowsay(args: string[], _ctx: TerminalContext): TerminalOutput {
  const text = args.join(" ") || "moo"
  return { lines: cowsayArt(text) }
}

async function handleCurl(args: string[], _ctx: TerminalContext): Promise<TerminalOutput> {
  const urlArg = args[0] || ""

  // Only allow relative API paths
  const match = urlArg.match(/^(\/api\/v1\/[\w/-]*)(\?.*)?$/)
  if (!match) {
    return {
      lines: [
        `curl: unsupported URL '${urlArg}'`,
        "Usage: curl /api/v1/<endpoint>",
        "Available: /api/v1/projects  /api/v1/experience  /api/v1/thoughts  /api/v1/research  /api/v1/skills  /api/v1/stats",
      ],
    }
  }

  try {
    const response = await fetch(urlArg)
    const json = await response.json()
    const formatted = JSON.stringify(json, null, 2)
    const lines = formatted.split("\n")
    return {
      lines: [
        `HTTP/1.1 ${response.status} ${response.statusText}`,
        `Content-Type: application/json`,
        "",
        ...lines,
      ],
    }
  } catch (err) {
    return {
      lines: [
        `curl: (6) Could not resolve host: ${urlArg}`,
        String(err),
      ],
    }
  }
}

function handleTheme(args: string[], _ctx: TerminalContext): TerminalOutput {
  const theme = args[0]?.toLowerCase()
  if (theme !== "dark" && theme !== "light") {
    return { lines: ["Usage: theme dark|light"] }
  }
  // The component will intercept the __theme__ marker to call useTheme().setTheme()
  return {
    lines: [`Theme set to ${theme}.`],
    navigateTo: `__theme__:${theme}`,
  }
}

// ─── Command registry ─────────────────────────────────────────────────────────

export const COMMANDS: TerminalCommand[] = [
  {
    name: "help",
    aliases: ["?"],
    description: "List all available commands",
    handler: handleHelp,
  },
  {
    name: "whoami",
    aliases: [],
    description: "Display name, title, location, and status",
    handler: handleWhoami,
  },
  {
    name: "ls",
    aliases: ["list", "dir"],
    description: "List sections or contents (ls, ls projects, ls experience, ...)",
    handler: handleLs,
  },
  {
    name: "cat",
    aliases: [],
    description: "Show item detail (cat projects/<slug>, cat experience/<slug>)",
    handler: handleCat,
  },
  {
    name: "skills",
    aliases: [],
    description: "Show aggregated skills list with occurrence counts",
    handler: handleSkills,
  },
  {
    name: "tree",
    aliases: [],
    description: "Show ASCII tree of site structure",
    handler: handleTree,
  },
  {
    name: "stats",
    aliases: [],
    description: "Display portfolio statistics",
    handler: handleStats,
  },
  {
    name: "cd",
    aliases: [],
    description: "Navigate to a page (cd projects, cd experience, ...)",
    handler: handleCd,
  },
  {
    name: "clear",
    aliases: ["cls"],
    description: "Clear the terminal output",
    handler: () => ({ lines: [], clear: true }),
  },
  {
    name: "exit",
    aliases: ["quit", "q"],
    description: "Close the terminal",
    handler: () => ({ lines: [], close: true }),
  },
  {
    name: "theme",
    aliases: [],
    description: "Toggle theme (theme dark|light)",
    handler: handleTheme,
  },
  {
    name: "history",
    aliases: [],
    description: "Show command history",
    handler: handleHistory,
  },
  {
    name: "neofetch",
    aliases: [],
    description: "Display ASCII system info",
    handler: handleNeofetch,
  },
  {
    name: "sudo",
    aliases: [],
    description: "Try: sudo hire me",
    handler: handleSudo,
  },
  {
    name: "ping",
    aliases: [],
    description: "Ping something (try: ping brain)",
    handler: (args, ctx) => {
      if (args[0] === "brain") return handlePingBrain(args, ctx)
      return {
        lines: [
          `PING ${args[0] || "localhost"}: Usage: ping brain`,
        ],
      }
    },
  },
  {
    name: "cowsay",
    aliases: [],
    description: "Make the cow speak (cowsay <text>)",
    handler: handleCowsay,
  },
  {
    name: "curl",
    aliases: [],
    description: "Fetch an API endpoint (curl /api/v1/<endpoint>)",
    handler: handleCurl,
  },
]

// ─── executeCommand ───────────────────────────────────────────────────────────

export function executeCommand(
  input: string,
  context: TerminalContext
): TerminalOutput | Promise<TerminalOutput> {
  const trimmed = input.trim()
  if (!trimmed) return { lines: [] }

  // Tokenise: handle quoted strings
  const tokens = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []
  const [cmdToken, ...args] = tokens.map((t) => t.replace(/^"|"$/g, ""))
  const cmdName = cmdToken.toLowerCase()

  const command = COMMANDS.find(
    (c) => c.name === cmdName || c.aliases.includes(cmdName)
  )

  if (!command) {
    return {
      lines: [
        `${cmdName}: command not found`,
        "Type 'help' to see available commands.",
      ],
    }
  }

  return command.handler(args, context)
}
