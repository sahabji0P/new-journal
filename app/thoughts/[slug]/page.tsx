// app/thoughts/[slug]/page.tsx
import { getAllThoughtSlugs, getThoughtBySlug } from '@/lib/mdx-utils'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface ThoughtPageProps {
    params: {
        slug: string
    }
}

// Generate static paths for all thoughts
export async function generateStaticParams() {
    const slugs = await getAllThoughtSlugs()
    return slugs.map(({ slug }) => ({
        slug,
    }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ThoughtPageProps) {
    const thought = await getThoughtBySlug(params.slug)

    if (!thought) {
        return {
            title: 'Thought Not Found',
        }
    }

    return {
        title: `${thought.title} | Shashwat Jain`,
        description: thought.excerpt,
    }
}

// Custom MDX components with your design system
const mdxComponents = {
    h1: ({ children }: any) => (
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mt-12 mb-6">
            {children}
        </h1>
    ),
    h2: ({ children }: any) => (
        <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-10 mb-4">
            {children}
        </h2>
    ),
    h3: ({ children }: any) => (
        <h3 className="text-2xl sm:text-3xl font-light tracking-tight mt-8 mb-3">
            {children}
        </h3>
    ),
    p: ({ children }: any) => (
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
            {children}
        </p>
    ),
    a: ({ href, children }: any) => (
        <a
            href={href}
            className="text-foreground underline decoration-muted-foreground hover:decoration-foreground transition-colors duration-300"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
    ul: ({ children }: any) => (
        <ul className="space-y-3 mb-6 ml-6 list-disc marker:text-muted-foreground">
            {children}
        </ul>
    ),
    ol: ({ children }: any) => (
        <ol className="space-y-3 mb-6 ml-6 list-decimal marker:text-muted-foreground">
            {children}
        </ol>
    ),
    li: ({ children }: any) => (
        <li className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {children}
        </li>
    ),
    blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-6 italic text-muted-foreground my-6">
            {children}
        </blockquote>
    ),
    code: ({ children, className }: any) => {
        const isInline = !className
        if (isInline) {
            return (
                <pre><code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground">
                    {children}
                </code></pre>
            )
        }
        return (
            <code className={className}>
                {children}
            </code>
        )
    },
    pre: ({ children }: any) => (
        <pre className="p-4 rounded-lg bg-muted overflow-x-auto mb-6 border border-border">
            {children}
        </pre>
    ),
    hr: () => <hr className="my-12 border-border" />,
    img: ({ src, alt }: any) => (
        <Image
            src={src}
            alt={alt}
            width={800}
            height={400}
            className="rounded-lg w-full my-8 border border-border"
        />
    ),
}

export default function ThoughtPage({ params }: ThoughtPageProps) {
    const thought = getThoughtBySlug(params.slug)

    if (!thought) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-8 lg:px-16 py-16">
                {/* Back Button */}
                <Link
                    href="/thoughts"
                    prefetch={true}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                    Back to thoughts
                </Link>

                {/* Article Header */}
                <header className="mb-12 space-y-6">
                    <div className="space-y-4">
                        <span className="inline-block px-3 py-1 text-xs font-mono text-muted-foreground border border-border rounded-full">
                            {thought.category.toUpperCase()}
                        </span>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                            {thought.title}
                        </h1>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                            {thought.excerpt}
                        </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-6 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{thought.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{thought.readTime} read</span>
                        </div>
                    </div>
                </header>

                {/* Article Content */}
                <article className="prose prose-lg max-w-none">
                    <MDXRemote
                        source={thought.content}
                        components={mdxComponents}
                        options={{
                            mdxOptions: {
                                remarkPlugins: [remarkGfm],
                                rehypePlugins: [rehypeHighlight],
                            },
                        }}
                    />
                </article>

                {/* Footer Navigation */}
                <footer className="mt-20 pt-12 border-t border-border">
                    <Link
                        href="/#thoughts"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                        Read more thoughts
                    </Link>
                </footer>
            </main>
        </div>
    )
}