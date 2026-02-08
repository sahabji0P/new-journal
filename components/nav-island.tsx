"use client";

import { DEFAULT_NAV_ITEMS, HOME_SECTION_ITEMS, useNavConfig, type NavItem, type TOCSection } from "@/lib/nav-context";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronRight, List, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// ============================================================================
// MEDIA QUERY HOOK
// ============================================================================

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [query]);

    return matches;
}

// ============================================================================
// TYPES
// ============================================================================

export interface TOCHeading {
    id: string;
    title: string;
    level: number;
}

export interface NavIslandProps {
    className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_HEADING_LEVELS = ["h2", "h3"];
const DEFAULT_CONTENT_SELECTOR = "main, article, .content, section";
const DEFAULT_SCROLL_OFFSET = 100;

// ============================================================================
// ANIMATION VARIANTS - Optimized for smooth performance
// ============================================================================

const containerVariants = {
    collapsed: {
        width: "auto",
        height: "auto",
        borderRadius: 50,
        transition: {
            type: "spring" as const,
            stiffness: 200,
            damping: 28,
            mass: 1,
        }
    },
    expanded: {
        width: "auto",
        height: "auto",
        borderRadius: 24,
        transition: {
            type: "spring" as const,
            stiffness: 180,
            damping: 26,
            mass: 1,
            staggerChildren: 0.03,
            delayChildren: 0.05,
        }
    }
};

const itemVariants = {
    hidden: {
        opacity: 0,
        y: 8,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 24,
        }
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: {
            duration: 0.15,
            ease: "easeOut" as const,
        }
    }
};

const tocItemVariants = {
    hidden: {
        opacity: 0,
        y: 6,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 260,
            damping: 24,
        }
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: {
            duration: 0.12,
            ease: "easeOut" as const,
        }
    }
};


// ============================================================================
// HOOKS
// ============================================================================

function useScrollProgress() {
    const progress = useMotionValue(0);
    const smoothProgress = useSpring(progress, {
        stiffness: 80,
        damping: 25,
        mass: 0.5,
    });
    const [displayProgress, setDisplayProgress] = useState(0);

    useEffect(() => {
        let ticking = false;

        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            const clampedProgress = Math.min(100, Math.max(0, scrollPercent));
            progress.set(clampedProgress);
            setDisplayProgress(clampedProgress);
            ticking = false;
        };

        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateProgress);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        updateProgress();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [progress]);

    return { progress: smoothProgress, displayProgress };
}

function useActiveSection(items: NavItem[], isHomePage: boolean) {
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        // Only track hash-based sections
        const sectionIds = items
            .filter(item => item.href.startsWith("#"))
            .map(item => item.href.slice(1));

        if (sectionIds.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((e) => e.isIntersecting);
                if (visibleEntries.length > 0) {
                    const sorted = visibleEntries.sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    );
                    setActiveId(sorted[0].target.id);
                }
            },
            {
                rootMargin: "-20% 0px -60% 0px",
                threshold: 0,
            }
        );

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [items, isHomePage]);

    return activeId;
}

