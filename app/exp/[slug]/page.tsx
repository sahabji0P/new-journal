import ExperienceDetailClient from "@/components/experience-detail-client"
import { getAllExperienceSlugs, getExperienceBySlug } from "@/lib/experience-utils"
import { notFound } from "next/navigation"

interface ExperiencePageProps {
    params: Promise<{ slug: string }>
}

// Generate static paths for all experiences
export async function generateStaticParams() {
    const slugs = getAllExperienceSlugs()
    return slugs.map(({ slug }) => ({
        slug,
    }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ExperiencePageProps) {
    const { slug } = await params
    const experience = getExperienceBySlug(slug)

    if (!experience) {
        return {
            title: "Experience Not Found",
        }
    }

    return {
        title: `${experience.role} at ${experience.company} | Shashwat Jain`,
        description: experience.description,
    }
}

export default async function ExperiencePage({ params }: ExperiencePageProps) {
    const { slug } = await params
    const experience = getExperienceBySlug(slug)

    if (!experience) {
        notFound()
    }

    return <ExperienceDetailClient experience={experience} />
}
