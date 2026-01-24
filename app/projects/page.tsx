"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

interface Project {
    slug: string
    name: string
    shortDescription: string
    tech: string[]
    date: string
}

type ProjectsByMonth = Record<string, Project[]>
type ProjectsByYear = Record<string, ProjectsByMonth>

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
}

const yearVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" }
    }
}

export default function AllProjectsPage() {
    const { theme, setTheme } = useTheme()

    // Sample projects data grouped by year and month
    const projectsByDate: ProjectsByYear = {
        "2024": {
            "December": [
                {
                    slug: "neural-canvas",
                    name: "Neural Canvas",
                    shortDescription: "AI-powered design tool that transforms sketches into production-ready interfaces",
                    tech: ["Next.js", "TensorFlow", "Python", "FastAPI"],
                    date: "2024-12-15"
                }
            ],
            "October": [
                {
                    slug: "realtime-collab",
                    name: "RealtimeCollab",
                    shortDescription: "Collaborative whiteboard with low-latency synchronization for distributed teams",
                    tech: ["React", "WebSocket", "Redis", "Node.js"],
                    date: "2024-10-22"
                }
            ],
            "August": [
                {
                    slug: "quantum-analytics",
                    name: "Quantum Analytics",
                    shortDescription: "Data visualization platform with real-time processing capabilities",
                    tech: ["React", "D3.js", "PostgreSQL", "Docker"],
                    date: "2024-08-10"
                }
            ],
            "May": [
                {
                    slug: "voice-sync",
                    name: "VoiceSync",
                    shortDescription: "Voice-controlled task management system with natural language processing",
                    tech: ["React Native", "Python", "OpenAI", "MongoDB"],
                    date: "2024-05-18"
                }
            ]
        },
        "2023": {
            "November": [
                {
                    slug: "api-gateway",
                    name: "API Gateway Pro",
                    shortDescription: "Scalable API gateway with rate limiting and monitoring capabilities",
                    tech: ["Go", "Redis", "Prometheus", "Grafana"],
                    date: "2023-11-30"
                }
            ],
            "September": [
                {
                    slug: "design-system",
                    name: "Luminous Design System",
                    shortDescription: "Comprehensive design system with 100+ components and detailed documentation",
                    tech: ["React", "Storybook", "TypeScript", "Figma"],
                    date: "2023-09-12"
                }
            ],
            "June": [
                {
                    slug: "code-review-ai",
                    name: "CodeReview AI",
                    shortDescription: "AI-powered code review assistant that provides contextual suggestions",
                    tech: ["Python", "GPT-4", "FastAPI", "Docker"],
                    date: "2023-06-25"
                }
            ],
            "March": [
                {
                    slug: "task-flow",
                    name: "TaskFlow",
                    shortDescription: "Minimalist task management app with focus modes and analytics",
                    tech: ["React", "Node.js", "PostgreSQL", "Redis"],
                    date: "2023-03-08"
                }
            ]
        },
        "2022": {
            "October": [
                {
                    slug: "crypto-tracker",
                    name: "CryptoTracker",
                    shortDescription: "Real-time cryptocurrency portfolio tracker with price alerts",
                    tech: ["React", "WebSocket", "Node.js", "MongoDB"],
                    date: "2022-10-15"
                }
            ]
        }
    }

    // Sort years in descending order (newest first)
    const sortedYears = Object.keys(projectsByDate).sort((a, b) => parseInt(b) - parseInt(a))

    // Month order for sorting (December = 12, January = 1, etc.)
    const monthOrder: Record<string, number> = {
        "January": 1, "February": 2, "March": 3, "April": 4,
        "May": 5, "June": 6, "July": 7, "August": 8,
        "September": 9, "October": 10, "November": 11, "December": 12
    }

    // Calculate stats
    const totalProjects = Object.values(projectsByDate).reduce((acc, months) =>
        acc + Object.values(months).flat().length, 0
    )
    const yearsActive = Object.keys(projectsByDate).length
    const technologies = new Set(
        Object.values(projectsByDate)
            .flatMap(months => Object.values(months).flat())
            .flatMap(p => p.tech)
    ).size

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
                {/* Page Header */}
                <motion.header
                    className="mb-16 sm:mb-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground font-mono tracking-wider">
                            PROJECT ARCHIVE
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
                            All Projects
                        </h1>
                        <p className="text-muted-foreground max-w-xl">
                            A chronological collection of side projects, experiments, and client work.
                        </p>
                    </div>
                </motion.header>

                {/* Projects Timeline */}
                <motion.section
                    className="space-y-12 sm:space-y-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {sortedYears.map((year) => {
                        const months = projectsByDate[year]
                        const sortedMonths = Object.keys(months).sort((a, b) => monthOrder[b] - monthOrder[a])

                        return (
                            <motion.div
                                key={year}
                                className="space-y-6 sm:space-y-8"
                                variants={yearVariants}
                            >
                                {/* Year Header */}
                                <h2 className="text-2xl sm:text-3xl font-light text-foreground">
                                    {year}
                                </h2>

                                {/* Months */}
                                <div className="space-y-8 sm:space-y-10 pl-4 border-l border-border">
                                    {sortedMonths.map((month) => {
                                        const projects = months[month]
                                        return (
                                            <motion.div
                                                key={month}
                                                className="space-y-4"
                                                variants={containerVariants}
                                            >
                                                {/* Month Header */}
                                                <h3 className="text-sm text-muted-foreground font-mono -ml-4 pl-4 relative">
                                                    <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border" />
                                                    {month}
                                                </h3>

                                                {/* Projects */}
                                                <div className="space-y-4">
                                                    {projects.map((project) => (
                                                        <motion.article
                                                            key={project.slug}
                                                            className="group"
                                                            variants={itemVariants}
                                                            whileHover={{ x: 4 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <Link
                                                                href={`/projects/${project.slug}`}
                                                                className="block space-y-1.5"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <h4 className="text-base sm:text-lg font-medium group-hover:text-muted-foreground transition-colors duration-200">
                                                                        {project.name}
                                                                    </h4>
                                                                    <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 text-muted-foreground flex-shrink-0 mt-1" />
                                                                </div>
                                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                                    {project.shortDescription}
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                                    {project.tech.map((tech) => (
                                                                        <span
                                                                            key={tech}
                                                                            className="text-xs text-muted-foreground/70"
                                                                        >
                                                                            {tech}
                                                                            {project.tech.indexOf(tech) < project.tech.length - 1 && " ·"}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </Link>
                                                        </motion.article>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )
                    })}
                </motion.section>

                {/* Stats Footer */}
                <motion.footer
                    className="mt-20 sm:mt-32 pt-12 sm:pt-16 border-t border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8">
                        {/* Stats */}
                        <div className="flex gap-8 sm:gap-12">
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{totalProjects}</div>
                                <div className="text-xs text-muted-foreground">Projects</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{yearsActive}</div>
                                <div className="text-xs text-muted-foreground">Years</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{technologies}</div>
                                <div className="text-xs text-muted-foreground">Technologies</div>
                            </div>
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                            ) : (
                                <Moon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                            )}
                        </button>
                    </div>
                </motion.footer>
            </main>
        </div>
    )
}