function useTOCHeadings(
    showTOC: boolean,
    contentSelector: string,
    headingLevels: string[],
    manualSections?: TOCSection[]
) {
    const [headings, setHeadings] = useState<TOCHeading[]>([]);
    const [activeHeadingId, setActiveHeadingId] = useState<string>("");

    // If manual sections are provided, use those
    useEffect(() => {
        if (manualSections && manualSections.length > 0) {
            setHeadings(manualSections);
            return;
        }

        if (!showTOC) return;

        // Auto-detect headings from the page
        const timer = setTimeout(() => {
            const container = document.querySelector(contentSelector);
            if (!container) return;

            const selector = headingLevels.join(", ");
            const elements = Array.from(container.querySelectorAll(selector));

            const detectedHeadings: TOCHeading[] = elements.map((el) => {
                const heading = el as HTMLElement;
                if (!heading.id) {
                    heading.id =
                        heading.textContent
                            ?.toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, "") ||
                        `heading-${Math.random().toString(36).substring(2, 11)}`;
                }

                return {
                    id: heading.id,
                    title: heading.textContent || "",
                    level: parseInt(heading.tagName[1]),
                };
            });

            setHeadings(detectedHeadings);
        }, 150);

        return () => clearTimeout(timer);
    }, [showTOC, contentSelector, headingLevels, manualSections]);

    // Track active heading
    useEffect(() => {
        if (!showTOC || headings.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((e) => e.isIntersecting);
                if (visibleEntries.length > 0) {
                    const sorted = visibleEntries.sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    );
                    setActiveHeadingId(sorted[0].target.id);
                }
            },
            {
                rootMargin: "-100px 0px -70% 0px",
                threshold: 0,
            }
        );

        headings.forEach((h) => {
            const el = document.getElementById(h.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [headings, showTOC]);

    return { headings, activeHeadingId };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CircularProgress = ({ progress }: { progress: number }) => {
    const size = 28;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex-shrink-0">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressBg)"
                    strokeWidth={strokeWidth}
                    className="opacity-20"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                        transition: "stroke-dashoffset 0.3s ease-out",
                    }}
                />
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a3e635" />
                        <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                    <linearGradient id="progressBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#a3e635" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400/50" />
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NavIsland({ className }: NavIslandProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Mobile detection for responsive layout
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Get configuration from context
    const { config } = useNavConfig();

    const isHomePage = pathname === "/";
    const isArticlePage = pathname.startsWith("/thoughts/") && pathname !== "/thoughts";
    const isProjectDetailPage = pathname.startsWith("/projects/") && pathname !== "/projects";
    const isExperiencePage = pathname.startsWith("/exp/") && pathname !== "/exp";

    // Determine if TOC should be shown
    // Default: show on article pages, project detail pages, experience pages
    // Can be overridden by config.showTOC
    const defaultShowTOC = isArticlePage || isProjectDetailPage || isExperiencePage || isHomePage;
    const showTOC = config.showTOC ?? defaultShowTOC;

    // Determine nav items
    // Priority: config.navItems > page-specific defaults
    const items = useMemo(() => {
        if (config.navItems && config.navItems.length > 0) {
            return config.navItems;
        }
        return isHomePage ? HOME_SECTION_ITEMS : DEFAULT_NAV_ITEMS;
    }, [config.navItems, isHomePage]);

    // Get configuration values with defaults
    const contentSelector = config.contentSelector ?? DEFAULT_CONTENT_SELECTOR;
    const headingLevels = config.headingLevels ?? DEFAULT_HEADING_LEVELS;
    const scrollOffset = config.scrollOffset ?? DEFAULT_SCROLL_OFFSET;
    const pageTitle = config.pageTitle ?? "Navigate";

    const { progress, displayProgress } = useScrollProgress();
    const activeSection = useActiveSection(items, isHomePage);
    const { headings, activeHeadingId } = useTOCHeadings(
        showTOC,
        contentSelector,
        headingLevels,
        config.manualSections
    );

    // Smooth scale transform based on scroll
    const scale = useTransform(progress, [0, 50, 100], [1, 1.02, 1]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const currentLabel = useMemo(() => {
        // Show active heading if TOC is enabled and we have one
        if (showTOC && activeHeadingId) {
            const heading = headings.find(h => h.id === activeHeadingId);
            if (heading) return heading.title;
        }

        // Show active section for hash-based navigation (home page)
        if (activeSection) {
            const item = items.find(i => i.id === activeSection);
            if (item) return item.label;
        }

        // Show current page name for standard navigation
        if (!isHomePage) {
            const item = items.find(i => i.href === pathname);
            if (item) return item.label;
        }

        // Fallback to page title
        return pageTitle;
    }, [showTOC, activeHeadingId, headings, activeSection, items, pathname, pageTitle, isHomePage]);

    const handleNavClick = useCallback(
        (e: React.MouseEvent, href: string) => {
            if (href.startsWith("#")) {
                e.preventDefault();
                const element = document.getElementById(href.slice(1));
                if (element) {
                    const top = element.offsetTop - scrollOffset;
                    window.scrollTo({ top, behavior: "smooth" });
                }
            }
            setIsExpanded(false);
        },
        [scrollOffset]
    );

    const handleTOCClick = useCallback(
        (id: string) => {
            const element = document.getElementById(id);
            if (element) {
                const top = element.offsetTop - scrollOffset;
                window.scrollTo({ top, behavior: "smooth" });
                setIsExpanded(false);
            }
        },
        [scrollOffset]
    );

    // Close on outside click
    useEffect(() => {
        if (!isExpanded) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isExpanded]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsExpanded(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    if (!isMounted) return null;

    const hasHeadings = showTOC && headings.length > 0;

    return (
        <motion.div
            ref={containerRef}
            className={cn(
                "fixed bottom-6 left-1/2 z-50",
                className
            )}
            style={{
                x: "-50%",
                scale,
            }}
        >
            <motion.div
                variants={containerVariants}
                initial="collapsed"
                animate={isExpanded ? "expanded" : "collapsed"}
                className={cn(
                    "relative overflow-hidden",
                    "bg-[#0d0d0f]/78 backdrop-blur-xl",
                    "border border-white/[0.06]",
                    "shadow-[0_6px_24px_rgba(0,0,0,0.28)]"
                )}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        /* ==================== COLLAPSED STATE ==================== */
                        <motion.button
                            key="collapsed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsExpanded(true)}
                            className={cn(
                                "flex items-center gap-2.5 px-3.5 py-2.5",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/30"
                            )}
                        >
                            <CircularProgress progress={displayProgress} />

                            <span className="text-white/85 text-sm font-medium max-w-[150px] truncate">
                                {currentLabel}
                            </span>

                            <span className="text-white/25 text-xs font-mono tabular-nums w-10 text-right">
                                {Math.round(displayProgress)}%
                            </span>

                            <motion.div
                                className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.02] transition-colors"
                                whileHover={{ borderColor: "rgba(163, 230, 53, 0.3)" }}
                            >
                                <motion.div
                                    animate={{ rotate: 0 }}
                                    whileHover={{ rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ChevronRight className="w-3 h-3 text-white/40" />
                                </motion.div>
                            </motion.div>
                        </motion.button>
                    ) : (
                        /* ==================== EXPANDED STATE (RESPONSIVE) ==================== */
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={cn(
                                "p-4 sm:p-5",
                                isMobile
                                    ? "w-[calc(100vw-48px)] max-w-[360px]"
                                    : hasHeadings
                                        ? "w-auto min-w-[460px] max-w-[620px]"
                                        : "w-auto min-w-[260px] max-w-[320px]"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <CircularProgress progress={displayProgress} />
                                    <div className="flex flex-col">
                                        <span className="text-white/85 text-sm font-medium">
                                            {hasHeadings ? "Menu" : "Navigate"}
                                        </span>
                                        <span className="text-white/25 text-xs font-mono">
                                            {Math.round(displayProgress)}% scrolled
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1.5 rounded-full hover:bg-white/5 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            {/* Responsive Content Layout */}
                            <div className={cn(
                                "flex gap-4 sm:gap-6",
                                isMobile
                                    ? "flex-col max-h-[50vh] overflow-y-auto custom-scrollbar"
                                    : hasHeadings ? "flex-row" : "flex-col"
                            )}>
                                {/* Navigation Links Column */}
                                <motion.div
                                    className={cn(
                                        "flex-shrink-0",
                                        isMobile
                                            ? "w-full pb-4 border-b border-white/[0.06]"
                                            : hasHeadings
                                                ? "w-[160px] border-r border-white/[0.06] pr-4"
                                                : "w-full"
                                    )}
                                    variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <motion.h4
                                        className="text-white/30 text-[10px] font-mono uppercase tracking-wider mb-3"
                                        variants={itemVariants}
                                    >
                                        Go to
                                    </motion.h4>
                                    <nav className="space-y-1">
                                        {items.map((item) => {
                                            const isHashLink = item.href.startsWith("#");
                                            const isActive = isHashLink
                                                ? activeSection === item.id
                                                : pathname === item.href;

                                            const navItemContent = (
                                                <motion.div
                                                    variants={itemVariants}
                                                    whileHover={{ x: 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                                                        "focus:outline-none focus-visible:ring-1 focus-visible:ring-lime-400/30",
                                                        isActive
                                                            ? "bg-lime-400/10 text-white/90"
                                                            : "text-white/45 hover:text-white/80 hover:bg-white/[0.03]"
                                                    )}
                                                >
                                                    <motion.span
                                                        className={cn(
                                                            "transition-colors duration-200",
                                                            isActive ? "text-lime-400" : ""
                                                        )}
                                                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {item.icon}
                                                    </motion.span>
                                                    <span className="flex-1">{item.label}</span>
                                                    {isActive && (
                                                        <motion.div
                                                            className="w-1.5 h-1.5 rounded-full bg-lime-400"
                                                            layoutId="activeNavIndicator"
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                        />
                                                    )}
                                                </motion.div>
                                            );

                                            if (isHashLink) {
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={(e) => handleNavClick(e, item.href)}
                                                        className="w-full"
                                                    >
                                                        {navItemContent}
                                                    </button>
                                                );
                                            }

                                            return (
                                                <Link
                                                    key={item.id}
                                                    href={item.href}
                                                    onClick={() => setIsExpanded(false)}
                                                    className="block"
                                                >
                                                    {navItemContent}
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                </motion.div>

                                {/* TOC Column (if enabled and has headings) */}
                                {hasHeadings && (
                                    <motion.div
                                        className={cn(
                                            "min-w-0",
                                            isMobile ? "w-full pt-4" : "flex-1"
                                        )}
                                        variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: isMobile ? 0.05 : 0.15 } } }}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        <motion.div
                                            className="flex items-center gap-2 mb-3"
                                            variants={tocItemVariants}
                                        >
                                            <List className="w-3 h-3 text-white/30" />
                                            <h4 className="text-white/30 text-[10px] font-mono uppercase tracking-wider">
                                                On this page
                                            </h4>
                                        </motion.div>
                                        <div className={cn(
                                            "space-y-0.5 overflow-y-auto custom-scrollbar pr-2",
                                            isMobile ? "max-h-[35vh]" : "max-h-[220px]"
                                        )}>
                                            {headings.map((heading) => (
                                                <motion.button
                                                    key={heading.id}
                                                    variants={tocItemVariants}
                                                    onClick={() => handleTOCClick(heading.id)}
                                                    whileHover={{ x: 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={cn(
                                                        "w-full text-left py-1.5 px-3 text-sm transition-all duration-200 rounded-lg",
                                                        "focus:outline-none focus-visible:ring-1 focus-visible:ring-lime-400/30",
                                                        heading.level === 3 && "pl-6",
                                                        activeHeadingId === heading.id
                                                            ? "text-white bg-white/[0.05]"
                                                            : "text-white/35 hover:text-white/70 hover:bg-white/[0.02]"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {activeHeadingId === heading.id && (
                                                            <motion.span
                                                                className="w-1 h-4 bg-lime-400/60 rounded-full flex-shrink-0"
                                                                layoutId="activeTocIndicator"
                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                            />
                                                        )}
                                                        <span className="truncate">{heading.title}</span>
                                                    </span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4 pt-3 border-t border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-[width] duration-300 ease-out"
                                            style={{
                                                background: "linear-gradient(90deg, #a3e635 0%, #4ade80 50%, #22d3ee 100%)",
                                                width: `${displayProgress}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </motion.div>
    );
}

export default NavIsland;

// Re-export types for convenience
export type { NavItem, TOCSection } from "@/lib/nav-context";
