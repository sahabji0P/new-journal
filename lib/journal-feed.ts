import { getAllExperiences } from "@/lib/experience-utils"
import { getAllThoughts } from "@/lib/mdx-utils"
import { getAllProjects } from "@/lib/project-utils"

export type JournalItemKind = "journey" | "build" | "note"

export interface JournalFeedItem {
    id: string
    kind: JournalItemKind
    title: string
    summary: string
    date: string
    tags: string[]
    href?: string
    priority: number
}

export interface HomeJournalData {
    now: {
        title: string
        summary: string
        period: string
        tags: string[]
    }
    journey: JournalFeedItem[]
    builds: JournalFeedItem[]
    notes: JournalFeedItem[]
    feed: JournalFeedItem[]
}

function toTimestamp(value: string): number {
    if (!value) return 0
    const date = new Date(value)
    const timestamp = date.getTime()
    return Number.isNaN(timestamp) ? 0 : timestamp
}

function getNowBlock() {
    const experiences = getAllExperiences()
    const active = experiences.find((experience) => experience.endDate === "Present")
    const latest = active ?? experiences[0]

    if (!latest) {
        return {
            title: "Building useful software",
            summary: "Focused on building products that feel fast, thoughtful, and reliable.",
            period: "Now",
            tags: ["Engineering", "Product", "Systems"],
        }
    }

    return {
        title: `${latest.role} at ${latest.company}`,
        summary: latest.description,
        period: `${latest.startDate} - ${latest.endDate}`,
        tags: latest.skills.slice(0, 4),
    }
}

function getJourneyItems(): JournalFeedItem[] {
    return getAllExperiences()
        .slice()
        .sort((a, b) => toTimestamp(b.startDate) - toTimestamp(a.startDate))
        .map((experience) => ({
            id: `journey-${experience.slug}`,
            kind: "journey" as const,
            title: `${experience.role} at ${experience.company}`,
            summary: experience.description,
            date: experience.startDate,
            tags: [experience.type, ...experience.skills.slice(0, 2)],
            href: `/exp/${experience.slug}`,
            priority: experience.featured ? 2 : 1,
        }))
}

function getBuildItems(): JournalFeedItem[] {
    const projects = getAllProjects()
    const featured = projects.filter((project) => project.featured)
    const nonFeatured = projects.filter((project) => !project.featured)
    const selected = [...featured, ...nonFeatured].slice(0, 4)

    return selected.map((project) => ({
        id: `build-${project.slug}`,
        kind: "build" as const,
        title: project.name,
        summary: project.shortDescription || project.description,
        date: project.date,
        tags: project.tech.slice(0, 3),
        href: `/projects/${project.slug}`,
        priority: project.featured ? 2 : 1,
    }))
}

function getNoteItems(): JournalFeedItem[] {
    return getAllThoughts()
        .slice(0, 5)
        .map((thought) => ({
            id: `note-${thought.slug}`,
            kind: "note" as const,
            title: thought.title,
            summary: thought.excerpt,
            date: thought.date,
            tags: [thought.category, thought.readTime],
            href: `/thoughts/${thought.slug}`,
            priority: 1,
        }))
}

function getUnifiedFeed(...lists: JournalFeedItem[][]): JournalFeedItem[] {
    return lists
        .flat()
        .slice()
        .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date))
}

export function getHomeJournalData(): HomeJournalData {
    const now = getNowBlock()
    const journey = getJourneyItems()
    const builds = getBuildItems()
    const notes = getNoteItems()
    const feed = getUnifiedFeed(journey, builds, notes)

    return {
        now,
        journey,
        builds,
        notes,
        feed,
    }
}
