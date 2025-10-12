import { ArrowUpRight, ExternalLink } from "lucide-react"
import Link from "next/link"

// Add this section to your home page after the "work" section
export default function ProjectsSection({ sectionRef }) {
    const projects = [
        {
            slug: "neural-canvas",
            name: "Neural Canvas",
            shortDescription: "AI-powered design tool that transforms sketches into production-ready interfaces",
            image: "/projects/neural-canvas.jpg", // Replace with your actual image paths
            tech: ["Next.js", "TensorFlow", "Python", "FastAPI"],
            liveUrl: "https://neuralcanvas.demo.com",
            featured: true
        },
        {
            slug: "realtime-collab",
            name: "RealtimeCollab",
            shortDescription: "Collaborative whiteboard with low-latency synchronization for distributed teams",
            image: "/projects/realtime-collab.jpg",
            tech: ["React", "WebSocket", "Redis", "Node.js"],
            liveUrl: "https://realtimecollab.demo.com",
            featured: true
        },
        {
            slug: "quantum-analytics",
            name: "Quantum Analytics",
            shortDescription: "Data visualization platform with real-time processing capabilities",
            image: "/projects/quantum-analytics.jpg",
            tech: ["React", "D3.js", "PostgreSQL", "Docker"],
            liveUrl: "https://quantumanalytics.demo.com",
            featured: false
        },
        {
            slug: "voice-sync",
            name: "VoiceSync",
            shortDescription: "Voice-controlled task management system with natural language processing",
            image: "/projects/voice-sync.jpg",
            tech: ["React Native", "Python", "OpenAI", "MongoDB"],
            liveUrl: "https://voicesync.demo.com",
            featured: false
        }
    ]

    return (
        <section
            id="projects"
            ref={sectionRef}
            className="min-h-screen py-32 opacity-0"
        >
            <div className="space-y-16">
                {/* Section Header */}
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <h2 className="text-3xl sm:text-4xl font-light">Selected Projects</h2>
                        <p className="text-muted-foreground">Building solutions that matter</p>
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">2022 — 2025</div>
                </div>

                {/* Featured Projects Grid */}
                <div className="space-y-24">
                    {projects
                        .filter(p => p.featured)
                        .map((project, index) => (
                            <article
                                key={project.slug}
                                className="group grid lg:grid-cols-12 gap-8 lg:gap-12"
                            >
                                {/* Project Image */}
                                <div className={`lg:col-span-7 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                                    <Link href={`/projects/${project.slug}`}>
                                        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted/30 group-hover:border-muted-foreground/50 transition-all duration-500">
                                            {/* Placeholder - replace with actual Image component */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                                                <span className="text-4xl font-light text-muted-foreground/30">
                                                    {project.name.charAt(0)}
                                                </span>
                                            </div>
                                            {/* Uncomment when you have images:
                      <Image
                        src={project.image}
                        alt={project.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      */}
                                            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-500" />
                                        </div>
                                    </Link>
                                </div>

                                {/* Project Info */}
                                <div className={`lg:col-span-5 flex flex-col justify-center space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-muted-foreground font-mono tracking-wider">
                                                FEATURED PROJECT
                                            </div>
                                            <div className="h-px flex-1 bg-border" />
                                        </div>

                                        <Link href={`/projects/${project.slug}`}>
                                            <h3 className="text-2xl sm:text-3xl font-light group-hover:text-muted-foreground transition-colors duration-300">
                                                {project.name}
                                            </h3>
                                        </Link>

                                        <p className="text-muted-foreground leading-relaxed">
                                            {project.shortDescription}
                                        </p>
                                    </div>

                                    {/* Tech Stack */}
                                    <div className="flex flex-wrap gap-2">
                                        {project.tech.map((tech) => (
                                            <span
                                                key={tech}
                                                className="px-3 py-1 text-xs border border-border rounded-full hover:border-muted-foreground/50 transition-colors duration-300"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action Links */}
                                    <div className="flex items-center gap-6 pt-2">
                                        <Link
                                            href={`/projects/${project.slug}`}
                                            className="group/link flex items-center gap-2 text-sm text-foreground hover:text-muted-foreground transition-colors duration-300"
                                        >
                                            <span>View Details</span>
                                            <ArrowUpRight className="w-4 h-4 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                        </Link>

                                        <a
                                            href={project.liveUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group/link flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                                        >
                                            <span>Live Demo</span>
                                            <ExternalLink className="w-4 h-4 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                        </a>
                                    </div>
                                </div>
                            </article>
                        ))}
                </div>

                {/* Other Projects Grid */}
                <div className="pt-16 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground font-mono tracking-wider">
                            OTHER PROJECTS
                        </div>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {projects
                            .filter(p => !p.featured)
                            .map((project) => (
                                <article
                                    key={project.slug}
                                    className="group border border-border rounded-lg overflow-hidden hover:border-muted-foreground/50 transition-all duration-500 hover:shadow-lg"
                                >
                                    {/* Project Image */}
                                    <Link href={`/projects/${project.slug}`}>
                                        <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                                            {/* Placeholder */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted/50 flex items-center justify-center">
                                                <span className="text-3xl font-light text-muted-foreground/30">
                                                    {project.name.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 transition-colors duration-500" />
                                        </div>
                                    </Link>

                                    {/* Project Info */}
                                    <div className="p-6 space-y-4">
                                        <Link href={`/projects/${project.slug}`}>
                                            <h3 className="text-lg font-medium group-hover:text-muted-foreground transition-colors duration-300">
                                                {project.name}
                                            </h3>
                                        </Link>

                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {project.shortDescription}
                                        </p>

                                        {/* Tech Stack */}
                                        <div className="flex flex-wrap gap-2">
                                            {project.tech.map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="px-2 py-1 text-xs text-muted-foreground"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Action Links */}
                                        <div className="flex items-center gap-4 pt-2 text-xs">
                                            <Link
                                                href={`/projects/${project.slug}`}
                                                className="group/link flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors duration-300"
                                            >
                                                <span>Details</span>
                                                <ArrowUpRight className="w-3 h-3 transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-300" />
                                            </Link>

                                            <a
                                                href={project.liveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/link flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
                                            >
                                                <span>Live</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </article>
                            ))}
                    </div>
                </div>

                {/* View All Link */}
                <div className="flex justify-center pt-8">
                    <Link
                        href="/projects"
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 border-b border-border hover:border-muted-foreground/50"
                    >
                        <span>View All Projects</span>
                        <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    )
}