"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BookOpen, Briefcase, ChevronRight, FolderOpen, Home, List, MessageCircle, X } from "lucide-react";
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
    showTOC?: boolean;
    articleTitle?: string;
    navItems?: NavItem[];
    contentSelector?: string;
    headingLevels?: string[];
    scrollOffset?: number;
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
const DEFAULT_CONTENT_SELECTOR = "article, main, .content, section";
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
    const isProjectsPage = pathname === "/projects";

    // Enable TOC on both article pages and projects page
    const showTOC = showTOCProp ?? (isArticlePage || isProjectsPage);
    const items = navItems ?? (isHomePage ? HOME_SECTION_ITEMS : DEFAULT_NAV_ITEMS);

    const { progress, displayProgress } = useScrollProgress();
    const activeSection = useActiveSection(items, isHomePage);
    const { headings, activeHeadingId } = useTOCHeadings(
        showTOC,
        contentSelector,
        headingLevels
    );

    // Smooth scale transform based on scroll
    const scale = useTransform(progress, [0, 50, 100], [1, 1.02, 1]);

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
                    "bg-[#0a0a0b]/90 backdrop-blur-2xl",
                    "border border-white/[0.08]",
                    "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]"
                )}
            >
                <AnimatePresence mode="wait">
                    {!isExpanded ? (
                        /* ==================== COLLAPSED STATE ==================== */
                        <motion.button
                            key="collapsed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            onClick={() => setIsExpanded(true)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/30"
                            )}
                        >
                            <CircularProgress progress={displayProgress} />

                            <span className="text-white/90 text-sm font-medium max-w-[180px] truncate">
                                {currentLabel}
                            </span>

                            <span className="text-white/30 text-xs font-mono tabular-nums w-10 text-right">
                                {Math.round(displayProgress)}%
                            </span>

                            <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.03] hover:border-lime-400/30 transition-colors">
                                <ChevronRight className="w-3 h-3 text-white/40" />
                            </div>
                        </motion.button>
                    ) : (
                        /* ==================== EXPANDED STATE (HORIZONTAL) ==================== */
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "p-5",
                                hasHeadings ? "min-w-[580px] max-w-[700px]" : "min-w-[300px] max-w-[360px]"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <CircularProgress progress={displayProgress} />
                                    <div className="flex flex-col">
                                        <span className="text-white/90 text-sm font-medium">
                                            {hasHeadings ? "Navigation" : "Navigate"}
                                        </span>
                                        <span className="text-white/30 text-xs font-mono">
                                            {Math.round(displayProgress)}% scrolled
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-2 rounded-full hover:bg-white/5 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4 text-white/40" />
                                </button>
                            </div>

                            {/* Horizontal Content Layout */}
                            <div className={cn(
                                "flex gap-6",
                                hasHeadings ? "flex-row" : "flex-col"
                            )}>
                                {/* Navigation Links Column */}
                                <motion.div
                                    className={cn(
                                        "flex-shrink-0",
                                        hasHeadings ? "w-[200px] border-r border-white/[0.06] pr-6" : "w-full"
                                    )}
                                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
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
                                            const isActive = isHomePage
                                                ? activeSection === item.id
                                                : pathname === item.href;

                                            const navItemContent = (
                                                <motion.div
                                                    variants={itemVariants}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                                                        "focus:outline-none",
                                                        isActive
                                                            ? "bg-lime-400/10 text-white"
                                                            : "text-white/50 hover:text-white hover:bg-white/[0.03]"
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "transition-colors duration-200",
                                                            isActive ? "text-lime-400" : ""
                                                        )}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    <span className="flex-1">{item.label}</span>
                                                    {isActive && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                                                    )}
                                                </motion.div>
                                            );

                                            if (item.href.startsWith("#")) {
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
                                        className="flex-1 min-w-0"
                                        variants={{ visible: { transition: { staggerChildren: 0.03, delayChildren: 0.15 } } }}
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
                                            <span className="text-white/20 text-[10px] font-mono">
                                                ({headings.length})
                                            </span>
                                        </motion.div>
                                        <div className="space-y-0.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                                            {headings.map((heading) => (
                                                <motion.button
                                                    key={heading.id}
                                                    variants={tocItemVariants}
                                                    onClick={() => handleTOCClick(heading.id)}
                                                    className={cn(
                                                        "w-full text-left py-2 px-3 text-sm transition-all duration-200 rounded-lg",
                                                        "focus:outline-none",
                                                        heading.level === 3 && "pl-6",
                                                        activeHeadingId === heading.id
                                                            ? "text-white bg-white/[0.05]"
                                                            : "text-white/40 hover:text-white/70 hover:bg-white/[0.02]"
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {activeHeadingId === heading.id && (
                                                            <span className="w-1 h-4 bg-lime-400/60 rounded-full flex-shrink-0" />
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
                            <div className="mt-5 pt-4 border-t border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
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
