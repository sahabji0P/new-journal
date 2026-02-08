/**
 * Server-side utilities for building dynamic navigation based on existing content.
 * These functions check what content directories exist and have files.
 */

import fs from 'fs';
import path from 'path';

export interface ContentCounts {
    hasProjects: boolean;
    hasThoughts: boolean;
    hasWork: boolean;
    hasExperience: boolean;
    projectCount: number;
    thoughtCount: number;
    workCount: number;
    experienceCount: number;
}

/**
 * Check if a content directory exists and has MDX files.
 */
function checkContentDirectory(dirName: string): { exists: boolean; count: number } {
    const contentDir = path.join(process.cwd(), 'content', dirName);

    if (!fs.existsSync(contentDir)) {
        return { exists: false, count: 0 };
    }

    try {
        const files = fs.readdirSync(contentDir);
        const mdxFiles = files.filter(f => f.endsWith('.mdx'));
        return {
            exists: mdxFiles.length > 0,
            count: mdxFiles.length
        };
    } catch {
        return { exists: false, count: 0 };
    }
}

/**
 * Get information about all content that exists in the codebase.
 * This is meant to be called server-side.
 */
export function getContentCounts(): ContentCounts {
    const projects = checkContentDirectory('projects');
    const thoughts = checkContentDirectory('thoughts');
    const work = checkContentDirectory('work');
    const experience = checkContentDirectory('experience');

    return {
        hasProjects: projects.exists,
        hasThoughts: thoughts.exists,
        hasWork: work.exists,
        hasExperience: experience.exists,
        projectCount: projects.count,
        thoughtCount: thoughts.count,
        workCount: work.count,
        experienceCount: experience.count,
    };
}

/**
 * Serializable nav item for passing from server to client.
 * Icons need to be added on the client side.
 */
export interface SerializableNavItem {
    id: string;
    label: string;
    href: string;
    iconType: 'home' | 'projects' | 'thoughts' | 'work' | 'experience' | 'connect' | 'about';
}

/**
 * Build navigation items based on what content exists.
 * Returns serializable items that can be passed to client components.
 */
export function buildNavItemsFromContent(): SerializableNavItem[] {
    getContentCounts();
    const items: SerializableNavItem[] = [
        { id: "home", label: "Home", href: "/", iconType: "home" },
    ];
    // Primary navigation is intentionally minimal; archive pages remain accessible by direct URL.

    return items;
}

/**
 * Home page section items (for hash-based navigation).
 * These are static since they represent fixed sections of the home page.
 */
export const HOME_SECTION_NAV: SerializableNavItem[] = [
    { id: "intro", label: "Intro", href: "#intro", iconType: "home" },
    { id: "now", label: "Now", href: "#now", iconType: "about" },
    { id: "journey", label: "Journey", href: "#journey", iconType: "experience" },
    { id: "builds", label: "Builds", href: "#builds", iconType: "projects" },
    { id: "notes", label: "Notes", href: "#notes", iconType: "thoughts" },
    { id: "connect", label: "Connect", href: "#connect", iconType: "connect" },
];
