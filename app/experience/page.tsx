import ExperienceClient from "@/components/experience-client"
import { getAllExperiences } from "@/lib/experience-utils"

export const metadata = {
    title: "Experience | Shashwat Jain",
    description: "Professional experience and career journey in software engineering and AI.",
}

export default function ExperiencePage() {
    const experiences = getAllExperiences()

    const formattedExperiences = experiences.map(exp => ({
        slug: exp.slug,
        company: exp.company,
        role: exp.role,
        type: exp.type,
        startDate: exp.startDate,
        endDate: exp.endDate,
        location: exp.location,
        description: exp.description,
        highlights: exp.highlights,
        skills: exp.skills,
        featured: exp.featured,
        order: exp.order,
    }))

    return <ExperienceClient experiences={formattedExperiences} />
}
