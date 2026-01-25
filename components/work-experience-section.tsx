"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, Building2, Calendar } from "lucide-react"
import Link from "next/link"

export interface WorkExperienceData {
    id: string
    company: string
    role: string
    duration: string
    description: string
    type: "full-time" | "internship" | "contract" | "freelance"
}

interface WorkExperienceSectionProps {
    sectionRef: (el: HTMLElement | null) => void
}

// Placeholder data - to be replaced with actual experience
const experiences: WorkExperienceData[] = [
    {
        id: "1",
        company: "Tech Company",
        role: "Software Engineer",
        duration: "2024 — Present",
        description: "Building scalable backend systems and AI-powered features.",
        type: "full-time"
    },
    {
        id: "2",
        company: "AI Startup",
        role: "ML Engineering Intern",
        duration: "Summer 2023",
        description: "Developed RAG pipelines and vector search implementations.",
        type: "internship"
    },
    {
        id: "3",
        company: "Open Source",
        role: "Contributor",
        duration: "2022 — Present",
        description: "Contributing to developer tools and frameworks.",
        type: "freelance"
    }
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1
        }
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

const titleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as const }
    }
}

export default function WorkExperienceSection({ sectionRef }: WorkExperienceSectionProps) {
    return (
        <motion.section
            id="journey"
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
                            WHERE I&apos;VE BEEN
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                            The Journey <span className="text-muted-foreground">So Far</span>
                        </h2>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground font-mono">
                        {experiences.length} ROLES
                    </div>
                </motion.div>

                {/* Experience Timeline */}
                <motion.div
                    className="relative"
                    variants={containerVariants}
                >
                    {/* Timeline line */}
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-border via-muted-foreground/30 to-border hidden sm:block" />

                    <div className="space-y-8">
                        {experiences.map((exp) => (
                            <motion.div
                                key={exp.id}
                                variants={itemVariants}
                                className="group relative"
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-0 top-6 w-2 h-2 -translate-x-[3px] rounded-full bg-muted-foreground/50 group-hover:bg-foreground group-hover:scale-125 transition-all duration-300 hidden sm:block" />

                                <motion.div
                                    className="sm:ml-8 p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                    whileHover={{
                                        y: -4,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            {/* Company & Role */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Building2 className="w-4 h-4" />
                                                    <span className="text-sm">{exp.company}</span>
                                                    <span className="px-2 py-0.5 text-xs rounded-full border border-border/50 capitalize">
                                                        {exp.type}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-medium tracking-tight group-hover:text-muted-foreground transition-colors duration-300">
                                                    {exp.role}
                                                </h3>
                                            </div>

                                            {/* Description */}
                                            <p className="text-muted-foreground leading-relaxed max-w-xl">
                                                {exp.description}
                                            </p>
                                        </div>

                                        {/* Duration */}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono shrink-0">
                                            <Calendar className="w-4 h-4" />
                                            <span>{exp.duration}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* View All Link */}
                <motion.div
                    className="flex justify-center pt-4"
                    variants={titleVariants}
                >
                    <Link
                        href="/experience"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                        <span className="border-b border-border group-hover:border-muted-foreground/50 transition-colors duration-300">
                            View Full Experience
                        </span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </motion.div>
            </div>
        </motion.section>
    )
}
