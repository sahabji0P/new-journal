"use client"

import type { JournalFeedItem } from "@/lib/journal-feed"
import { motion, useInView } from "framer-motion"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useRef } from "react"

interface EditorialNotesProps {
    notes: JournalFeedItem[]
}

function formatDate(value: string): string {
    if (!value) return "Recent"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    })
}

function FeaturedNoteCard({ item }: { item: JournalFeedItem }) {
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { once: true, margin: "-60px" })

    const category = item.tags[0]
    const readTime = item.tags[1]

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 180, damping: 28 }}
        >
            <Link href={item.href ?? "#"} className="group block">
                <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-8 lg:p-10 space-y-4 transition-all duration-300 group-hover:border-border/80">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {category && (
                            <span className="px-2.5 py-1 rounded-full border border-lime-400/30 text-lime-400 font-medium">
                                {category}
                            </span>
                        )}
                        <span>{formatDate(item.date)}</span>
                        {readTime && <span>{readTime}</span>}
                    </div>

                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight group-hover:text-lime-400 transition-colors">
                        <span className="bg-gradient-to-r from-current to-current bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-all duration-500 group-hover:bg-[length:100%_1px]">
                            {item.title}
                        </span>
                    </h3>

                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                        {item.summary}
                    </p>

                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground group-hover:text-lime-400 transition-colors">
                        Read more
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                </div>
            </Link>
        </motion.div>
    )
}

function NoteCard({ item, index }: { item: JournalFeedItem; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { once: true, margin: "-60px" })

    const category = item.tags[0]
    const readTime = item.tags[1]

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{
                duration: 0.5,
                delay: index * 0.08,
                type: "spring",
                stiffness: 200,
                damping: 26,
            }}
        >
            <Link href={item.href ?? "#"} className="group block h-full">
                <div className="h-full rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 sm:p-6 space-y-3 transition-all duration-300 group-hover:border-border/80">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {category && (
                            <span className="px-2 py-0.5 rounded-full border border-border/80 font-medium">
                                {category}
                            </span>
                        )}
                        {readTime && <span>{readTime}</span>}
                    </div>

                    <h3 className="text-lg font-medium group-hover:text-lime-400 transition-colors">
                        <span className="bg-gradient-to-r from-current to-current bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-all duration-500 group-hover:bg-[length:100%_1px]">
                            {item.title}
                        </span>
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {item.summary}
                    </p>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            {formatDate(item.date)}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-lime-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}

export function EditorialNotes({ notes }: EditorialNotesProps) {
    const headingRef = useRef<HTMLDivElement>(null)
    const headingInView = useInView(headingRef, { once: true, margin: "-60px" })

    if (notes.length === 0) return null

    const [featured, ...rest] = notes

    return (
        <section id="notes" className="py-24">
            <motion.div
                ref={headingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={headingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="space-y-2 mb-10"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Journal Notes
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                    What I am learning
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                    Short writing snapshots from my ongoing engineering journey.
                </p>
            </motion.div>

            {/* Featured first post */}
            <FeaturedNoteCard item={featured} />

            {/* Grid of remaining posts */}
            {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                    {rest.map((item, index) => (
                        <NoteCard key={item.id} item={item} index={index} />
                    ))}
                </div>
            )}
        </section>
    )
}
