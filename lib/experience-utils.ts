import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

// Re-export types and client-safe utilities
export type { Experience } from './experience-types'
export { calculateDuration, formatDateRange } from './experience-types'

import type { Experience } from './experience-types'

const experienceDirectory = path.join(process.cwd(), 'content/experience')

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
