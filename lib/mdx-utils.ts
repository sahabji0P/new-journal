// lib/mdx-utils.ts
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const thoughtsDirectory = path.join(process.cwd(), 'content/thoughts')

export interface ThoughtPost {
    slug: string
    title: string
    excerpt: string
    date: string
    readTime: string
    category: string
    content: string
}

export function getAllThoughtSlugs() {
    if (!fs.existsSync(thoughtsDirectory)) {
        return []
    }

    const fileNames = fs.readdirSync(thoughtsDirectory)
    return fileNames
        .filter(fileName => fileName.endsWith('.mdx'))
        .map(fileName => ({
            slug: fileName.replace(/\.mdx$/, ''),
        }))
}

export function getThoughtBySlug(slug: string): ThoughtPost | null {
    try {
        const fullPath = path.join(thoughtsDirectory, `${slug}.mdx`)
        const fileContents = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(fileContents)

        return {
            slug,
            title: data.title || 'Untitled',
            excerpt: data.excerpt || '',
            date: data.date || '',
            readTime: data.readTime || '',
            category: data.category || 'General',
            content,
        }
    } catch {
        return null
    }
}

export function getAllThoughts(): ThoughtPost[] {
    const slugs = getAllThoughtSlugs()
    const thoughts = slugs
        .map(({ slug }) => getThoughtBySlug(slug))
        .filter((thought): thought is ThoughtPost => thought !== null)
        .sort((a, b) => {
            // Sort by date descending
            return new Date(b.date).getTime() - new Date(a.date).getTime()
        })

    return thoughts
}

// Calculate read time based on content
export function calculateReadTime(content: string): string {
    const wordsPerMinute = 200
    const wordCount = content.trim().split(/\s+/).length
    const minutes = Math.ceil(wordCount / wordsPerMinute)
    return `${minutes} min`
}