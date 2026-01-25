/**
 * Experience type definitions and client-safe utility functions.
 * This file can be safely imported in both server and client components.
 */

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

/**
 * Formats a date range for display.
 * @param startDate - Start date in YYYY-MM format
 * @param endDate - End date in YYYY-MM format or "Present"
 * @returns Formatted date range string (e.g., "Jan 2024 - Present")
 */
export function formatDateRange(startDate: string, endDate: string): string {
    const formatDate = (dateStr: string) => {
        if (dateStr === 'Present') return 'Present'
        const date = new Date(dateStr + '-01')
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }

    return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Calculates the duration between two dates.
 * @param startDate - Start date in YYYY-MM format
 * @param endDate - End date in YYYY-MM format or "Present"
 * @returns Human-readable duration string (e.g., "1 year, 3 months")
 */
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
