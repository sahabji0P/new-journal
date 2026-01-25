import WorkClient from "@/components/work-client"
import { getWorkByYear } from "@/lib/work-utils"

export const metadata = {
    title: "Selected Work | Research & Publications",
    description: "A collection of research papers, publications, and academic contributions.",
}

export default function WorkPage() {
    const workByYear = getWorkByYear()

    const formattedWork: Record<string, Array<{
        slug: string
        title: string
        venue: string
        year: string
        description: string
        tags: string[]
        link?: string
        authors: string[]
    }>> = {}

    Object.entries(workByYear).forEach(([year, items]) => {
        formattedWork[year] = items.map(item => ({
            slug: item.slug,
            title: item.title,
            venue: item.venue,
            year: item.year,
            description: item.description,
            tags: item.tags,
            link: item.link,
            authors: item.authors,
        }))
    })

    return <WorkClient workByYear={formattedWork} />
}
