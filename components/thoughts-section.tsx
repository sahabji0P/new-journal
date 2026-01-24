"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface ThoughtPost {
    slug: string
    title: string
    excerpt: string
    date: string
    readTime: string
    category: string
}

// This will be replaced with actual data from your MDX files
const thoughtPosts: ThoughtPost[] = [
    {
        slug: "future-of-web-development",
        title: "The Future of Web Development",
        excerpt: "Exploring how AI and automation are reshaping the way we build for the web.",
        date: "Dec 2024",
        readTime: "5 min",
        category: "Development"
    },
    {
        slug: "design-systems-at-scale",
        title: "Design Systems at Scale",
        excerpt: "Lessons learned from building and maintaining design systems across multiple products.",
        date: "Nov 2024",
        readTime: "8 min",
        category: "Design"
    },
    {
        slug: "performance-first-development",
        title: "Performance-First Development",
        excerpt: "Why performance should be a first-class citizen in your development workflow.",
        date: "Oct 2024",
        readTime: "6 min",
        category: "Performance"
    },
    {
        slug: "art-of-code-review",
        title: "The Art of Code Review",
        excerpt: "Building better software through thoughtful and constructive code reviews.",
        date: "Sep 2024",
        readTime: "4 min",
        category: "Engineering"
    },
]

interface ThoughtsSectionProps {
    sectionRef: (el: HTMLElement | null) => void
}

export default function ThoughtsSection({ sectionRef }: ThoughtsSectionProps) {
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
                        {thoughtPosts.length} ARTICLES
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8">
                    {thoughtPosts.map((post, index) => (
                        <Link
                            key={post.slug}
                            href={`/thoughts/${post.slug}`}
                            className="group block"
                        >
                            <article className="h-full p-6 sm:p-8 border border-border rounded-lg hover:border-muted-foreground/50 transition-all duration-500 hover:shadow-lg">
                                <div className="flex flex-col h-full space-y-4">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                                        <span>{post.date}</span>
                                        <span>{post.readTime}</span>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-lg sm:text-xl font-medium group-hover:text-muted-foreground transition-colors duration-300">
                                                {post.title}
                                            </h3>
                                            <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 flex-shrink-0" />
                                        </div>

                                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                            {post.excerpt}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t border-border/50">
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {post.category.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}