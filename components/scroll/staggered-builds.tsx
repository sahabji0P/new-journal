"use client"

import type { JournalFeedItem } from "@/lib/journal-feed"
import { motion, useInView } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

interface StaggeredBuildsProps {
    builds: JournalFeedItem[]
}

function formatDate(value: string): string {
    if (!value) return "Recent"
    if (/^\d{4}-\d{2}$/.test(value)) {
        const [year, month] = value.split("-")
        const date = new Date(Number(year), Number(month) - 1, 1)
        return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function BuildCard({ item, index }: { item: JournalFeedItem; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { once: true, margin: "-60px" })

    const isEven = index % 2 === 0
    const isFeatured = item.priority >= 2

    return (
        <motion.div
            ref={cardRef}
            initial={{
                opacity: 0,
                y: 30,
                x: isEven ? -20 : 20,
            }}
            animate={
                isInView
                    ? { opacity: 1, y: 0, x: 0 }
                    : { opacity: 0, y: 30, x: isEven ? -20 : 20 }
            }
            transition={{
                duration: 0.5,
                delay: index * 0.1,
                type: "spring",
                stiffness: 200,
                damping: 26,
            }}
            className={isFeatured ? "sm:col-span-2" : ""}
        >
            <Link href={item.href ?? "#"} className="group block h-full">
                <div className="h-full rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 sm:p-6 space-y-4 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-border/80 group-hover:shadow-lg group-hover:shadow-lime-400/5">
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg sm:text-xl font-medium group-hover:text-lime-400 transition-colors">
                            {item.title}
                        </h3>
                        <ArrowUpRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-lime-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {item.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        {item.tags.map((tag) => (
                            <span
                                key={`${item.id}-${tag}`}
                                className="px-2 py-0.5 rounded-full border border-border/80 text-xs text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                        <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(item.date)}
                        </span>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

export function StaggeredBuilds({ builds }: StaggeredBuildsProps) {
    const headingRef = useRef<HTMLDivElement>(null)
    const headingInView = useInView(headingRef, { once: true, margin: "-60px" })

    if (builds.length === 0) return null

    return (
        <section id="builds" className="py-24">
            <motion.div
                ref={headingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={headingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="space-y-2 mb-10"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Selected Builds
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                    Work I have shipped
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                    A curated set of projects that best represent my work.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {builds.map((item, index) => (
                    <BuildCard key={item.id} item={item} index={index} />
                ))}
            </div>
        </section>
    )
}
