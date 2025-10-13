// app/thoughts/thoughts-client.tsx
"use client"

import { Check, Share2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface ThoughtPost {
    slug: string
    title: string
    date: string
    category: string
    year: number
}

interface ThoughtsClientProps {
    thoughts: ThoughtPost[]
}

export default function ThoughtsClient({ thoughts }: ThoughtsClientProps) {
    const [isDark, setIsDark] = useState(true)
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const isDarkMode = document.documentElement.classList.contains("dark")
        setIsDark(isDarkMode)
    }, [])

    useEffect(() => {
        if (mounted) {
            document.documentElement.classList.toggle("dark", isDark)
        }
    }, [isDark, mounted])

    const toggleTheme = () => {
        setIsDark(!isDark)
    }

    const handleShare = async (slug: string) => {
        const url = `${window.location.origin}/thoughts/${slug}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedSlug(slug)
            setTimeout(() => setCopiedSlug(null), 2000)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    // Group thoughts by year
    const thoughtsByYear = thoughts.reduce((acc, thought) => {
        if (!acc[thought.year]) {
            acc[thought.year] = []
        }
        acc[thought.year].push(thought)
        return acc
    }, {} as Record<number, ThoughtPost[]>)

    // Sort years in descending order
    const years = Object.keys(thoughtsByYear)
        .map(Number)
        .sort((a, b) => b - a)

    // Calculate stats
    const totalThoughts = thoughts.length
    const yearsWriting = years.length
    const categories = [...new Set(thoughts.map(t => t.category))].length

    if (!mounted) {
        return null // Prevent hydration mismatch
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-4xl mx-auto px-8 lg:px-16 py-16">
                {/* Header */}
                <header className="mb-20">
                    <div className="flex items-start justify-between mb-8">
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground font-mono tracking-wider">
                                THOUGHTS / WRITINGS
                            </div>
                            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight">
                                All Thoughts
                            </h1>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="group p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-all duration-300"
                            aria-label="Toggle theme"
                        >
                            {isDark ? (
                                <svg
                                    className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
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
                                    className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                        A collection of thoughts, learnings, and explorations on software engineering,
                        design, and building for the web.
                    </p>
                </header>

                {/* Thoughts grouped by year */}
                <div className="space-y-20">
                    {years.map((year) => (
                        <section key={year} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl sm:text-4xl font-light text-muted-foreground">
                                    {year}
                                </h2>
                                <div className="flex-1 h-px bg-border"></div>
                                <div className="text-sm text-muted-foreground font-mono">
                                    {thoughtsByYear[year].length} {thoughtsByYear[year].length === 1 ? 'POST' : 'POSTS'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                {thoughtsByYear[year].map((thought, index) => (
                                    <div
                                        key={thought.slug}
                                        className="group grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-6 border-b border-border/30 hover:border-border transition-colors duration-300"
                                    >
                                        {/* Title */}
                                        <div className="sm:col-span-7">
                                            <Link
                                                href={`/thoughts/${thought.slug}`}
                                                className="block"
                                            >
                                                <h3 className="text-lg sm:text-xl font-medium group-hover:text-muted-foreground transition-colors duration-300">
                                                    {thought.title}
                                                </h3>
                                            </Link>
                                        </div>

                                        {/* Category */}
                                        <div className="sm:col-span-3">
                                            <span className="inline-block px-3 py-1 text-xs font-mono text-muted-foreground border border-border rounded-full">
                                                {thought.category.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Share Button */}
                                        <div className="sm:col-span-2 flex justify-start sm:justify-end">
                                            <button
                                                onClick={() => handleShare(thought.slug)}
                                                className="group/share flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                                                aria-label={`Share ${thought.title}`}
                                            >
                                                {copiedSlug === thought.slug ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span className="text-xs">Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Share2 className="w-4 h-4" />
                                                        <span className="text-xs opacity-0 group-hover/share:opacity-100 transition-opacity duration-300">
                                                            Share
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Stats Footer */}
                <footer className="mt-32 pt-16 border-t border-border">
                    <div className="grid grid-cols-3 gap-8 sm:gap-16">
                        <div className="space-y-2">
                            <div className="text-3xl sm:text-4xl font-light">{totalThoughts}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                                TOTAL THOUGHTS
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-3xl sm:text-4xl font-light">{yearsWriting}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                                YEARS WRITING
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-3xl sm:text-4xl font-light">{categories}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                                CATEGORIES
                            </div>
                        </div>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-16">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                            <span className="text-sm">Back to home</span>
                        </Link>
                    </div>
                </footer>
            </main>
        </div>
    )
}