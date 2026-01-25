"use client"

import { motion } from "framer-motion"
import { Briefcase, Calendar, MapPin, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export interface ExperienceItem {
    slug: string
    company: string
    role: string
    type: "full-time" | "internship" | "contract" | "freelance"
    startDate: string
    endDate: string
    location: string
    description: string
    highlights: string[]
    skills: string[]
    featured: boolean
    order: number
}

interface ExperienceClientProps {
    experiences: ExperienceItem[]
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as const
        }
    }
}

function formatDateRange(startDate: string, endDate: string): string {
    const formatDate = (dateStr: string) => {
        if (dateStr === "Present") return "Present"
        const date = new Date(dateStr + "-01")
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

function calculateDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate + "-01")
    const end = endDate === "Present" ? new Date() : new Date(endDate + "-01")

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

    if (months < 1) return "< 1 month"
    if (months === 1) return "1 month"
    if (months < 12) return `${months} months`

    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    if (remainingMonths === 0) {
        return years === 1 ? "1 year" : `${years} years`
    }

    const yearStr = years === 1 ? "1 yr" : `${years} yrs`
    const monthStr = remainingMonths === 1 ? "1 mo" : `${remainingMonths} mos`

    return `${yearStr} ${monthStr}`
}

function getTypeBadgeStyles(type: ExperienceItem["type"]): string {
    const baseStyles = "px-2 py-0.5 text-xs rounded-full border capitalize"

    switch (type) {
        case "full-time":
            return `${baseStyles} border-emerald-500/30 text-emerald-400 bg-emerald-500/10`
        case "internship":
            return `${baseStyles} border-blue-500/30 text-blue-400 bg-blue-500/10`
        case "contract":
            return `${baseStyles} border-amber-500/30 text-amber-400 bg-amber-500/10`
        case "freelance":
            return `${baseStyles} border-purple-500/30 text-purple-400 bg-purple-500/10`
        default:
            return `${baseStyles} border-border/50 text-muted-foreground`
    }
}

export default function ExperienceClient({ experiences }: ExperienceClientProps) {
    const { theme, setTheme } = useTheme()

    const totalRoles = experiences.length
    const totalYears = experiences.reduce((acc, exp) => {
        const start = new Date(exp.startDate + "-01")
        const end = exp.endDate === "Present" ? new Date() : new Date(exp.endDate + "-01")
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
        return acc + months
    }, 0)
    const yearsExperience = Math.round(totalYears / 12 * 10) / 10
    const totalSkills = new Set(experiences.flatMap(exp => exp.skills)).size

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
                {/* Header */}
                <motion.header
                    className="mb-16 sm:mb-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground font-mono tracking-wider">
                            PROFESSIONAL JOURNEY
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
                            Experience
                        </h1>
                        <p className="text-muted-foreground max-w-xl">
                            A timeline of my professional experience in software engineering and AI.
                        </p>
                    </div>
                </motion.header>

                {/* Timeline */}
                <motion.section
                    className="relative"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Vertical timeline line */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-border via-muted-foreground/30 to-border hidden sm:block" />

                    <div className="space-y-8">
                        {experiences.map((exp) => (
                            <motion.div
                                key={exp.slug}
                                variants={itemVariants}
                                className="group relative"
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-0 top-8 w-2.5 h-2.5 -translate-x-[5px] rounded-full bg-muted-foreground/50 group-hover:bg-foreground group-hover:scale-125 transition-all duration-300 hidden sm:block" />

                                <motion.div
                                    className="sm:ml-8 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                    whileHover={{
                                        y: -4,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    {/* Top Row: Company, Type Badge, Duration */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Briefcase className="w-4 h-4" />
                                                <span className="text-sm font-medium">{exp.company}</span>
                                            </div>
                                            <span className={getTypeBadgeStyles(exp.type)}>
                                                {exp.type.replace("-", " ")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono shrink-0">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDateRange(exp.startDate, exp.endDate)}</span>
                                            <span className="text-muted-foreground/50">|</span>
                                            <span>{calculateDuration(exp.startDate, exp.endDate)}</span>
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <h3 className="text-xl sm:text-2xl font-medium tracking-tight mb-3 group-hover:text-muted-foreground transition-colors duration-300">
                                        {exp.role}
                                    </h3>

                                    {/* Location */}
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span>{exp.location}</span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-muted-foreground leading-relaxed mb-5">
                                        {exp.description}
                                    </p>

                                    {/* Highlights */}
                                    {exp.highlights.length > 0 && (
                                        <ul className="space-y-2 mb-5">
                                            {exp.highlights.map((highlight, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-sm text-muted-foreground"
                                                >
                                                    <span className="text-muted-foreground/50 mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                                    <span>{highlight}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* Skills */}
                                    {exp.skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {exp.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="px-2.5 py-1 text-xs rounded-md bg-secondary/50 text-secondary-foreground border border-border/30"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Statistics Footer */}
                <motion.footer
                    className="mt-20 sm:mt-32 pt-12 sm:pt-16 border-t border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-8">
                        <div className="flex gap-8 sm:gap-12">
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{totalRoles}</div>
                                <div className="text-xs text-muted-foreground">Roles</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">
                                    {yearsExperience < 1 ? "< 1" : yearsExperience}
                                </div>
                                <div className="text-xs text-muted-foreground">Years</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{totalSkills}</div>
                                <div className="text-xs text-muted-foreground">Skills</div>
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
