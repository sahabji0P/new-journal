import HomeClient from "@/components/home-client"
import { getAllProjects } from "@/lib/project-utils"
import { getAllThoughts } from "@/lib/mdx-utils"

export default function Home() {
    const projects = getAllProjects().map(p => ({
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        tech: p.tech,
        liveUrl: p.liveUrl,
        featured: p.featured,
    }))

    const thoughts = getAllThoughts().map(t => ({
        slug: t.slug,
        title: t.title,
        excerpt: t.excerpt,
        date: t.date,
        readTime: t.readTime,
        category: t.category,
    }))

    return <HomeClient projects={projects} thoughts={thoughts} />
}
