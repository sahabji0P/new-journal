// app/thoughts/page.tsx (Server Component Version with Client Wrapper)
import { getAllThoughts } from '@/lib/mdx-utils'
import ThoughtsClient from './thoughts-client'

export const metadata = {
    title: 'All Thoughts | Shashwat Jain',
    description: 'A collection of thoughts, learnings, and explorations on software engineering, design, and building for the web.',
}

export default function ThoughtsPage() {
    const thoughts = getAllThoughts()

    // Add year to each thought
    const thoughtsWithYear = thoughts.map(thought => ({
        ...thought,
        year: new Date(thought.date).getFullYear()
    }))

    return <ThoughtsClient thoughts={thoughtsWithYear} />
}