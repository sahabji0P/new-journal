import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const workDirectory = path.join(process.cwd(), 'content/work')

export interface Work {
    slug: string
    title: string
    venue: string
    year: string
    description: string
    tags: string[]
    link?: string
    authors: string[]
    featured: boolean
    content: string
}

export function getAllWorkSlugs() {
    if (!fs.existsSync(workDirectory)) {
        return []
    }

    const fileNames = fs.readdirSync(workDirectory)
    return fileNames
        .filter(fileName => fileName.endsWith('.mdx'))
        .map(fileName => ({
            slug: fileName.replace(/\.mdx$/, ''),
        }))
}

export function getWorkBySlug(slug: string): Work | null {
    try {
        const fullPath = path.join(workDirectory, `${slug}.mdx`)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
            slug,
            title: data.title || 'Untitled',
            venue: data.venue || '',
            year: data.year || '',
            description: data.description || '',
            tags: data.tags || [],
            link: data.link || undefined,
            authors: data.authors || [],
            featured: data.featured || false,
            content,
        }
    } catch {
        return null
    }
}

export function getAllWork(): Work[] {
    const slugs = getAllWorkSlugs()
    const work = slugs
        .map(({ slug }) => getWorkBySlug(slug))
        .filter((item): item is Work => item !== null)
        .sort((a, b) => {
            // Sort by year descending
            return parseInt(b.year) - parseInt(a.year)
        })

    return work
}

export function getFeaturedWork(): Work[] {
    return getAllWork().filter(item => item.featured)
}

export function getWorkByYear(): Record<string, Work[]> {
    const work = getAllWork()
    return work.reduce((acc, item) => {
        const year = item.year
        if (!acc[year]) {
            acc[year] = []
        }
        acc[year].push(item)
        return acc
    }, {} as Record<string, Work[]>)
}
