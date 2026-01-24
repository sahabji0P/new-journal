"use client"

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

export default function ProjectsSection({ sectionRef, projects }: ProjectsSectionProps) {
    const displayProjects = projects.slice(0, 4)

    return (
        <section
            id="projects"
            ref={sectionRef}
            className="min-h-screen py-32 opacity-0"
        >
            <div className="space-y-16">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <h2 className="text-3xl sm:text-4xl font-light">Selected Projects</h2>
                        <p className="text-muted-foreground">Building solutions that matter</p>
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">2022 — {new Date().getFullYear()}</div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    {displayProjects.map((project) => (
                        <article
                            key={project.slug}
                            className="group border border-border rounded-lg overflow-hidden hover:border-muted-foreground/50 transition-all duration-500 hover:shadow-lg"
                        >
                            <Link href={`/projects/${project.slug}`}>
                                <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                                        <span className="text-3xl font-light text-muted-foreground/30">
                                            {project.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-500" />
                                </div>
                            </Link>

                            <div className="p-6 space-y-4">
                                <Link href={`/projects/${project.slug}`}>
                                    <h3 className="text-lg font-medium group-hover:text-muted-foreground transition-colors duration-300">
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
                                            className="px-2 py-1 text-xs text-muted-foreground border border-border/50 rounded"
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
                        </article>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <Link
                        href="/projects"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-border hover:border-muted-foreground/50"
                    >
                        <span>View All Projects</span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
