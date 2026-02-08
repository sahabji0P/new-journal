import { getAllProjectSlugs, getProjectBySlug } from "@/lib/project-utils"
import { Calendar, ExternalLink, Github } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import Link from "next/link"
import { notFound } from "next/navigation"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

interface ProjectPageProps {
    params: Promise<{ slug: string }>
}

interface MDXComponentProps {
    children?: React.ReactNode
    className?: string
    href?: string
}

export async function generateStaticParams() {
    return getAllProjectSlugs().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: ProjectPageProps) {
    const { slug } = await params
    const project = getProjectBySlug(slug)

    if (!project) {
        return { title: "Project Not Found" }
    }

    return {
        title: `${project.name} | Shashwat Jain`,
        description: project.shortDescription || project.description,
    }
}

const mdxComponents = {
    h1: ({ children }: MDXComponentProps) => (
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight mt-12 mb-6">{children}</h1>
    ),
    h2: ({ children }: MDXComponentProps) => (
        <h2 className="text-3xl sm:text-4xl font-light tracking-tight mt-10 mb-4">{children}</h2>
    ),
    h3: ({ children }: MDXComponentProps) => (
        <h3 className="text-2xl sm:text-3xl font-light tracking-tight mt-8 mb-3">{children}</h3>
    ),
    p: ({ children }: MDXComponentProps) => (
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-6">{children}</p>
    ),
    a: ({ href, children }: MDXComponentProps) => (
        <a
            href={href}
            className="text-foreground underline decoration-muted-foreground hover:decoration-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
    ul: ({ children }: MDXComponentProps) => (
        <ul className="space-y-3 mb-6 ml-6 list-disc marker:text-muted-foreground">{children}</ul>
    ),
    ol: ({ children }: MDXComponentProps) => (
        <ol className="space-y-3 mb-6 ml-6 list-decimal marker:text-muted-foreground">{children}</ol>
    ),
    li: ({ children }: MDXComponentProps) => (
        <li className="text-base sm:text-lg text-muted-foreground leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }: MDXComponentProps) => (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-6 italic text-muted-foreground my-6">
            {children}
        </blockquote>
    ),
    code: ({ children, className }: MDXComponentProps) => {
        if (!className) {
            return <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground">{children}</code>
        }
        return <code className={className}>{children}</code>
    },
    pre: ({ children }: MDXComponentProps) => (
        <pre className="p-4 rounded-lg bg-muted overflow-x-auto mb-6 border border-border">{children}</pre>
    ),
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
    const { slug } = await params
    const project = getProjectBySlug(slug)

    if (!project) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-3xl mx-auto px-8 lg:px-16 py-16">
                <header className="mb-12 space-y-6">
                    <Link
                        href="/#builds"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Back to journal
                    </Link>

                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono border border-border rounded-full">
                                <Calendar className="w-3.5 h-3.5" />
                                {project.date}
                            </span>
                            <span className="px-3 py-1 text-xs font-mono border border-border rounded-full">
                                {project.category}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                            {project.name}
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                            {project.shortDescription || project.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        {project.liveUrl && (
                            <Link
                                href={project.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                            >
                                Live
                                <ExternalLink className="w-4 h-4" />
                            </Link>
                        )}
                        {project.githubUrl && (
                            <Link
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                            >
                                Source
                                <Github className="w-4 h-4" />
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {project.tech.map((tech) => (
                            <span key={tech} className="px-2.5 py-1 text-xs border border-border rounded-full text-muted-foreground">
                                {tech}
                            </span>
                        ))}
                    </div>
                </header>

                <article className="prose prose-lg max-w-none">
                    <MDXRemote
                        source={project.content}
                        components={mdxComponents}
                        options={{
                            mdxOptions: {
                                remarkPlugins: [remarkGfm],
                                rehypePlugins: [rehypeHighlight],
                            },
                        }}
                    />
                </article>

                <footer className="mt-20 pb-24" />
            </main>
        </div>
    )
}
