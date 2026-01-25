"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ExternalLink } from "lucide-react"
import Link from "next/link"

export interface ProjectData {
    slug: string
    name: string
    shortDescription: string
    tech: string[]
    liveUrl?: string
    featured?: boolean
}

interface ProjectsSectionProps {
    sectionRef: (el: HTMLElement | null) => void
    projects: ProjectData[]
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

export default function ProjectsSection({ sectionRef, projects }: ProjectsSectionProps) {
    const displayProjects = projects.slice(0, 4)

    return (
        <motion.section
            id="projects"
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
                            BUILDING SOLUTIONS
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                            Featured <span className="text-muted-foreground">Projects</span>
                        </h2>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground font-mono">
                        2022 — {new Date().getFullYear()}
                    </div>
                </motion.div>

                {/* Projects Grid */}
                <motion.div
                    className="grid sm:grid-cols-2 gap-6"
                    variants={containerVariants}
                >
                    {displayProjects.map((project) => (
                        <motion.article
                            key={project.slug}
                            variants={itemVariants}
                            className="group"
                        >
                            <motion.div
                                className="h-full border border-border/50 rounded-xl overflow-hidden bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                whileHover={{
                                    y: -6,
                                    transition: { duration: 0.2 }
                                }}
                            >
                                <Link href={`/projects/${project.slug}`}>
                                    <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                                        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30 flex items-center justify-center">
                                            <motion.span
                                                className="text-4xl font-light text-muted-foreground/30"
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {project.name.charAt(0)}
                                            </motion.span>
                                        </div>
                                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-500" />
                                    </div>
                                </Link>

                                <div className="p-6 space-y-4">
                                    <Link href={`/projects/${project.slug}`}>
                                        <h3 className="text-lg font-medium tracking-tight group-hover:text-muted-foreground transition-colors duration-300">
                                            {project.name}
                                        </h3>
                                    </Link>

                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                        {project.shortDescription}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {project.tech.slice(0, 3).map((tech) => (
                                            <span
                                                key={tech}
                                                className="px-2 py-1 text-xs text-muted-foreground border border-border/50 rounded group-hover:border-muted-foreground/30 transition-colors duration-300"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                        {project.tech.length > 3 && (
                                            <span className="px-2 py-1 text-xs text-muted-foreground">
                                                +{project.tech.length - 3}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 pt-2 text-xs">
                                        <Link
                                            href={`/projects/${project.slug}`}
                                            className="group/link flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors duration-300"
                                        >
                                            <span>Details</span>
                                            <ArrowUpRight className="w-3 h-3 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                        </Link>

                                        {project.liveUrl && (
                                            <a
                                                href={project.liveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/link flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                            >
                                                <span>Live</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.article>
                    ))}
                </motion.div>

                {/* View All Link */}
                <motion.div
                    className="flex justify-center pt-4"
                    variants={titleVariants}
                >
                    <Link
                        href="/projects"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                        <span className="border-b border-border group-hover:border-muted-foreground/50 transition-colors duration-300">
                            View All Projects
                        </span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </motion.div>
            </div>
        </motion.section>
    )
}
