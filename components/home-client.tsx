"use client"

import type { HomeJournalData, JournalFeedItem } from "@/lib/journal-feed"
import { HOME_SECTION_ITEMS, useNavPageConfig } from "@/lib/nav-context"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Calendar, Mail, MapPin, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface HomeClientProps {
    data: HomeJournalData
}

interface ExpandableFeedSectionProps {
    id: string
    overline: string
    title: string
    subtitle: string
    items: JournalFeedItem[]
    emptyState: string
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

function ExpandableFeedSection({
    id,
    overline,
    title,
    subtitle,
    items,
    emptyState,
}: ExpandableFeedSectionProps) {
    const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null)

    return (
        <section id={id} className="py-14 sm:py-16">
            <div className="space-y-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{overline}</p>
                    <h2 className="text-3xl sm:text-4xl font-light tracking-tight">{title}</h2>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{subtitle}</p>
                </div>

                <div className="space-y-3">
                    {items.length === 0 && (
                        <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
                            {emptyState}
                        </div>
                    )}

                    {items.map((item, index) => {
                        const isExpanded = expandedId === item.id

                        return (
                            <motion.article
                                key={item.id}
                                className="rounded-2xl border border-border/70 bg-card/40 backdrop-blur-sm"
                                initial={{ opacity: 0, y: 18 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-80px" }}
                                transition={{ duration: 0.3, delay: index * 0.04 }}
                            >
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                    className="w-full px-4 sm:px-5 py-4 text-left"
                                    aria-expanded={isExpanded}
                                    aria-controls={`${id}-${item.id}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1.5">
                                            <h3 className="text-base sm:text-lg font-medium">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 pt-1">
                                            {formatDate(item.date)}
                                        </span>
                                    </div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            id={`${id}-${item.id}`}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.24, ease: "easeOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 sm:px-5 pb-4 space-y-3 border-t border-border/60">
                                                <div className="pt-4 flex flex-wrap gap-2">
                                                    {item.tags.map((tag) => (
                                                        <span
                                                            key={`${item.id}-${tag}`}
                                                            className="px-2.5 py-1 rounded-full border border-border/80 text-xs text-muted-foreground"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {item.summary}
                                                </p>

                                                {item.href && (
                                                    <Link
                                                        href={item.href}
                                                        className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-muted-foreground transition-colors"
                                                    >
                                                        Open full entry
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.article>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

export default function HomeClient({ data }: HomeClientProps) {
    useNavPageConfig({
        navItems: HOME_SECTION_ITEMS,
        showTOC: true,
        manualSections: [
            { id: "intro", title: "Intro", level: 2 },
            { id: "now", title: "Now", level: 2 },
            { id: "journey", title: "Journey", level: 2 },
            { id: "builds", title: "Selected Builds", level: 2 },
            { id: "notes", title: "Journal Notes", level: 2 },
            { id: "connect", title: "Connect", level: 2 },
        ],
        pageTitle: "Journal",
    })

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <div className="pointer-events-none fixed inset-0 opacity-30">
                <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-muted/50 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-muted/40 blur-3xl" />
            </div>

            <main className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
                <header id="intro" className="pt-28 pb-14 sm:pt-32 sm:pb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-7"
                    >
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            Developer Journal
                        </p>

                        <div className="space-y-3">
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight">
                                Shashwat Jain
                            </h1>
                            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                                I build thoughtful software systems and document the journey in public.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Open to collaborations
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5" />
                                Uttar Pradesh, India
                            </span>
                            <a
                                href="https://drive.google.com/file/d/13tx0V2x1mNvv6-aYam3mdQGuMH78ro3x/view"
                                className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Resume
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </motion.div>
                </header>

                <section id="now" className="py-14 sm:py-16 border-t border-border/70">
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Now</p>
                            <h2 className="text-3xl sm:text-4xl font-light tracking-tight">What I am focused on</h2>
                        </div>

                        <motion.article
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.3 }}
                            className="rounded-2xl border border-border/70 bg-card/40 p-5 sm:p-6 space-y-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xl font-medium">{data.now.title}</h3>
                                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {data.now.period}
                                </span>
                            </div>

                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                {data.now.summary}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {data.now.tags.map((tag) => (
                                    <span
                                        key={`now-${tag}`}
                                        className="px-2.5 py-1 rounded-full border border-border/80 text-xs text-muted-foreground"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </motion.article>
                    </div>
                </section>

                <div className="border-t border-border/70">
                    <ExpandableFeedSection
                        id="journey"
                        overline="Journey"
                        title="Where I have been building"
                        subtitle="A minimal timeline of roles, context, and key focus shifts."
                        items={data.journey}
                        emptyState="Journey entries will appear here."
                    />
                </div>

                <div className="border-t border-border/70">
                    <ExpandableFeedSection
                        id="builds"
                        overline="Selected Builds"
                        title="Work I have shipped"
                        subtitle="A curated set of projects that best represent my work."
                        items={data.builds}
                        emptyState="Build entries will appear here."
                    />
                </div>

                <div className="border-t border-border/70">
                    <ExpandableFeedSection
                        id="notes"
                        overline="Journal Notes"
                        title="What I am learning"
                        subtitle="Short writing snapshots from my ongoing engineering journey."
                        items={data.notes}
                        emptyState="Journal notes will appear here."
                    />
                </div>

                <section id="connect" className="py-16 border-t border-border/70">
                    <div className="grid gap-8 sm:grid-cols-2">
                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Connect</p>
                            <h2 className="text-3xl sm:text-4xl font-light tracking-tight">Let us build together</h2>
                            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                                Always open to discussing products, systems, and ideas worth building.
                            </p>
                            <a
                                href="mailto:shashwat@example.com"
                                className="inline-flex items-center gap-2 text-sm hover:text-muted-foreground transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                shashwat@example.com
                            </a>
                        </div>

                        <div className="grid gap-3">
                            {[
                                { label: "GitHub", href: "https://github.com/sahabji0P", handle: "@sahabji0P" },
                                { label: "X", href: "https://twitter.com/itsshashwatj", handle: "@itsshashwatj" },
                                { label: "LinkedIn", href: "https://linkedin.com/in/itsshashwatjain", handle: "@itsshashwatjain" },
                            ].map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 hover:border-muted-foreground/50 transition-colors"
                                >
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.handle}</p>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                <footer className="pb-24 pt-4 text-xs text-muted-foreground">
                    Built with Next.js and Framer Motion.
                </footer>
            </main>
        </div>
    )
}
