"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export interface ProjectItem {
    slug: string
    name: string
    shortDescription: string
    tech: string[]
    date: string
}

interface ProjectsClientProps {
    projectsByYear: Record<string, ProjectItem[]>
}

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
        transition: { duration: 0.5, ease: "easeOut" as const }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" as const }
    }
}

export default function ProjectsClient({ projectsByYear }: ProjectsClientProps) {
    const { theme, setTheme } = useTheme()

    const sortedYears = Object.keys(projectsByYear).sort((a, b) => parseInt(b) - parseInt(a))

    const totalProjects = Object.values(projectsByYear).flat().length
    const yearsActive = Object.keys(projectsByYear).length
    const technologies = new Set(
        Object.values(projectsByYear).flat().flatMap(p => p.tech)
    ).size

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    const formatMonth = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'long' })
    }

    // Group projects by month within each year
    const getProjectsByMonth = (projects: ProjectItem[]) => {
        const byMonth: Record<string, ProjectItem[]> = {}
        projects.forEach(project => {
            const month = formatMonth(project.date)
            if (!byMonth[month]) byMonth[month] = []
            byMonth[month].push(project)
        })
        return byMonth
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
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

                <motion.section
                    className="space-y-12 sm:space-y-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {sortedYears.map((year) => {
                        const projects = projectsByYear[year]
                        const projectsByMonth = getProjectsByMonth(projects)
                        const sortedMonths = Object.keys(projectsByMonth).sort((a, b) => {
                            const monthOrder: Record<string, number> = {
                                "January": 1, "February": 2, "March": 3, "April": 4,
                                "May": 5, "June": 6, "July": 7, "August": 8,
                                "September": 9, "October": 10, "November": 11, "December": 12
                            }
                            return monthOrder[b] - monthOrder[a]
                        })

                        return (
                            <motion.div
                                key={year}
                                className="space-y-6 sm:space-y-8"
                                variants={yearVariants}
                            >
                                <h2 className="text-2xl sm:text-3xl font-light text-foreground">
                                    {year}
                                </h2>

                                <div className="space-y-8 sm:space-y-10 pl-4 border-l border-border">
                                    {sortedMonths.map((month) => {
                                        const monthProjects = projectsByMonth[month]
                                        return (
                                            <motion.div
                                                key={month}
                                                className="space-y-4"
                                                variants={containerVariants}
                                            >
                                                <h3 className="text-sm text-muted-foreground font-mono -ml-4 pl-4 relative">
                                                    <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border" />
                                                    {month}
                                                </h3>

                                                <div className="space-y-4">
                                                    {monthProjects.map((project) => (
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
                                                                    {project.tech.map((tech, idx) => (
                                                                        <span
                                                                            key={tech}
                                                                            className="text-xs text-muted-foreground/70"
                                                                        >
                                                                            {tech}
                                                                            {idx < project.tech.length - 1 && " ·"}
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

                <motion.footer
                    className="mt-20 sm:mt-32 pt-12 sm:pt-16 border-t border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8">
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

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors duration-200"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <Moon className="w-4 h-4 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                </motion.footer>
            </main>
        </div>
    )
}
