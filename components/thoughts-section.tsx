"use client"

import { motion } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

export interface ThoughtData {
    slug: string
    title: string
    excerpt: string
    date: string
    readTime: string
    category: string
}

interface ThoughtsSectionProps {
    sectionRef: (el: HTMLElement | null) => void
    thoughts: ThoughtData[]
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 25 },
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

export default function ThoughtsSection({ sectionRef, thoughts }: ThoughtsSectionProps) {
    const displayThoughts = thoughts.slice(0, 3)

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return (
        <motion.section
            id="thoughts"
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
                            WRITING & IDEAS
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                            Recent <span className="text-muted-foreground">Thoughts</span>
                        </h2>
                    </div>
                    <div className="hidden sm:block text-sm text-muted-foreground font-mono">
                        {thoughts.length} ARTICLES
                    </div>
                </motion.div>

                {/* Thoughts List */}
                <motion.div
                    className="space-y-5"
                    variants={containerVariants}
                >
                    {displayThoughts.map((post) => (
                        <motion.div
                            key={post.slug}
                            variants={itemVariants}
                        >
                            <Link
                                href={`/thoughts/${post.slug}`}
                                className="group block"
                            >
                                <motion.article
                                    className="p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-muted-foreground/50 hover:bg-card/50 transition-all duration-500"
                                    whileHover={{
                                        x: 8,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <h3 className="text-lg sm:text-xl font-medium tracking-tight group-hover:text-muted-foreground transition-colors duration-300">
                                                    {post.title}
                                                </h3>
                                                <motion.div
                                                    whileHover={{ x: 2, y: -2 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors duration-300 flex-shrink-0" />
                                                </motion.div>
                                            </div>

                                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2">
                                                {post.excerpt}
                                            </p>

                                            {/* Category Tag */}
                                            <div className="flex items-center gap-3">
                                                <span className="px-2 py-0.5 text-xs text-muted-foreground border border-border/50 rounded capitalize">
                                                    {post.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-muted-foreground font-mono shrink-0">
                                            <span>{formatDate(post.date)}</span>
                                            <span className="hidden sm:block">{post.readTime}</span>
                                            <span className="sm:hidden">· {post.readTime}</span>
                                        </div>
                                    </div>
                                </motion.article>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                {/* View All Link */}
                <motion.div
                    className="flex justify-center pt-4"
                    variants={titleVariants}
                >
                    <Link
                        href="/thoughts"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                        <span className="border-b border-border group-hover:border-muted-foreground/50 transition-colors duration-300">
                            View All Thoughts
                        </span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </motion.div>
            </div>
        </motion.section>
    )
}
