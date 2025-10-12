"use client"

import { ArrowLeft, Calendar, ExternalLink, Github, Target, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

// This would be your app/projects/[slug]/page.tsx file
export default function ProjectDetail({ params }) {
    const [isDark, setIsDark] = useState(true)

    // In a real app, you'd fetch this data based on params.slug
    const project = {
        slug: "neural-canvas",
        name: "Neural Canvas",
        tagline: "AI-powered design tool that transforms sketches into production-ready interfaces",
        description: "Neural Canvas represents a paradigm shift in how designers approach interface creation. By leveraging cutting-edge machine learning models, the platform interprets hand-drawn sketches and wireframes, automatically generating clean, semantic HTML and CSS that matches modern design systems.",

        year: "2024",
        duration: "4 months",
        role: "Lead Developer & Designer",
        team: "3 Engineers, 1 Designer",
        status: "Live in Production",

        tech: ["Next.js", "TensorFlow", "Python", "FastAPI", "PostgreSQL", "Redis", "Docker"],

        links: {
            live: "https://neuralcanvas.demo.com",
            github: "https://github.com/yourusername/neural-canvas",
        },

        images: [
            "/projects/neural-canvas-1.jpg",
            "/projects/neural-canvas-2.jpg",
            "/projects/neural-canvas-3.jpg",
        ],

        overview: "The project began as an exploration into whether AI could understand design intent from rough sketches. What started as a weekend experiment evolved into a full-fledged platform that's now used by design teams at several startups to accelerate their prototyping workflow.",

        challenge: "Traditional design-to-code workflows are time-consuming and prone to interpretation errors. Designers create mockups, developers implement them, and numerous feedback loops are required to achieve the original vision. This process can take days or weeks for complex interfaces.",

        solution: "Neural Canvas uses a custom-trained convolutional neural network to recognize UI patterns and components from sketches. The model was trained on over 50,000 labeled interface designs and can identify common patterns like navigation bars, cards, forms, and buttons with 94% accuracy.",

        features: [
            {
                title: "Sketch Recognition",
                description: "Upload hand-drawn wireframes and watch as the AI identifies components, layouts, and design patterns in real-time."
            },
            {
                title: "Semantic Code Generation",
                description: "Generates clean, accessible HTML with proper semantic tags and ARIA labels, following modern web standards."
            },
            {
                title: "Design System Integration",
                description: "Automatically applies your design system's tokens for colors, typography, and spacing, ensuring consistency."
            },
            {
                title: "Real-time Collaboration",
                description: "Multiple team members can work on the same project simultaneously with live cursor tracking and updates."
            },
            {
                title: "Version Control",
                description: "Built-in version history lets you explore different iterations and restore previous designs instantly."
            },
            {
                title: "Export Options",
                description: "Export to React, Vue, or vanilla HTML/CSS. Integrate directly with Figma or download as a standalone project."
            }
        ],

        impact: [
            { metric: "85%", description: "Reduction in design-to-code time" },
            { metric: "1,200+", description: "Active users in first 3 months" },
            { metric: "50,000+", description: "Interfaces generated" },
            { metric: "94%", description: "Component recognition accuracy" }
        ],

        technical: [
            {
                title: "Machine Learning Pipeline",
                description: "Built a custom training pipeline using TensorFlow to process and label UI component datasets. Implemented data augmentation techniques to improve model robustness across different drawing styles."
            },
            {
                title: "Real-time Processing",
                description: "Optimized inference speed to process sketches in under 2 seconds using model quantization and GPU acceleration. Implemented a queue system with Redis for handling concurrent requests."
            },
            {
                title: "Scalable Architecture",
                description: "Designed a microservices architecture with separate services for sketch processing, code generation, and real-time collaboration. Deployed on Kubernetes for automatic scaling based on demand."
            }
        ],

        learnings: [
            "Training AI models requires significantly more diverse data than initially anticipated. We had to expand our dataset three times to achieve acceptable accuracy across different drawing styles.",
            "Real-time collaboration features add substantial complexity. Implementing operational transformation for conflict resolution took longer than the core ML functionality.",
            "Users prefer iterative refinement over perfect first-time generation. Adding a feedback loop where users could adjust recognition results improved satisfaction dramatically."
        ],

        nextSteps: [
            "Expand component library to support mobile-specific patterns",
            "Add support for design tokens import from Figma and Sketch",
            "Implement voice commands for hands-free design iteration",
            "Build a marketplace for community-contributed component templates"
        ]
    }

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark)
    }, [isDark])

    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="max-w-4xl mx-auto px-8 lg:px-16 py-16">
                {/* Back Navigation */}
                <Link
                    href="/#projects"
                    className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 mb-12"
                >
                    <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-300" />
                    <span>Back to Projects</span>
                </Link>

                {/* Project Header */}
                <header className="space-y-8 mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="px-3 py-1 text-xs border border-border rounded-full font-mono">
                                {project.year}
                            </span>
                            <span className="px-3 py-1 text-xs bg-green-500/10 text-green-500 border border-green-500/20 rounded-full">
                                {project.status}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                            {project.name}
                        </h1>

                        <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl">
                            {project.tagline}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-wrap items-center gap-4">
                        {project.links.live && (
                            <a
                                href={project.links.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors duration-300"
                            >
                                <span className="text-sm font-medium">View Live Project</span>
                                <ExternalLink className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                            </a>
                        )}

                        {project.links.github && (
                            <a
                                href={project.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:border-muted-foreground/50 transition-colors duration-300"
                            >
                                <Github className="w-4 h-4" />
                                <span className="text-sm">View Source</span>
                            </a>
                        )}
                    </div>
                </header>

                {/* Hero Image */}
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-border bg-muted/30 mb-16">
                    {/* Placeholder - replace with actual Image */}
                    <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                        <span className="text-6xl font-light text-muted-foreground/30">
                            {project.name.charAt(0)}
                        </span>
                    </div>
                </div>

                {/* Project Meta Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-24 pb-16 border-b border-border">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-mono">DURATION</span>
                        </div>
                        <div className="text-foreground">{project.duration}</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-4 h-4" />
                            <span className="text-xs font-mono">ROLE</span>
                        </div>
                        <div className="text-foreground">{project.role}</div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-mono">TEAM</span>
                        </div>
                        <div className="text-foreground">{project.team}</div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground font-mono">TECH STACK</div>
                        <div className="flex flex-wrap gap-1">
                            {project.tech.slice(0, 3).map((tech) => (
                                <span key={tech} className="text-xs text-foreground">
                                    {tech}{project.tech.indexOf(tech) < 2 ? "," : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Overview Section */}
                <section className="mb-24 space-y-8">
                    <h2 className="text-3xl font-light">Overview</h2>
                    <div className="prose prose-lg max-w-none">
                        <p className="text-muted-foreground leading-relaxed">
                            {project.overview}
                        </p>
                    </div>
                </section>

                {/* Problem & Solution */}
                <section className="mb-24 space-y-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-light">The Challenge</h2>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <p className="text-muted-foreground leading-relaxed max-w-3xl">
                            {project.challenge}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-light">The Solution</h2>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <p className="text-muted-foreground leading-relaxed max-w-3xl">
                            {project.solution}
                        </p>
                    </div>
                </section>

                {/* Impact Metrics */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-12">Impact</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {project.impact.map((item, index) => (
                            <div key={index} className="space-y-2">
                                <div className="text-4xl font-light text-foreground">{item.metric}</div>
                                <div className="text-sm text-muted-foreground">{item.description}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Key Features */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-12">Key Features</h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {project.features.map((feature, index) => (
                            <div
                                key={index}
                                className="p-6 border border-border rounded-lg hover:border-muted-foreground/50 transition-colors duration-300"
                            >
                                <h3 className="text-lg font-medium mb-3">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Technical Deep Dive */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-12">Technical Approach</h2>
                    <div className="space-y-8">
                        {project.technical.map((item, index) => (
                            <div key={index} className="space-y-3">
                                <h3 className="text-xl font-medium">{item.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tech Stack Detail */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-8">Technology Stack</h2>
                    <div className="flex flex-wrap gap-3">
                        {project.tech.map((tech) => (
                            <span
                                key={tech}
                                className="px-4 py-2 text-sm border border-border rounded-lg hover:border-muted-foreground/50 transition-colors duration-300"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </section>

                {/* Learnings */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-8">Key Learnings</h2>
                    <div className="space-y-6">
                        {project.learnings.map((learning, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                    {index + 1}
                                </div>
                                <p className="text-muted-foreground leading-relaxed flex-1 pt-1">
                                    {learning}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Next Steps */}
                <section className="mb-24">
                    <h2 className="text-3xl font-light mb-8">What's Next</h2>
                    <div className="space-y-4">
                        {project.nextSteps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2" />
                                <p className="text-muted-foreground leading-relaxed">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Navigation Footer */}
                <footer className="pt-16 border-t border-border">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                        <Link
                            href="/#projects"
                            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                        >
                            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-300" />
                            <span>Back to All Projects</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            {project.links.live && (
                                <a
                                    href={project.links.live}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                                >
                                    <span>View Live</span>
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}

                            {project.links.github && (
                                <a
                                    href={project.links.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                                >
                                    <Github className="w-4 h-4" />
                                    <span>Source Code</span>
                                </a>
                            )}
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    )
}