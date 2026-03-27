"use client"

import type { JournalFeedItem } from "@/lib/journal-feed"
import { motion, useInView, useScroll, useTransform } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

interface HorizontalJourneyProps {
    journey: JournalFeedItem[]
}

const TYPE_COLORS: Record<string, string> = {
    "full-time": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    internship: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    contract: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    freelance: "bg-violet-500/20 text-violet-400 border-violet-500/30",
}

function getTypeColor(tags: string[]): string {
    for (const tag of tags) {
        const lower = tag.toLowerCase()
        if (lower in TYPE_COLORS) return TYPE_COLORS[lower]
    }
    return "bg-muted/20 text-muted-foreground border-border/50"
}

function getTypeLabel(tags: string[]): string | null {
    for (const tag of tags) {
        const lower = tag.toLowerCase()
        if (lower in TYPE_COLORS) return tag
    }
    return null
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

function JourneyCard({ item }: { item: JournalFeedItem }) {
    const typeLabel = getTypeLabel(item.tags)
    const typeColor = getTypeColor(item.tags)
    const otherTags = item.tags.filter(
        (t) => !(t.toLowerCase() in TYPE_COLORS)
    )

    return (
        <div className="w-[80vw] max-w-3xl shrink-0 px-4">
            <div className="h-full rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-8 space-y-4 transition-colors hover:border-border/80">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h3 className="text-xl sm:text-2xl font-medium">
                            {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(item.date)}
                        </p>
                    </div>
                    {typeLabel && (
                        <span
                            className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium ${typeColor}`}
                        >
                            {typeLabel}
                        </span>
                    )}
                </div>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {item.summary}
                </p>

                {otherTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {otherTags.map((tag) => (
                            <span
                                key={`${item.id}-${tag}`}
                                className="px-2.5 py-1 rounded-full border border-border/80 text-xs text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {item.href && (
                    <Link
                        href={item.href}
                        className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-lime-400 transition-colors"
                    >
                        View details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        </div>
    )
}

function MobileJourneyCard({ item, index }: { item: JournalFeedItem; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { once: true, margin: "-80px" })
    const typeLabel = getTypeLabel(item.tags)
    const typeColor = getTypeColor(item.tags)
    const otherTags = item.tags.filter(
        (t) => !(t.toLowerCase() in TYPE_COLORS)
    )

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5, delay: index * 0.08, type: "spring", stiffness: 200, damping: 26 }}
            className="relative pl-8"
        >
            {/* Timeline dot */}
            <div className="absolute left-0 top-3 w-3 h-3 rounded-full border-2 border-lime-400 bg-background z-10" />

            <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <h3 className="text-lg font-medium">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">
                            {formatDate(item.date)}
                        </p>
                    </div>
                    {typeLabel && (
                        <span
                            className={`shrink-0 px-2 py-0.5 rounded-full border text-xs font-medium ${typeColor}`}
                        >
                            {typeLabel}
                        </span>
                    )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.summary}
                </p>

                {otherTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {otherTags.map((tag) => (
                            <span
                                key={`${item.id}-mob-${tag}`}
                                className="px-2 py-0.5 rounded-full border border-border/80 text-xs text-muted-foreground"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {item.href && (
                    <Link
                        href={item.href}
                        className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-lime-400 transition-colors"
                    >
                        View details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        </motion.div>
    )
}

function DesktopJourney({ journey }: { journey: JournalFeedItem[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    })

    const x = useTransform(
        scrollYProgress,
        [0, 1],
        ["0%", `-${(journey.length - 1) * 100}%`]
    )

    const timelineWidth = useTransform(
        scrollYProgress,
        [0, 1],
        ["0%", "100%"]
    )

    return (
        <div
            ref={containerRef}
            style={{ height: `${journey.length * 100}vh` }}
        >
            <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
                {/* Section header */}
                <div className="px-6 sm:px-8 lg:px-12 mb-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Journey
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                        Where I have been building
                    </h2>
                </div>

                {/* Horizontal track */}
                <motion.div
                    style={{ x }}
                    className="flex items-start pl-6 sm:pl-8 lg:pl-12"
                >
                    {journey.map((item) => (
                        <JourneyCard key={item.id} item={item} />
                    ))}
                </motion.div>

                {/* Timeline bar */}
                <div className="absolute bottom-20 left-12 right-12">
                    <div className="relative h-px bg-border/40">
                        <motion.div
                            style={{ width: timelineWidth }}
                            className="absolute top-0 left-0 h-px bg-lime-400"
                        />
                        {journey.map((_, index) => {
                            const position = journey.length > 1
                                ? (index / (journey.length - 1)) * 100
                                : 0
                            return (
                                <TimelineDot
                                    key={`dot-${index}`}
                                    position={position}
                                    index={index}
                                    total={journey.length}
                                    scrollProgress={scrollYProgress}
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function TimelineDot({
    position,
    index,
    total,
    scrollProgress,
}: {
    position: number
    index: number
    total: number
    scrollProgress: ReturnType<typeof useScroll>["scrollYProgress"]
}) {
    const threshold = total > 1 ? index / (total - 1) : 0
    const isActiveOpacity = useTransform(
        scrollProgress,
        [Math.max(0, threshold - 0.05), threshold],
        [0.4, 1]
    )
    const dotScale = useTransform(
        scrollProgress,
        [Math.max(0, threshold - 0.05), threshold, Math.min(1, threshold + 0.15)],
        [1, 1.5, 1]
    )

    return (
        <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
                left: `${position}%`,
                opacity: isActiveOpacity,
                scale: dotScale,
            }}
        >
            <div className="w-2.5 h-2.5 rounded-full bg-lime-400 -translate-x-1/2" />
        </motion.div>
    )
}

function MobileJourney({ journey }: { journey: JournalFeedItem[] }) {
    return (
        <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[5px] top-3 bottom-3 w-px bg-border/40" />

            <div className="space-y-4">
                {journey.map((item, index) => (
                    <MobileJourneyCard key={item.id} item={item} index={index} />
                ))}
            </div>
        </div>
    )
}

export function HorizontalJourney({ journey }: HorizontalJourneyProps) {
    if (journey.length === 0) return null

    return (
        <section id="journey">
            {/* Desktop: horizontal scroll */}
            <div className="hidden lg:block">
                <DesktopJourney journey={journey} />
            </div>

            {/* Mobile: vertical stack */}
            <div className="lg:hidden py-24">
                <div className="space-y-2 mb-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Journey
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight">
                        Where I have been building
                    </h2>
                </div>
                <MobileJourney journey={journey} />
            </div>
        </section>
    )
}
