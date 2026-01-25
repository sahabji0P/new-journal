"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { BookOpen, Briefcase, FileText, FolderOpen, Home, MessageCircle, User } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: ReactNode;
}

export interface TOCSection {
    id: string;
    title: string;
    level: number;
}

export interface NavConfig {
    /** Navigation items to show in the "Go to" section */
    navItems?: NavItem[];
    /** Whether to enable TOC detection for this page */
    showTOC?: boolean;
    /** CSS selector to find content for TOC heading detection */
    contentSelector?: string;
    /** Heading levels to detect (e.g., ["h2", "h3"]) */
    headingLevels?: string[];
    /** Scroll offset when jumping to sections */
    scrollOffset?: number;
    /** Title to show in collapsed state when no active section */
    pageTitle?: string;
    /** Manual TOC sections (when auto-detection is not desired) */
    manualSections?: TOCSection[];
}

interface NavContextValue {
    config: NavConfig;
    setConfig: (config: NavConfig) => void;
    resetConfig: () => void;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: NavConfig = {
    showTOC: true,
    contentSelector: "main, article, .content, section",
    headingLevels: ["h2", "h3"],
    scrollOffset: 100,
    pageTitle: "Navigate",
};

// ============================================================================
// ICON MAPPINGS
// ============================================================================

export const NAV_ICONS = {
    home: <Home className="w-4 h-4" />,
    projects: <FolderOpen className="w-4 h-4" />,
    thoughts: <BookOpen className="w-4 h-4" />,
    work: <FileText className="w-4 h-4" />,
    experience: <Briefcase className="w-4 h-4" />,
    connect: <MessageCircle className="w-4 h-4" />,
    about: <User className="w-4 h-4" />,
} as const;

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/** Default navigation items for most pages */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
    { id: "home", label: "Home", href: "/", icon: NAV_ICONS.home },
    { id: "projects", label: "Projects", href: "/projects", icon: NAV_ICONS.projects },
    { id: "thoughts", label: "Thoughts", href: "/thoughts", icon: NAV_ICONS.thoughts },
];

/** Navigation items for the home page (section-based) */
export const HOME_SECTION_ITEMS: NavItem[] = [
    { id: "intro", label: "Home", href: "#intro", icon: NAV_ICONS.home },
    { id: "journey", label: "Journey", href: "#journey", icon: NAV_ICONS.experience },
    { id: "work", label: "Work", href: "#work", icon: NAV_ICONS.work },
    { id: "projects", label: "Projects", href: "#projects", icon: NAV_ICONS.projects },
    { id: "thoughts", label: "Thoughts", href: "#thoughts", icon: NAV_ICONS.thoughts },
    { id: "connect", label: "Connect", href: "#connect", icon: NAV_ICONS.connect },
];

// ============================================================================
// CONTEXT
// ============================================================================

const NavContext = createContext<NavContextValue | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
    const [config, setConfigState] = useState<NavConfig>(DEFAULT_CONFIG);

    const setConfig = useCallback((newConfig: NavConfig) => {
        setConfigState(prev => ({ ...prev, ...newConfig }));
    }, []);

    const resetConfig = useCallback(() => {
        setConfigState(DEFAULT_CONFIG);
    }, []);

    return (
        <NavContext.Provider value={{ config, setConfig, resetConfig }}>
            {children}
        </NavContext.Provider>
    );
}

export function useNavConfig() {
    const context = useContext(NavContext);
    if (!context) {
        // Return a default implementation if used outside provider
        return {
            config: DEFAULT_CONFIG,
            setConfig: () => {},
            resetConfig: () => {},
        };
    }
    return context;
}

// ============================================================================
// HELPER HOOK FOR PAGES
// ============================================================================

import { useEffect } from "react";

/**
 * Hook to configure NavIsland for a specific page.
 * Call this in your page/client component to set up navigation.
 *
 * @example
 * ```tsx
 * useNavPageConfig({
 *   navItems: HOME_SECTION_ITEMS,
 *   showTOC: true,
 *   pageTitle: "Home",
 * });
 * ```
 */
export function useNavPageConfig(pageConfig: NavConfig) {
    const { setConfig, resetConfig } = useNavConfig();

    useEffect(() => {
        setConfig(pageConfig);

        // Reset to defaults when unmounting
        return () => {
            resetConfig();
        };
    }, [setConfig, resetConfig]); // eslint-disable-line react-hooks/exhaustive-deps
    // We intentionally exclude pageConfig to prevent re-runs on object reference changes
}

// ============================================================================
// DYNAMIC NAV BUILDER
// ============================================================================

export interface ContentCounts {
    hasProjects: boolean;
    hasThoughts: boolean;
    hasWork: boolean;
    hasExperience: boolean;
}

/**
 * Build navigation items based on what content exists in the codebase.
 * This can be called server-side to determine available sections.
 */
export function buildDynamicNavItems(content: ContentCounts): NavItem[] {
    const items: NavItem[] = [
        { id: "home", label: "Home", href: "/", icon: NAV_ICONS.home },
    ];

    if (content.hasProjects) {
        items.push({ id: "projects", label: "Projects", href: "/projects", icon: NAV_ICONS.projects });
    }

    if (content.hasThoughts) {
        items.push({ id: "thoughts", label: "Thoughts", href: "/thoughts", icon: NAV_ICONS.thoughts });
    }

    if (content.hasWork) {
        items.push({ id: "work", label: "Work", href: "/work", icon: NAV_ICONS.work });
    }

    if (content.hasExperience) {
        items.push({ id: "experience", label: "Experience", href: "/experience", icon: NAV_ICONS.experience });
    }

    return items;
}
