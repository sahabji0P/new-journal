import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const projectsDirectory = path.join(process.cwd(), 'content/projects')

export interface Project {
    slug: string
    name: string
    shortDescription: string
    description: string
    tech: string[]
    category: string
    liveUrl?: string
    githubUrl?: string
    date: string
    featured: boolean
    image?: string
    content: string
}

export function getAllProjectSlugs() {
    if (!fs.existsSync(projectsDirectory)) {
        return []
    }

    const fileNames = fs.readdirSync(projectsDirectory)
    return fileNames
        .filter(fileName => fileName.endsWith('.mdx'))
        .map(fileName => ({
            slug: fileName.replace(/\.mdx$/, ''),
        }))
}

export function getProjectBySlug(slug: string): Project | null {
    try {
        const fullPath = path.join(projectsDirectory, `${slug}.mdx`)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
            slug,
            name: data.name || data.title || 'Untitled',
            shortDescription: data.shortDescription || data.excerpt || '',
            description: data.description || '',
            tech: data.tech || [],
            category: data.category || 'General',
            liveUrl: data.liveUrl || '',
            githubUrl: data.githubUrl || '',
            date: data.date || '',
            featured: data.featured || false,
            image: data.image || '',
            content,
        }
    } catch {
        return null
    }
}

export function getAllProjects(): Project[] {
    const slugs = getAllProjectSlugs()
    const projects = slugs
        .map(({ slug }) => getProjectBySlug(slug))
        .filter((project): project is Project => project !== null)
        .sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
        })

    return projects
}

export function getFeaturedProjects(): Project[] {
    return getAllProjects().filter(project => project.featured)
}

export function getLatestProjects(count: number = 4): Project[] {
    return getAllProjects().slice(0, count)
}

export function getProjectsByCategory(category: string): Project[] {
    if (category === 'all') return getAllProjects()
    return getAllProjects().filter(project => project.category === category)
}

export function getAllCategories(): string[] {
    const projects = getAllProjects()
    const categories = new Set(projects.map(p => p.category))
    return ['all', ...Array.from(categories)]
}

export function getProjectsByYear(): Record<string, Project[]> {
    const projects = getAllProjects()
    return projects.reduce((acc, project) => {
        const year = new Date(project.date).getFullYear().toString()
        if (!acc[year]) {
            acc[year] = []
        }
        acc[year].push(project)
        return acc
    }, {} as Record<string, Project[]>)
}
