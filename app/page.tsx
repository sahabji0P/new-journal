import HomeClient from "@/components/home-client"
import { getAllExperiences } from "@/lib/experience-utils"
import { getAllThoughts } from "@/lib/mdx-utils"
import { getAllProjects } from "@/lib/project-utils"

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

    const experiences = getAllExperiences()

    return <HomeClient projects={projects} thoughts={thoughts} experiences={experiences} />
}
