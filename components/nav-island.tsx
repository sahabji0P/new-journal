"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { BookOpen, Briefcase, FolderOpen, Home, MessageCircle, X } from "lucide-react";
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
// TYPES
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    href: string;
    icon: React.ReactNode;
}

export interface TOCHeading {
    id: string;
    title: string;
    level: number;
}

export interface NavIslandProps {
    /** Show TOC mode for article pages */
    showTOC?: boolean;
    /** Article title for TOC mode */
    articleTitle?: string;
    /** Custom nav items (overrides default) */
    navItems?: NavItem[];
    /** CSS selector for content container (TOC auto-detection) */
    contentSelector?: string;
    /** Heading levels to detect */
    headingLevels?: string[];
    /** Scroll offset for TOC navigation */
    scrollOffset?: number;
    /** Custom class name */
    className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_NAV_ITEMS: NavItem[] = [
    { id: "home", label: "Home", href: "/", icon: <Home className="w-4 h-4" /> },
    { id: "projects", label: "Projects", href: "/projects", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "thoughts", label: "Thoughts", href: "/thoughts", icon: <BookOpen className="w-4 h-4" /> },
];

const HOME_SECTION_ITEMS: NavItem[] = [
    { id: "intro", label: "Home", href: "#intro", icon: <Home className="w-4 h-4" /> },
    { id: "work", label: "Work", href: "#work", icon: <Briefcase className="w-4 h-4" /> },
    { id: "projects", label: "Projects", href: "#projects", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "thoughts", label: "Thoughts", href: "#thoughts", icon: <BookOpen className="w-4 h-4" /> },
    { id: "connect", label: "Connect", href: "#connect", icon: <MessageCircle className="w-4 h-4" /> },
];

const DEFAULT_HEADING_LEVELS = ["h2", "h3"];
const DEFAULT_CONTENT_SELECTOR = "article, main, .content";
const DEFAULT_SCROLL_OFFSET = 100;

// ============================================================================
// HOOKS
// ============================================================================

function useScrollProgress() {
    const progress = useMotionValue(0);
    const smoothProgress = useSpring(progress, { stiffness: 100, damping: 30 });
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
        if (!isHomePage) return;

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
    headingLevels: string[]
) {
    const [headings, setHeadings] = useState<TOCHeading[]>([]);
    const [activeHeadingId, setActiveHeadingId] = useState<string>("");

    useEffect(() => {
        if (!showTOC) return;

        // Wait for content to render
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
        }, 100);

        return () => clearTimeout(timer);
    }, [showTOC, contentSelector, headingLevels]);

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
    const size = 24;
    const strokeWidth = 2;
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
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/10"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="text-lime-400"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                    }}
                />
            </svg>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NavIsland({
    showTOC: showTOCProp,
    articleTitle,
    navItems,
    contentSelector = DEFAULT_CONTENT_SELECTOR,
    headingLevels = DEFAULT_HEADING_LEVELS,
    scrollOffset = DEFAULT_SCROLL_OFFSET,
    className,
}: NavIslandProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    const isHomePage = pathname === "/";
    const isArticlePage = pathname.startsWith("/thoughts/") && pathname !== "/thoughts";
    const showTOC = showTOCProp ?? isArticlePage;
    const items = navItems ?? (isHomePage ? HOME_SECTION_ITEMS : DEFAULT_NAV_ITEMS);

    const { displayProgress } = useScrollProgress();
    const activeSection = useActiveSection(items, isHomePage);
    const { headings, activeHeadingId } = useTOCHeadings(
        showTOC,
        contentSelector,
        headingLevels
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const currentLabel = useMemo(() => {
        if (showTOC && activeHeadingId) {
            const heading = headings.find(h => h.id === activeHeadingId);
            if (heading) return heading.title;
        }

        if (isHomePage && activeSection) {
            const item = items.find(i => i.id === activeSection);
            if (item) return item.label;
        }

        if (!isHomePage) {
            const item = items.find(i => i.href === pathname);
            if (item) return item.label;
        }

        return articleTitle || "Navigate";
    }, [showTOC, activeHeadingId, headings, isHomePage, activeSection, items, pathname, articleTitle]);

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

    return (
        <div
            ref={containerRef}
            className={cn(
                "fixed bottom-6 left-1/2 z-50",
                className
            )}
            style={{ transform: "translateX(-50%)" }}
        >
            <motion.div
                initial={false}
                animate={{
                    width: isExpanded ? "auto" : "auto",
                    borderRadius: isExpanded ? 20 : 50,
                }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 40,
                }}
                className={cn(
                    "relative overflow-hidden",
                    "bg-[#1a1a1c]/95 backdrop-blur-xl",
                    "border border-white/10",
                    "shadow-2xl shadow-black/40"
                )}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        <motion.button
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setIsExpanded(true)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-2.5",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                            )}
                        >
                            <CircularProgress progress={displayProgress} />

                            <span className="text-white text-sm font-medium max-w-[160px] truncate">
                                {currentLabel}
                            </span>

                            <span className="text-white/40 text-xs font-mono tabular-nums w-8 text-right">
                                {Math.round(displayProgress)}%
                            </span>

                            <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center">
                                <motion.div
                                    className="w-1 h-1 rounded-full bg-white/60"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>
                        </motion.button>
                    ) : (
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="p-4 min-w-[280px] max-w-[320px]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white/90 text-sm font-medium">
                                    {showTOC && headings.length > 0 ? "Contents" : "Navigate"}
                                </h3>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4 text-white/60" />
                                </button>
                            </div>

                            {/* Navigation Links */}
                            <nav className="space-y-1 mb-4">
                                {items.map((item) => {
                                    const isActive = isHomePage
                                        ? activeSection === item.id
                                        : pathname === item.href;

                                    const navItemClass = cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                        "focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
                                        isActive
                                            ? "bg-white/10 text-white"
                                            : "text-white/50 hover:text-white hover:bg-white/5"
                                    );

                                    const navItemContent = (
                                        <>
                                            <span className={cn(
                                                "transition-colors duration-200",
                                                isActive ? "text-lime-400" : ""
                                            )}>
                                                {item.icon}
                                            </span>
                                            <span>{item.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeIndicator"
                                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-lime-400"
                                                />
                                            )}
                                        </>
                                    );

                                    if (item.href.startsWith("#")) {
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={(e) => handleNavClick(e, item.href)}
                                                className={navItemClass}
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
                                            className={navItemClass}
                                        >
                                            {navItemContent}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* TOC Section (if enabled and has headings) */}
                            {showTOC && headings.length > 0 && (
                                <>
                                    <div className="border-t border-white/10 pt-4 mt-4">
                                        <h4 className="text-white/40 text-xs font-mono mb-3">
                                            ON THIS PAGE
                                        </h4>
                                        <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {headings.map((heading) => (
                                                <button
                                                    key={heading.id}
                                                    onClick={() => handleTOCClick(heading.id)}
                                                    className={cn(
                                                        "w-full text-left py-1.5 text-sm transition-colors duration-150",
                                                        "focus:outline-none",
                                                        heading.level === 3 && "pl-4",
                                                        activeHeadingId === heading.id
                                                            ? "text-white"
                                                            : "text-white/40 hover:text-white/70"
                                                    )}
                                                >
                                                    {heading.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Progress Bar */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-lime-400/60 rounded-full"
                                            style={{ width: `${displayProgress}%` }}
                                        />
                                    </div>
                                    <span className="text-white/40 text-xs font-mono tabular-nums">
                                        {Math.round(displayProgress)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
            `}</style>
        </div>
    );
}

export default NavIsland;
