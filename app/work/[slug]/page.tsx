// app/work/[slug]/page.tsx
import { getAllWorkSlugs, getWorkBySlug } from '@/lib/work-utils'
import { Calendar, ExternalLink, Users } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

interface WorkPageProps {
    params: Promise<{ slug: string }>
}

// Generate static paths for all work items
export async function generateStaticParams() {
    const slugs = await getAllWorkSlugs()
    return slugs.map(({ slug }) => ({
        slug,
    }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: WorkPageProps) {
    const { slug } = await params
    const work = await getWorkBySlug(slug)

    if (!work) {
        return {
            title: 'Research Not Found',
        }
    }

    return {
        title: `${work.title} | Research | Shashwat Jain`,
        description: work.description,
    }
}

// MDX component props types
interface MDXComponentProps {
    children?: React.ReactNode;
    className?: string;
    href?: string;
    src?: string;
    alt?: string;
}

// Custom MDX components with your design system
const mdxComponents = {
    h1: ({ children }: MDXComponentProps) => (
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mt-12 mb-6">
            {children}
        </h1>
    ),
    h2: ({ children }: MDXComponentProps) => (
        <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-10 mb-4">
            {children}
        </h2>
    ),
    h3: ({ children }: MDXComponentProps) => (
        <h3 className="text-2xl sm:text-3xl font-light tracking-tight mt-8 mb-3">
            {children}
        </h3>
    ),
    p: ({ children }: MDXComponentProps) => (
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">
            {children}
        </p>
    ),
    a: ({ href, children }: MDXComponentProps) => (
        <a
            href={href}
            className="text-foreground underline decoration-muted-foreground hover:decoration-foreground transition-colors duration-300"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
    ul: ({ children }: MDXComponentProps) => (
        <ul className="space-y-3 mb-6 ml-6 list-disc marker:text-muted-foreground">
            {children}
        </ul>
    ),
    ol: ({ children }: MDXComponentProps) => (
        <ol className="space-y-3 mb-6 ml-6 list-decimal marker:text-muted-foreground">
            {children}
        </ol>
    ),
    li: ({ children }: MDXComponentProps) => (
        <li className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {children}
        </li>
    ),
    blockquote: ({ children }: MDXComponentProps) => (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-6 italic text-muted-foreground my-6">
            {children}
        </blockquote>
    ),
    code: ({ children, className }: MDXComponentProps) => {
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
    pre: ({ children }: MDXComponentProps) => (
        <pre className="p-4 rounded-lg bg-muted overflow-x-auto mb-6 border border-border">
            {children}
        </pre>
    ),
    hr: () => <hr className="my-12 border-border" />,
    img: ({ src, alt }: MDXComponentProps) => (
        <Image
            src={src || ''}
            alt={alt || ''}
            width={800}
            height={400}
            className="rounded-lg w-full my-8 border border-border"
        />
    ),
    table: ({ children }: MDXComponentProps) => (
        <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-border rounded-lg">
                {children}
            </table>
        </div>
    ),
    th: ({ children }: MDXComponentProps) => (
        <th className="px-4 py-3 text-left font-medium bg-muted/50 border border-border">
            {children}
        </th>
    ),
    td: ({ children }: MDXComponentProps) => (
        <td className="px-4 py-3 border border-border text-muted-foreground">
            {children}
        </td>
    ),
}

export default async function WorkDetailPage({ params }: WorkPageProps) {
    const { slug } = await params
    const work = getWorkBySlug(slug)

    if (!work) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-8 lg:px-16 py-16">
                {/* Article Header */}
                <header className="mb-12 space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-block px-3 py-1 text-xs font-mono text-muted-foreground border border-border rounded-full">
                                {work.year}
                            </span>
                            {work.tags.slice(0, 2).map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-block px-3 py-1 text-xs font-mono text-muted-foreground border border-border rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                            {work.title}
                        </h1>

                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {work.venue}
                        </p>

                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                            {work.description}
                        </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-6 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{work.year}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{work.authors.join(', ')}</span>
                        </div>
                        {work.link && (
                            <Link
                                href={work.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors duration-300"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View Project</span>
                            </Link>
                        )}
                    </div>
                </header>

                {/* Article Content */}
                <article className="prose prose-lg max-w-none">
                    <MDXRemote
                        source={work.content}
                        components={mdxComponents}
                        options={{
                            mdxOptions: {
                                remarkPlugins: [remarkGfm],
                                rehypePlugins: [rehypeHighlight],
                            },
                        }}
                    />
                </article>

                {/* Footer spacer for nav island */}
                <footer className="mt-20 pb-24" />
            </main>
        </div>
    )
}
