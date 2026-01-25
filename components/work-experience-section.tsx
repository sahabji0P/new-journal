"use client"

import { Experience, calculateDuration, formatDateRange } from "@/lib/experience-types"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Building2, Calendar, ChevronDown, MapPin } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface WorkExperienceSectionProps {
    sectionRef: (el: HTMLElement | null) => void
    experiences: Experience[]
}

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

const expandVariants = {
    hidden: {
        opacity: 0,
        height: 0,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94] as const
        }
    },
    visible: {
        opacity: 1,
        height: "auto",
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94] as const
        }
    }
}

function getTypeBadgeStyles(type: Experience["type"]): string {
    switch (type) {
        case "full-time":
            return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        case "internship":
            return "border-blue-500/30 bg-blue-500/10 text-blue-400"
        case "contract":
            return "border-amber-500/30 bg-amber-500/10 text-amber-400"
        case "freelance":
            return "border-purple-500/30 bg-purple-500/10 text-purple-400"
        default:
            return "border-border/50"
    }
}

export default function WorkExperienceSection({ sectionRef, experiences }: WorkExperienceSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const toggleExpand = (slug: string) => {
        setExpandedId(expandedId === slug ? null : slug)
    }

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
                        {experiences.map((exp) => {
                            const isExpanded = expandedId === exp.slug
                            const duration = formatDateRange(exp.startDate, exp.endDate)
                            const durationLength = calculateDuration(exp.startDate, exp.endDate)

                            return (
                                <motion.div
                                    key={exp.slug}
                                    variants={itemVariants}
                                    className="group relative"
                                >
                                    {/* Timeline dot */}
                                    <motion.div
                                        className="absolute left-0 top-6 w-2 h-2 -translate-x-[3px] rounded-full bg-muted-foreground/50 group-hover:bg-foreground transition-all duration-300 hidden sm:block"
                                        animate={{
                                            scale: isExpanded ? 1.5 : 1,
                                            backgroundColor: isExpanded ? "var(--foreground)" : undefined
                                        }}
                                        transition={{ duration: 0.2 }}
                                    />

                                    <motion.div
                                        className="sm:ml-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500 overflow-hidden"
                                        whileHover={{
                                            y: isExpanded ? 0 : -4,
                                            transition: { duration: 0.2 }
                                        }}
                                    >
                                        {/* Collapsed View - Always Visible */}
                                        <button
                                            onClick={() => toggleExpand(exp.slug)}
                                            className="w-full p-6 sm:p-8 text-left cursor-pointer"
                                            aria-expanded={isExpanded}
                                            aria-controls={`exp-details-${exp.slug}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    {/* Company & Role */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                                                            <Building2 className="w-4 h-4" />
                                                            <span className="text-sm">{exp.company}</span>
                                                            <span className={`px-2 py-0.5 text-xs rounded-full border capitalize ${getTypeBadgeStyles(exp.type)}`}>
                                                                {exp.type}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl sm:text-2xl font-medium tracking-tight group-hover:text-muted-foreground transition-colors duration-300">
                                                            {exp.role}
                                                        </h3>
                                                    </div>

                                                    {/* Short Description */}
                                                    <p className="text-muted-foreground leading-relaxed max-w-xl line-clamp-2">
                                                        {exp.description}
                                                    </p>
                                                </div>

                                                {/* Duration & Expand Icon */}
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground font-mono">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            <span>{duration}</span>
                                                        </div>
                                                        <span className="text-xs opacity-60">{durationLength}</span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Details */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    id={`exp-details-${exp.slug}`}
                                                    variants={expandVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="hidden"
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-6 border-t border-border/30">
                                                        {/* Location */}
                                                        {exp.location && (
                                                            <motion.div
                                                                className="flex items-center gap-2 text-sm text-muted-foreground pt-6"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.1 }}
                                                            >
                                                                <MapPin className="w-4 h-4" />
                                                                <span>{exp.location}</span>
                                                            </motion.div>
                                                        )}

                                                        {/* Highlights */}
                                                        {exp.highlights && exp.highlights.length > 0 && (
                                                            <motion.div
                                                                className="space-y-3"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.15 }}
                                                            >
                                                                <h4 className="text-sm font-mono text-muted-foreground tracking-wider">
                                                                    KEY HIGHLIGHTS
                                                                </h4>
                                                                <ul className="space-y-2">
                                                                    {exp.highlights.map((highlight, index) => (
                                                                        <motion.li
                                                                            key={index}
                                                                            className="flex items-start gap-3 text-sm text-muted-foreground"
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: 0.2 + index * 0.05 }}
                                                                        >
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                                                                            <span>{highlight}</span>
                                                                        </motion.li>
                                                                    ))}
                                                                </ul>
                                                            </motion.div>
                                                        )}

                                                        {/* Skills */}
                                                        {exp.skills && exp.skills.length > 0 && (
                                                            <motion.div
                                                                className="space-y-3"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.25 }}
                                                            >
                                                                <h4 className="text-sm font-mono text-muted-foreground tracking-wider">
                                                                    TECHNOLOGIES
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {exp.skills.map((skill, index) => (
                                                                        <motion.span
                                                                            key={skill}
                                                                            className="px-3 py-1 text-xs border border-border/50 rounded-full text-muted-foreground hover:border-muted-foreground/50 transition-colors duration-300"
                                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            transition={{ delay: 0.3 + index * 0.03 }}
                                                                        >
                                                                            {skill}
                                                                        </motion.span>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}

                                                        {/* View Full Details Link */}
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.35 }}
                                                        >
                                                            <Link
                                                                href={`/exp/${exp.slug}`}
                                                                className="group/link inline-flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors duration-300"
                                                            >
                                                                <span className="border-b border-border group-hover/link:border-muted-foreground/50 transition-colors duration-300">
                                                                    View Full Details
                                                                </span>
                                                                <ArrowUpRight className="w-4 h-4 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                                            </Link>
                                                        </motion.div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </motion.div>
                            )
                        })}
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
