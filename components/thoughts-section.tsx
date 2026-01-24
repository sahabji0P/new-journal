"use client"

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

export default function ThoughtsSection({ sectionRef, thoughts }: ThoughtsSectionProps) {
    const displayThoughts = thoughts.slice(0, 3)

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return (
        <section
            id="thoughts"
            ref={sectionRef}
            className="min-h-screen py-32 opacity-0"
        >
            <div className="space-y-16">
                <div className="flex items-end justify-between">
                    <h2 className="text-3xl sm:text-4xl font-light">Recent Thoughts</h2>
                    <div className="text-sm text-muted-foreground font-mono">
                        {thoughts.length} ARTICLES
                    </div>
                </div>

                <div className="space-y-6">
                    {displayThoughts.map((post) => (
                        <Link
                            key={post.slug}
                            href={`/thoughts/${post.slug}`}
                            className="group block"
                        >
                            <article className="p-6 sm:p-8 border border-border rounded-lg hover:border-muted-foreground/50 transition-all duration-500 hover:shadow-lg">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-lg sm:text-xl font-medium group-hover:text-muted-foreground transition-colors duration-300">
                                                {post.title}
                                            </h3>
                                            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0" />
                                        </div>

                                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                    </div>

                                    <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs text-muted-foreground font-mono">
                                        <span>{formatDate(post.date)}</span>
                                        <span className="hidden sm:block">{post.readTime}</span>
                                        <span className="sm:hidden">· {post.readTime}</span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>

                <div className="flex justify-center pt-8">
                    <Link
                        href="/thoughts"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-border hover:border-muted-foreground/50"
                    >
                        <span>View All Thoughts</span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    )
}
