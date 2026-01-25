"use client"

import { useNavPageConfig, DEFAULT_NAV_ITEMS } from "@/lib/nav-context"
import { motion } from "framer-motion"
import { ArrowUpRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export interface WorkItem {
    slug: string
    title: string
    venue: string
    year: string
    description: string
    tags: string[]
    link?: string
    authors: string[]
}

interface WorkClientProps {
    workByYear: Record<string, WorkItem[]>
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

export default function WorkClient({ workByYear }: WorkClientProps) {
    const { theme, setTheme } = useTheme()

    // Configure NavIsland for work/research page
    // TOC will show year headings (h2 elements)
    useNavPageConfig({
        navItems: DEFAULT_NAV_ITEMS,
        showTOC: true,
        contentSelector: "main section",
        headingLevels: ["h2"],
        pageTitle: "Selected Work",
    })

    const sortedYears = Object.keys(workByYear).sort((a, b) => parseInt(b) - parseInt(a))

    const totalPublications = Object.values(workByYear).flat().length
    const totalVenues = new Set(Object.values(workByYear).flat().map(w => w.venue)).size
    const totalTags = new Set(Object.values(workByYear).flat().flatMap(w => w.tags)).size

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
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
                            RESEARCH & PUBLICATIONS
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
                            Selected Work
                        </h1>
                        <p className="text-muted-foreground max-w-xl">
                            A collection of research papers, publications, and academic contributions
                            in machine learning, natural language processing, and information retrieval.
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
                        const items = workByYear[year]

                        return (
                            <motion.div
                                key={year}
                                className="space-y-6 sm:space-y-8"
                                variants={yearVariants}
                            >
                                <h2 className="text-2xl sm:text-3xl font-light text-foreground">
                                    {year}
                                </h2>

                                <div className="space-y-4 sm:space-y-6">
                                    {items.map((item) => (
                                        <motion.article
                                            key={item.slug}
                                            className="group"
                                            variants={itemVariants}
                                            whileHover={{ y: -4 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {item.link ? (
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500 p-5 sm:p-6"
                                                >
                                                    <WorkCardContent item={item} />
                                                </a>
                                            ) : (
                                                <div className="block rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 sm:p-6">
                                                    <WorkCardContent item={item} showLink={false} />
                                                </div>
                                            )}
                                        </motion.article>
                                    ))}
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
                                <div className="text-2xl sm:text-3xl font-light">{totalPublications}</div>
                                <div className="text-xs text-muted-foreground">Publications</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{totalVenues}</div>
                                <div className="text-xs text-muted-foreground">Venues</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl sm:text-3xl font-light">{totalTags}</div>
                                <div className="text-xs text-muted-foreground">Topics</div>
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

function WorkCardContent({ item, showLink = true }: { item: WorkItem; showLink?: boolean }) {
    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-medium text-foreground group-hover:text-foreground/90 transition-colors duration-200">
                            {item.title}
                        </h3>
                        {showLink && item.link && (
                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 text-muted-foreground flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono tracking-wider">
                        {item.venue}
                    </p>
                </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {item.tags.map((tag) => (
                    <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            <div className="pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground/70">
                    {item.authors.join(" · ")}
                </p>
            </div>
        </div>
    )
}
