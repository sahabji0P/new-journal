"use client"

import { Experience, calculateDuration, formatDateRange } from "@/lib/experience-types"
import { useNavPageConfig, DEFAULT_NAV_ITEMS } from "@/lib/nav-context"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, Calendar, Clock, MapPin } from "lucide-react"
import Link from "next/link"

interface ExperienceDetailClientProps {
    experience: Experience
}

// Animation variants
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

const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94] as const
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut" as const
        }
    }
}

const skillVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4, ease: "easeOut" as const }
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

export default function ExperienceDetailClient({ experience }: ExperienceDetailClientProps) {
    const duration = formatDateRange(experience.startDate, experience.endDate)
    const durationLength = calculateDuration(experience.startDate, experience.endDate)

    // Configure NavIsland for experience detail page
    // TOC will auto-detect h2 headings like "Key Highlights", "Technologies Used", etc.
    useNavPageConfig({
        navItems: DEFAULT_NAV_ITEMS,
        showTOC: true,
        contentSelector: "main",
        headingLevels: ["h2"],
        pageTitle: `${experience.role} at ${experience.company}`,
    })

    // Placeholder for gallery images - structure is ready for future content
    const galleryImages: string[] = []

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-4xl mx-auto px-8 lg:px-16 py-16">
                {/* Back Navigation */}
                <motion.div
                    className="mb-12"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Link
                        href="/#journey"
                        className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                        <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-300" />
                        <span>Back to Experience</span>
                    </Link>
                </motion.div>

                {/* Header Section */}
                <motion.header
                    className="space-y-8 mb-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Type Badge & Timeline */}
                    <motion.div
                        className="flex flex-wrap items-center gap-4"
                        variants={fadeUpVariants}
                    >
                        <span className={`px-3 py-1 text-xs rounded-full border capitalize ${getTypeBadgeStyles(experience.type)}`}>
                            {experience.type}
                        </span>
                        {experience.endDate === "Present" && (
                            <span className="px-3 py-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center gap-1.5">
                                <motion.span
                                    className="w-1.5 h-1.5 bg-green-400 rounded-full"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [1, 0.7, 1]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                />
                                Current Role
                            </span>
                        )}
                    </motion.div>

                    {/* Role Title */}
                    <motion.h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight"
                        variants={fadeUpVariants}
                    >
                        {experience.role}
                    </motion.h1>

                    {/* Company Name */}
                    <motion.div
                        className="flex items-center gap-3 text-xl sm:text-2xl text-muted-foreground"
                        variants={fadeUpVariants}
                    >
                        <Building2 className="w-6 h-6" />
                        <span>{experience.company}</span>
                    </motion.div>

                    {/* Description */}
                    <motion.p
                        className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl"
                        variants={fadeUpVariants}
                    >
                        {experience.description}
                    </motion.p>
                </motion.header>

                {/* Meta Grid */}
                <motion.div
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24 pb-16 border-b border-border"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Duration */}
                    <motion.div className="space-y-2" variants={itemVariants}>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-mono tracking-wider">TIMELINE</span>
                        </div>
                        <div className="text-foreground font-medium">{duration}</div>
                    </motion.div>

                    {/* Duration Length */}
                    <motion.div className="space-y-2" variants={itemVariants}>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-mono tracking-wider">DURATION</span>
                        </div>
                        <div className="text-foreground font-medium">{durationLength}</div>
                    </motion.div>

                    {/* Location */}
                    {experience.location && (
                        <motion.div className="space-y-2" variants={itemVariants}>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span className="text-xs font-mono tracking-wider">LOCATION</span>
                            </div>
                            <div className="text-foreground font-medium">{experience.location}</div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Key Highlights Section */}
                {experience.highlights && experience.highlights.length > 0 && (
                    <motion.section
                        className="mb-24"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={containerVariants}
                    >
                        <motion.div
                            className="flex items-center gap-4 mb-8"
                            variants={fadeUpVariants}
                        >
                            <h2 className="text-3xl font-light">Key Highlights</h2>
                            <div className="h-px flex-1 bg-border" />
                        </motion.div>

                        <motion.div
                            className="space-y-6"
                            variants={containerVariants}
                        >
                            {experience.highlights.map((highlight, index) => (
                                <motion.div
                                    key={index}
                                    className="group"
                                    variants={itemVariants}
                                >
                                    <motion.div
                                        className="flex gap-4 p-6 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                        whileHover={{
                                            x: 8,
                                            transition: { duration: 0.2 }
                                        }}
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                                            {index + 1}
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed flex-1 pt-1 group-hover:text-foreground transition-colors duration-300">
                                            {highlight}
                                        </p>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.section>
                )}

                {/* Skills/Technologies Section */}
                {experience.skills && experience.skills.length > 0 && (
                    <motion.section
                        className="mb-24"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={containerVariants}
                    >
                        <motion.div
                            className="flex items-center gap-4 mb-8"
                            variants={fadeUpVariants}
                        >
                            <h2 className="text-3xl font-light">Technologies Used</h2>
                            <div className="h-px flex-1 bg-border" />
                        </motion.div>

                        <motion.div
                            className="flex flex-wrap gap-3"
                            variants={containerVariants}
                        >
                            {experience.skills.map((skill) => (
                                <motion.span
                                    key={skill}
                                    variants={skillVariants}
                                    className="px-4 py-2 text-sm border border-border rounded-lg hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-300 cursor-default"
                                    whileHover={{
                                        y: -2,
                                        scale: 1.05,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    {skill}
                                </motion.span>
                            ))}
                        </motion.div>
                    </motion.section>
                )}

                {/* MDX Content Section - if there's additional content */}
                {experience.content && experience.content.trim() && (
                    <motion.section
                        className="mb-24"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={containerVariants}
                    >
                        <motion.div
                            className="flex items-center gap-4 mb-8"
                            variants={fadeUpVariants}
                        >
                            <h2 className="text-3xl font-light">More Details</h2>
                            <div className="h-px flex-1 bg-border" />
                        </motion.div>

                        <motion.div
                            className="prose prose-lg max-w-none prose-invert"
                            variants={fadeUpVariants}
                        >
                            <p className="text-muted-foreground leading-relaxed">
                                {experience.content}
                            </p>
                        </motion.div>
                    </motion.section>
                )}

                {/* Gallery Section Placeholder */}
                {galleryImages.length > 0 && (
                    <motion.section
                        className="mb-24"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={containerVariants}
                    >
                        <motion.div
                            className="flex items-center gap-4 mb-8"
                            variants={fadeUpVariants}
                        >
                            <h2 className="text-3xl font-light">Gallery</h2>
                            <div className="h-px flex-1 bg-border" />
                        </motion.div>

                        <motion.div
                            className="grid sm:grid-cols-2 gap-6"
                            variants={containerVariants}
                        >
                            {galleryImages.map((image, index) => (
                                <motion.div
                                    key={index}
                                    className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted/30"
                                    variants={itemVariants}
                                    whileHover={{
                                        scale: 1.02,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    {/* Placeholder for actual images */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                                        <span className="text-4xl font-light text-muted-foreground/30">
                                            {index + 1}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.section>
                )}

                {/* Navigation Footer */}
                <motion.footer
                    className="pt-16 border-t border-border"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                        <Link
                            href="/#journey"
                            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                        >
                            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-300" />
                            <span>Back to All Experience</span>
                        </Link>

                        <div className="text-sm text-muted-foreground font-mono">
                            {experience.company} / {experience.role}
                        </div>
                    </div>
                </motion.footer>

                {/* Footer spacer for nav island */}
                <div className="pb-24" />
            </main>
        </div>
    )
}
