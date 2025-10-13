"use client"

import { ArrowUpRight, Calendar, ExternalLink, Filter, GitBranch } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

// This would be your app/projects/page.tsx file
export default function AllProjectsPage() {
    const [isDark, setIsDark] = useState(true)
    const [selectedFilter, setSelectedFilter] = useState("all")
    const [hoveredDay, setHoveredDay] = useState(null)

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark)
    }, [isDark])

    const toggleTheme = () => {
        setIsDark(!isDark)
    }

    // Sample projects data grouped by year and month
    const projectsByDate = {
        "2024": {
            "December": [
                {
                    slug: "neural-canvas",
                    name: "Neural Canvas",
                    shortDescription: "AI-powered design tool that transforms sketches into production-ready interfaces",
                    tech: ["Next.js", "TensorFlow", "Python", "FastAPI"],
                    category: "AI/ML",
                    liveUrl: "https://neuralcanvas.demo.com",
                    date: "2024-12-15"
                }
            ],
            "October": [
                {
                    slug: "realtime-collab",
                    name: "RealtimeCollab",
                    shortDescription: "Collaborative whiteboard with low-latency synchronization for distributed teams",
                    tech: ["React", "WebSocket", "Redis", "Node.js"],
                    category: "Web App",
                    liveUrl: "https://realtimecollab.demo.com",
                    date: "2024-10-22"
                }
            ],
            "August": [
                {
                    slug: "quantum-analytics",
                    name: "Quantum Analytics",
                    shortDescription: "Data visualization platform with real-time processing capabilities",
                    tech: ["React", "D3.js", "PostgreSQL", "Docker"],
                    category: "Data Viz",
                    liveUrl: "https://quantumanalytics.demo.com",
                    date: "2024-08-10"
                }
            ],
            "May": [
                {
                    slug: "voice-sync",
                    name: "VoiceSync",
                    shortDescription: "Voice-controlled task management system with natural language processing",
                    tech: ["React Native", "Python", "OpenAI", "MongoDB"],
                    category: "Mobile",
                    liveUrl: "https://voicesync.demo.com",
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
                    category: "Backend",
                    liveUrl: "https://apigateway.demo.com",
                    date: "2023-11-30"
                }
            ],
            "September": [
                {
                    slug: "design-system",
                    name: "Luminous Design System",
                    shortDescription: "Comprehensive design system with 100+ components and detailed documentation",
                    tech: ["React", "Storybook", "TypeScript", "Figma"],
                    category: "Design System",
                    liveUrl: "https://luminous.demo.com",
                    date: "2023-09-12"
                }
            ],
            "June": [
                {
                    slug: "code-review-ai",
                    name: "CodeReview AI",
                    shortDescription: "AI-powered code review assistant that provides contextual suggestions",
                    tech: ["Python", "GPT-4", "FastAPI", "Docker"],
                    category: "AI/ML",
                    liveUrl: "https://codereview.demo.com",
                    date: "2023-06-25"
                }
            ],
            "March": [
                {
                    slug: "task-flow",
                    name: "TaskFlow",
                    shortDescription: "Minimalist task management app with focus modes and analytics",
                    tech: ["React", "Node.js", "PostgreSQL", "Redis"],
                    category: "Web App",
                    liveUrl: "https://taskflow.demo.com",
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
                    category: "Web App",
                    liveUrl: "https://cryptotracker.demo.com",
                    date: "2022-10-15"
                }
            ]
        }
    }

    // Generate GitHub-style contribution graph data
    const generateContributionData = () => {
        const weeks = []
        const today = new Date()
        const startDate = new Date(today)
        startDate.setDate(today.getDate() - 364) // 52 weeks

        for (let week = 0; week < 52; week++) {
            const days = []
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate)
                currentDate.setDate(startDate.getDate() + (week * 7) + day)

                // Generate random contribution count (0-20)
                const count = Math.floor(Math.random() * 21)
                days.push({
                    date: currentDate.toISOString().split('T')[0],
                    count: count,
                    level: count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 15 ? 3 : 4
                })
            }
            weeks.push(days)
        }
        return weeks
    }

    const contributionData = generateContributionData()
    const categories = ["all", "AI/ML", "Web App", "Mobile", "Backend", "Data Viz", "Design System"]

    // Filter projects by category
    const filterProjects = (projects) => {
        if (selectedFilter === "all") return projects
        return Object.entries(projects).reduce((acc, [year, months]) => {
            const filteredMonths = Object.entries(months).reduce((monthAcc, [month, projectList]) => {
                const filtered = projectList.filter(p => p.category === selectedFilter)
                if (filtered.length > 0) {
                    monthAcc[month] = filtered
                }
                return monthAcc
            }, {})

            if (Object.keys(filteredMonths).length > 0) {
                acc[year] = filteredMonths
            }
            return acc
        }, {})
    }

    const filteredProjects = filterProjects(projectsByDate)

    // Sort years in descending order (newest first)
    const sortedYears = Object.keys(filteredProjects).sort((a, b) => parseInt(b) - parseInt(a))

    // Month order for sorting (December = 12, January = 1, etc.)
    const monthOrder = {
        "January": 1, "February": 2, "March": 3, "April": 4,
        "May": 5, "June": 6, "July": 7, "August": 8,
        "September": 9, "October": 10, "November": 11, "December": 12
    }

    const getLevelColor = (level) => {
        if (level === 0) return "bg-muted/30"
        if (level === 1) return "bg-green-500/20"
        if (level === 2) return "bg-green-500/40"
        if (level === 3) return "bg-green-500/60"
        return "bg-green-500/80"
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-6xl mx-auto px-8 lg:px-16 py-16">
                {/* Page Header */}
                <header className="mb-20">
                    <div className="flex items-center justify-between mb-8">
                        <Link
                            href="/"
                            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                        >
                            <span>←</span>
                            <span>Back to Home</span>
                        </Link>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg
                                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground font-mono tracking-wider">
                                PROJECT ARCHIVE
                            </div>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                            All Projects
                        </h1>

                        <p className="text-lg text-muted-foreground max-w-2xl">
                            A collection of side projects, experiments, and client work spanning multiple domains
                            from AI/ML to full-stack development.
                        </p>
                    </div>
                </header>

                {/* GitHub Contribution Graph */}
                <section className="mb-20 p-8 border border-border rounded-lg">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="text-xl font-light">Contribution Activity</h2>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {contributionData.flat().filter(d => d.count > 0).length} contributions in the last year
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Less</span>
                                {[0, 1, 2, 3, 4].map(level => (
                                    <div
                                        key={level}
                                        className={`w-3 h-3 rounded-sm ${getLevelColor(level)} border border-border/50`}
                                    />
                                ))}
                                <span>More</span>
                            </div>
                        </div>

                        {/* Contribution Graph */}
                        <div className="overflow-x-auto">
                            <div className="inline-flex gap-1">
                                {contributionData.map((week, weekIndex) => (
                                    <div key={weekIndex} className="flex flex-col gap-1">
                                        {week.map((day, dayIndex) => (
                                            <div
                                                key={`${weekIndex}-${dayIndex}`}
                                                className={`w-3 h-3 rounded-sm ${getLevelColor(day.level)} border border-border/50 hover:border-muted-foreground/50 transition-all duration-200 cursor-pointer relative group`}
                                                onMouseEnter={() => setHoveredDay(day)}
                                                onMouseLeave={() => setHoveredDay(null)}
                                            >
                                                {hoveredDay === day && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                                                        {day.count} contributions on {day.date}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Month labels - simplified */}
                        <div className="flex justify-between text-xs text-muted-foreground pl-1">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => (
                                <span key={month} className={i % 2 === 0 ? "" : "opacity-0"}>{month}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Category Filters */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-mono">FILTER BY CATEGORY</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedFilter(category)}
                                className={`px-4 py-2 text-sm rounded-lg border transition-all duration-300 ${selectedFilter === category
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border hover:border-muted-foreground/50"
                                    }`}
                            >
                                {category === "all" ? "All Projects" : category}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Projects Timeline - Sorted by newest first */}
                <section className="space-y-20">
                    {sortedYears.map((year) => {
                        const months = filteredProjects[year]
                        // Sort months in descending order (December first, January last)
                        const sortedMonths = Object.keys(months).sort((a, b) => monthOrder[b] - monthOrder[a])

                        return (
                            <div key={year} className="space-y-12">
                                {/* Year Header */}
                                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-4 z-10 border-b border-border">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl font-light">{year}</h2>
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="text-sm text-muted-foreground font-mono">
                                            {Object.values(months).flat().length} PROJECTS
                                        </span>
                                    </div>
                                </div>

                                {/* Months */}
                                <div className="space-y-16">
                                    {sortedMonths.map((month) => {
                                        const projects = months[month]
                                        return (
                                            <div key={month} className="space-y-6">
                                                {/* Month Header */}
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <h3 className="text-xl font-light text-muted-foreground">{month}</h3>
                                                    <div className="h-px flex-1 bg-border/50" />
                                                </div>

                                                {/* Projects Grid */}
                                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {projects.map((project) => (
                                                        <article
                                                            key={project.slug}
                                                            className="group border border-border rounded-lg overflow-hidden hover:border-muted-foreground/50 transition-all duration-500 hover:shadow-lg flex flex-col"
                                                        >
                                                            {/* Project Image Placeholder */}
                                                            <Link href={`/projects/${project.slug}`}>
                                                                <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                                                                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                                                                        <span className="text-3xl font-light text-muted-foreground/30">
                                                                            {project.name.charAt(0)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-500" />

                                                                    {/* Category Badge */}
                                                                    <div className="absolute top-3 right-3">
                                                                        <span className="px-2 py-1 text-xs bg-background/80 backdrop-blur-sm border border-border rounded">
                                                                            {project.category}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </Link>

                                                            {/* Project Info */}
                                                            <div className="p-5 space-y-4 flex-1 flex flex-col">
                                                                <div className="flex-1 space-y-3">
                                                                    <Link href={`/projects/${project.slug}`}>
                                                                        <h4 className="text-lg font-medium group-hover:text-muted-foreground transition-colors duration-300">
                                                                            {project.name}
                                                                        </h4>
                                                                    </Link>

                                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                                        {project.shortDescription}
                                                                    </p>

                                                                    {/* Tech Stack */}
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {project.tech.slice(0, 3).map((tech) => (
                                                                            <span
                                                                                key={tech}
                                                                                className="px-2 py-0.5 text-xs text-muted-foreground border border-border/50 rounded"
                                                                            >
                                                                                {tech}
                                                                            </span>
                                                                        ))}
                                                                        {project.tech.length > 3 && (
                                                                            <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                                                                +{project.tech.length - 3}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Action Links */}
                                                                <div className="flex items-center gap-4 pt-2 text-xs border-t border-border/50">
                                                                    <Link
                                                                        href={`/projects/${project.slug}`}
                                                                        className="group/link flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors duration-300"
                                                                    >
                                                                        <span>Details</span>
                                                                        <ArrowUpRight className="w-3 h-3 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                                                    </Link>

                                                                    <a
                                                                        href={project.liveUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="group/link flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                                                    >
                                                                        <span>Live</span>
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </article>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </section>

                {/* Stats Footer */}
                <footer className="mt-32 pt-16 border-t border-border">
                    <div className="grid sm:grid-cols-3 gap-8 mb-12">
                        <div className="space-y-2">
                            <div className="text-3xl font-light">
                                {Object.values(projectsByDate).reduce((acc, months) =>
                                    acc + Object.values(months).flat().length, 0
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Projects</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-3xl font-light">
                                {Object.keys(projectsByDate).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Years Active</div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-3xl font-light">
                                {new Set(
                                    Object.values(projectsByDate)
                                        .flatMap(months => Object.values(months).flat())
                                        .flatMap(p => p.tech)
                                ).size}
                            </div>
                            <div className="text-sm text-muted-foreground">Technologies Used</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <Link
                            href="/"
                            className="hover:text-foreground transition-colors duration-300"
                        >
                            ← Back to Home
                        </Link>
                        <span>Built with passion & caffeine ☕</span>
                    </div>
                </footer>
            </main>
        </div>
    )
}