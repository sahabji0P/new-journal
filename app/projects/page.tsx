import ProjectsClient from "@/components/projects-client"
import { getProjectsByYear } from "@/lib/project-utils"

export default function AllProjectsPage() {
    const projectsByYear = getProjectsByYear()

    const formattedProjects: Record<string, Array<{
        slug: string
        name: string
        shortDescription: string
        tech: string[]
        date: string
    }>> = {}

    Object.entries(projectsByYear).forEach(([year, projects]) => {
        formattedProjects[year] = projects.map(p => ({
            slug: p.slug,
            name: p.name,
            shortDescription: p.shortDescription,
            tech: p.tech,
            date: p.date,
        }))
    })

    return <ProjectsClient projectsByYear={formattedProjects} />
}
