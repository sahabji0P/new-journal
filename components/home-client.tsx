"use client"

import ProjectsSection, { ProjectData } from "@/components/project-section"
import ResearchSection, { ResearchData } from "@/components/research-section"
import ThoughtsSection, { ThoughtData } from "@/components/thoughts-section"
import WorkExperienceSection from "@/components/work-experience-section"
import { Experience } from "@/lib/experience-types"
import { HOME_SECTION_ITEMS, useNavPageConfig } from "@/lib/nav-context"
import { motion, useScroll, useTransform } from "framer-motion"
import { Briefcase, MapPin } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useRef } from "react"

interface HomeClientProps {
    projects: ProjectData[]
    thoughts: ThoughtData[]
    experiences: Experience[]
    research: ResearchData[]
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.2
        }
    }
}

const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" as const }
    }
}

const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" as const }
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

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.8
        }
    }
}

// Get time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 16) return "Good afternoon"
    return "Good evening"
}

export default function HomeClient({ projects, thoughts, experiences, research }: HomeClientProps) {
    const { theme, setTheme } = useTheme()
    const containerRef = useRef<HTMLDivElement>(null)
    const sectionsRef = useRef<(HTMLElement | null)[]>([])

    // Configure NavIsland for home page with section-based navigation
    // Manual sections for the "On this page" TOC panel
    const homeSections = [
        { id: "intro", title: "Introduction", level: 2 },
        { id: "journey", title: "The Journey", level: 2 },
        { id: "work", title: "Research & Work", level: 2 },
        { id: "projects", title: "Projects", level: 2 },
        { id: "thoughts", title: "Thoughts", level: 2 },
        { id: "connect", title: "Connect", level: 2 },
    ]

    useNavPageConfig({
        navItems: HOME_SECTION_ITEMS,
        showTOC: true, // Enable TOC to show "On this page" sections
        manualSections: homeSections,
        pageTitle: "Home",
    })

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    })

    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    const isDark = theme === "dark"

    const firstName = "Shashwat"
    const lastName = "Jain"

    const skills = [
        "Python", "Next.js", "FastAPI", "System Design",
        "RAGs", "Vector DB", "Redis", "TypeScript",
        "React", "C++", "Docker", "Kubernetes", "AWS"
    ]

    return (
        <div ref={containerRef} className="min-h-screen bg-background text-foreground relative overflow-hidden">
            {/* Subtle background gradient */}
            <motion.div
                className="fixed inset-0 pointer-events-none opacity-30"
                style={{ y: backgroundY }}
            >
                <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-muted/50 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-muted/30 to-transparent rounded-full blur-3xl" />
            </motion.div>

            <main className="max-w-4xl mx-auto px-8 lg:px-16 relative z-10">
                {/* Hero Section */}
                <header
                    id="intro"
                    ref={(el) => { sectionsRef.current[0] = el }}
                    className="min-h-screen flex items-center py-20"
                >
                    <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 w-full">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-3 space-y-10">
                            {/* Greeting & Name */}
                            <div className="space-y-4">
                                <motion.div
                                    className="text-sm text-muted-foreground font-mono tracking-wider"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                >
                                    {getGreeting()} — PORTFOLIO / {new Date().getFullYear()}
                                </motion.div>

                                {/* Animated Name */}
                                <div className="space-y-2">
                                    <motion.h1
                                        className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {firstName.split("").map((letter, index) => (
                                            <motion.span
                                                key={`first-${index}`}
                                                variants={letterVariants}
                                                className="inline-block"
                                            >
                                                {letter}
                                            </motion.span>
                                        ))}
                                    </motion.h1>
                                    <motion.h1
                                        className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight text-muted-foreground"
                                        variants={containerVariants}
                                        initial="hidden"
                                        animate="visible"
                                        transition={{ delayChildren: 0.4 }}
                                    >
                                        {lastName.split("").map((letter, index) => (
                                            <motion.span
                                                key={`last-${index}`}
                                                variants={letterVariants}
                                                className="inline-block"
                                            >
                                                {letter}
                                            </motion.span>
                                        ))}
                                    </motion.h1>
                                </div>
                            </div>

                            {/* Description */}
                            <motion.div
                                className="space-y-6 max-w-lg"
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: 0.6 }}
                            >
                                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                                    Software engineer crafting digital experiences and backend systems at the intersection of
                                    <span className="text-foreground font-medium"> design</span>,
                                    <span className="text-foreground font-medium"> scalability</span>,
                                    <span className="text-foreground font-medium"> technology</span>, and
                                    <span className="text-foreground font-medium"> human behavior</span>.
                                </p>

                                {/* Status Row */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-muted-foreground">
                                    <motion.div
                                        className="flex items-center gap-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                    >
                                        <motion.div
                                            className="w-2 h-2 bg-green-500 rounded-full"
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
                                        Available for work
                                    </motion.div>
                                    <motion.div
                                        className="flex items-center gap-2"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.9 }}
                                    >
                                        <MapPin className="w-3 h-3" />
                                        Uttar Pradesh, India
                                    </motion.div>
                                </div>

                                {/* Resume Link */}
                                <motion.div
                                    className="flex items-center space-x-4 pt-2"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1 }}
                                >
                                    <motion.a
                                        href="https://drive.google.com/file/d/13tx0V2x1mNvv6-aYam3mdQGuMH78ro3x/view"
                                        className="group inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-300"
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Briefcase className="w-4 h-4" />
                                        <span>Resume</span>
                                    </motion.a>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Right Column - Currently & Skills */}
                        <div className="lg:col-span-2 flex flex-col justify-center space-y-10">
                            {/* Currently */}
                            <motion.div
                                className="space-y-4"
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: 0.5 }}
                            >
                                <div className="text-sm text-muted-foreground font-mono tracking-wider">CURRENTLY</div>
                                <motion.div
                                    className="p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm space-y-2"
                                    whileHover={{
                                        borderColor: "var(--muted-foreground)",
                                        transition: { duration: 0.3 }
                                    }}
                                >
                                    <div className="text-foreground font-medium">Engineering Student</div>
                                    <div className="text-muted-foreground">@ Bennett University</div>
                                    <div className="text-xs text-muted-foreground font-mono">2022 — Present</div>
                                </motion.div>
                            </motion.div>

                            {/* Skills */}
                            <motion.div
                                className="space-y-4"
                                variants={fadeUpVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: 0.6 }}
                            >
                                <div className="text-sm text-muted-foreground font-mono tracking-wider">FOCUS</div>
                                <motion.div
                                    className="flex flex-wrap gap-2"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {skills.map((skill) => (
                                        <motion.span
                                            key={skill}
                                            variants={skillVariants}
                                            className="px-3 py-1.5 text-xs border border-border rounded-full hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-300 cursor-default"
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
                            </motion.div>
                        </div>
                    </div>
                </header>

                {/* Work Experience Section - NEW */}
                <WorkExperienceSection
                    sectionRef={(el: HTMLElement | null) => { sectionsRef.current[1] = el }}
                    experiences={experiences}
                />

                {/* Selected Work (Research/Papers) */}
                <ResearchSection
                    sectionRef={(el: HTMLElement | null) => { sectionsRef.current[2] = el }}
                    research={research}
                />

                {/* Projects Section */}
                <ProjectsSection
                    sectionRef={(el: HTMLElement | null) => { sectionsRef.current[3] = el }}
                    projects={projects}
                />

                {/* Thoughts Section */}
                <ThoughtsSection
                    sectionRef={(el: HTMLElement | null) => { sectionsRef.current[4] = el }}
                    thoughts={thoughts}
                />

                {/* Connect Section */}
                <motion.section
                    id="connect"
                    ref={(el) => { sectionsRef.current[5] = el }}
                    className="py-32"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <div className="grid lg:grid-cols-2 gap-16">
                        <motion.div className="space-y-8" variants={fadeUpVariants}>
                            <div className="space-y-3">
                                <div className="text-sm text-muted-foreground font-mono tracking-wider">
                                    GET IN TOUCH
                                </div>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                                    Let&apos;s <span className="text-muted-foreground">Connect</span>
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                                    Always interested in new opportunities, collaborations, and conversations about technology and design.
                                </p>

                                <motion.div className="space-y-4">
                                    <Link
                                        href="mailto:shashwat@example.com"
                                        className="group flex items-center gap-3 text-foreground hover:text-muted-foreground transition-colors duration-300"
                                    >
                                        <span className="text-base sm:text-lg animated-underline">shashwat@example.com</span>
                                        <motion.svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            whileHover={{ x: 4 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                        </motion.svg>
                                    </Link>
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div className="space-y-8" variants={fadeUpVariants}>
                            <div className="text-sm text-muted-foreground font-mono tracking-wider">ELSEWHERE</div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { name: "GitHub", handle: "@sahabji0P", url: "https://github.com/sahabji0P" },
                                    { name: "Twitter", handle: "@itsshashwatj", url: "https://twitter.com/itsshashwatj" },
                                    { name: "LinkedIn", handle: "@itsshashwatjain", url: "https://linkedin.com/in/itsshashwatjain" }
                                ].map((social) => (
                                    <motion.a
                                        key={social.name}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-300"
                                        whileHover={{ y: -4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="space-y-2">
                                            <div className="text-foreground group-hover:text-muted-foreground transition-colors duration-300 font-medium">
                                                {social.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground font-mono">{social.handle}</div>
                                        </div>
                                    </motion.a>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Footer */}
                <footer className="py-16 border-t border-border">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                © {new Date().getFullYear()} Shashwat Jain. All rights reserved.
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Built with Next.js, Tailwind CSS & Framer Motion
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={toggleTheme}
                                className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                                aria-label="Toggle theme"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
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
                            </motion.button>

                            <motion.button
                                className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label="Chat"
                            >
                                <svg
                                    className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </motion.button>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    )
}
