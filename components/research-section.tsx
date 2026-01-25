"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"

export interface ResearchData {
    slug: string
    title: string
    venue: string
    year: string
    description: string
    tags: string[]
    link?: string
    authors: string[]
}

interface ResearchSectionProps {
    sectionRef: (el: HTMLElement | null) => void
    research: ResearchData[]
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut" as const
        }
    }
}

const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as const }
    }
}

export default function ResearchSection({ sectionRef, research }: ResearchSectionProps) {
    const displayResearch = research.slice(0, 4)

    // Get year range from research data
    const years = research.map(r => parseInt(r.year)).filter(y => !isNaN(y))
    const minYear = years.length > 0 ? Math.min(...years) : 2023
    const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

    return (
        <motion.section
            id="work"
            ref={sectionRef}
            className="py-32"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            <div className="space-y-16">
                {/* Section Header */}
                <motion.div
                    className="flex items-end justify-between"
                    variants={titleVariants}
                >
                    <div className="space-y-3">
                        <div className="text-sm text-muted-foreground font-mono tracking-wider">
                            RESEARCH & PUBLICATIONS
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                            Selected <span className="text-muted-foreground">Work</span>
                        </h2>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground font-mono">
                        {minYear} — {maxYear}
                    </div>
                </motion.div>

                {/* Research List */}
                <motion.div
                    className="space-y-6"
                    variants={containerVariants}
                >
                    {displayResearch.map((work) => (
                        <motion.article
                            key={work.slug}
                            variants={itemVariants}
                            className="group"
                        >
                            <motion.div
                                className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-8 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                whileHover={{
                                    y: -4,
                                    transition: { duration: 0.2 }
                                }}
                            >
                                {/* Year Column */}
                                <div className="sm:col-span-2">
                                    <div className="text-xl sm:text-2xl font-light text-muted-foreground group-hover:text-foreground transition-colors duration-500 font-mono">
                                        {work.year}
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="sm:col-span-7 space-y-3">
                                    <div>
                                        <Link href={`/work/${work.slug}`}>
                                            <h3 className="text-lg sm:text-xl font-medium tracking-tight group-hover:text-muted-foreground transition-colors duration-300">
                                                {work.title}
                                            </h3>
                                        </Link>
                                        <div className="text-sm text-muted-foreground">
                                            {work.venue}
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {work.description}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center gap-4 pt-2 text-xs">
                                        <Link
                                            href={`/work/${work.slug}`}
                                            className="group/link flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors duration-300"
                                        >
                                            <FileText className="w-3 h-3" />
                                            <span>Read More</span>
                                            <ArrowUpRight className="w-3 h-3 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                        </Link>

                                        {work.link && (
                                            <a
                                                href={work.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/link flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                            >
                                                <span>View Project</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Tags Column */}
                                <div className="sm:col-span-3 flex flex-wrap gap-2 sm:justify-end sm:items-start">
                                    {work.tags.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-2 py-1 text-xs text-muted-foreground border border-border/50 rounded group-hover:border-muted-foreground/30 transition-colors duration-500"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                    {work.tags.length > 3 && (
                                        <span className="px-2 py-1 text-xs text-muted-foreground">
                                            +{work.tags.length - 3}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        </motion.article>
                    ))}
                </motion.div>

                {/* View All Link */}
                {research.length > 4 && (
                    <motion.div
                        className="flex justify-center pt-4"
                        variants={titleVariants}
                    >
                        <Link
                            href="/work"
                            className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                        >
                            <span className="border-b border-border group-hover:border-muted-foreground/50 transition-colors duration-300">
                                View All Research
                            </span>
                            <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                        </Link>
                    </motion.div>
                )}
            </div>
        </motion.section>
    )
}
