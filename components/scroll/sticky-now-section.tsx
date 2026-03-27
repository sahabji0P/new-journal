"use client"

import { useSectionScroll } from "@/lib/hooks/use-section-scroll"
import { motion, useTransform } from "framer-motion"
import { Calendar } from "lucide-react"

interface StickyNowSectionProps {
    now: {
        title: string
        summary: string
        period: string
        tags: string[]
    }
}

export function StickyNowSection({ now }: StickyNowSectionProps) {
    const { ref, progress } = useSectionScroll()

    const opacity = useTransform(progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
    const y = useTransform(progress, [0, 0.3], [30, 0])
    const tagOpacity = useTransform(progress, [0.15, 0.4], [0, 1])
    const periodOpacity = useTransform(progress, [0.2, 0.45], [0, 1])

    return (
        <section id="now" ref={ref} className="min-h-[50vh] py-24">
            <motion.div style={{ opacity, y }} className="space-y-8">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Now
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">
                        What I am focused on
                    </h2>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 sm:p-8 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl sm:text-2xl font-medium">
                            {now.title}
                        </h3>
                        <motion.span
                            style={{ opacity: periodOpacity }}
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            {now.period}
                        </motion.span>
                    </div>

                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
                        {now.summary}
                    </p>

                    <motion.div
                        style={{ opacity: tagOpacity }}
                        className="flex flex-wrap gap-2"
                    >
                        {now.tags.map((tag, index) => (
                            <motion.span
                                key={`now-tag-${tag}`}
                                initial={{ opacity: 0, x: -10 + index * 5 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.08,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 24,
                                }}
                                className="px-3 py-1.5 rounded-full border border-border/80 text-xs text-muted-foreground"
                            >
                                {tag}
                            </motion.span>
                        ))}
                    </motion.div>
                </div>
            </motion.div>
        </section>
    )
}
