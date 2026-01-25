import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const experienceDirectory = path.join(process.cwd(), 'content/experience')

export interface Experience {
    slug: string
    company: string
    role: string
    type: "full-time" | "internship" | "contract" | "freelance"
    startDate: string
    endDate: string
    location: string
    description: string
    highlights: string[]
    skills: string[]
    featured: boolean
    order: number
    content: string
}

export function getAllExperienceSlugs() {
    if (!fs.existsSync(experienceDirectory)) {
        return []
    }

    const fileNames = fs.readdirSync(experienceDirectory)
    return fileNames
        .filter(fileName => fileName.endsWith('.mdx'))
        .map(fileName => ({
            slug: fileName.replace(/\.mdx$/, ''),
        }))
}

export function getExperienceBySlug(slug: string): Experience | null {
    try {
        const fullPath = path.join(experienceDirectory, `${slug}.mdx`)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
            slug,
            company: data.company || 'Unknown Company',
            role: data.role || 'Unknown Role',
            type: data.type || 'full-time',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            location: data.location || '',
            description: data.description || '',
            highlights: data.highlights || [],
            skills: data.skills || [],
            featured: data.featured || false,
            order: data.order || 999,
            content,
        }
    } catch {
        return null
    }
}

export function getAllExperiences(): Experience[] {
    const slugs = getAllExperienceSlugs()
    const experiences = slugs
        .map(({ slug }) => getExperienceBySlug(slug))
        .filter((exp): exp is Experience => exp !== null)
        .sort((a, b) => a.order - b.order)

    return experiences
}

export function getFeaturedExperiences(): Experience[] {
    return getAllExperiences().filter(exp => exp.featured)
}

export function getExperiencesByType(type: Experience['type']): Experience[] {
    return getAllExperiences().filter(exp => exp.type === type)
}

export function formatDateRange(startDate: string, endDate: string): string {
    const formatDate = (dateStr: string) => {
        if (dateStr === 'Present') return 'Present'
        const date = new Date(dateStr + '-01')
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export function calculateDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate + '-01')
    const end = endDate === 'Present' ? new Date() : new Date(endDate + '-01')

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

    if (months < 1) return '< 1 month'
    if (months === 1) return '1 month'
    if (months < 12) return `${months} months`

    const years = Math.floor(months / 12)
    const remainingMonths = months % 12

    if (remainingMonths === 0) {
        return years === 1 ? '1 year' : `${years} years`
    }

    const yearStr = years === 1 ? '1 year' : `${years} years`
    const monthStr = remainingMonths === 1 ? '1 month' : `${remainingMonths} months`

    return `${yearStr}, ${monthStr}`
}
