"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
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

export interface TOCHeading {
    id: string;
    title: string;
    level: number;
    children?: TOCHeading[];
}

export interface TOCIslandProps {
    /** Article/post title shown in expanded header */
    title?: string;
    /** Author or subtitle shown below title */
    subtitle?: string;
    /** Thumbnail/icon image URL */
    thumbnail?: string;
    /** Pass headings manually, or leave undefined for auto-detection */
    headings?: TOCHeading[];
    /** CSS selector for the content container (for auto-detection) */
    contentSelector?: string;
    /** Heading levels to detect: default ["h2", "h3"] */
    headingLevels?: string[];
    /** Offset for scroll spy (pixels from top) */
    scrollOffset?: number;
    /** Words per minute for read time calculation */
    wordsPerMinute?: number;
    /** Custom class name */
    className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_HEADING_LEVELS = ["h2", "h3"] as const;
const DEFAULT_CONTENT_SELECTOR = "article, main, .content";
const DEFAULT_SCROLL_OFFSET = 100;
const DEFAULT_WPM = 200;

// ============================================================================
// HOOKS
// ============================================================================

function useHeadingsData(
    providedHeadings?: TOCHeading[],
    contentSelector: string = DEFAULT_CONTENT_SELECTOR,
    headingLevels?: string[]
) {
    const [headings, setHeadings] = useState<TOCHeading[]>([]);
    const [readTimeSeconds, setReadTimeSeconds] = useState<number>(0);
    const hasInitialized = useRef(false);

    const stableHeadingLevels = useMemo(
        () => headingLevels ?? DEFAULT_HEADING_LEVELS,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [headingLevels?.join(",")]
    );

    useEffect(() => {
        if (providedHeadings && providedHeadings.length > 0) {
            setHeadings(providedHeadings);
            hasInitialized.current = true;
        }
    }, [providedHeadings]);

    useEffect(() => {
        if (providedHeadings && providedHeadings.length > 0) return;
        if (hasInitialized.current) return;

        const container = document.querySelector(contentSelector);
        if (!container) return;

        const selector = stableHeadingLevels.join(", ");
        const elements = Array.from(container.querySelectorAll(selector));

        if (elements.length === 0) return;

        const nestedHeadings: TOCHeading[] = [];
        let currentH2: TOCHeading | null = null;

        elements.forEach((el) => {
            const heading = el as HTMLElement;

            if (!heading.id) {
                heading.id =
                    heading.textContent
                        ?.toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "") ||
                    `heading-${Math.random().toString(36).substr(2, 9)}`;
            }

            const item: TOCHeading = {
                id: heading.id,
                title: heading.textContent || "",
                level: parseInt(heading.tagName[1]),
                children: [],
            };

            if (heading.tagName === "H2") {
                currentH2 = item;
                nestedHeadings.push(item);
            } else if (heading.tagName === "H3" && currentH2) {
                currentH2.children?.push(item);
            } else {
                nestedHeadings.push(item);
            }
        });

        const text = container.textContent || "";
        const wordCount = text.trim().split(/\s+/).length;
        const minutes = wordCount / DEFAULT_WPM;

        setHeadings(nestedHeadings);
        setReadTimeSeconds(Math.ceil(minutes * 60));
        hasInitialized.current = true;
    }, [providedHeadings, contentSelector, stableHeadingLevels]);

    return { headings, readTimeSeconds };
}

function useScrollProgress() {
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight =
                document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(Math.min(100, Math.max(0, scrollPercent)));
        };

        const handleScroll = () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            rafRef.current = requestAnimationFrame(updateProgress);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        updateProgress();

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return progress;
}

function useActiveHeading(headings: TOCHeading[], offset: number = DEFAULT_SCROLL_OFFSET) {
    const [activeId, setActiveId] = useState<string>("");

    const flatHeadingIds = useMemo(() => {
        const ids: string[] = [];
        headings.forEach((h) => {
            ids.push(h.id);
            h.children?.forEach((c) => ids.push(c.id));
        });
        return ids;
    }, [headings]);

    useEffect(() => {
        if (flatHeadingIds.length === 0) return;

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
                rootMargin: `-${offset}px 0px -70% 0px`,
                threshold: 0,
            }
        );

        flatHeadingIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [flatHeadingIds, offset]);

    return activeId;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Circular progress indicator with percentage */
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
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/20"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className="text-[#a3e635]"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                        transition: "stroke-dashoffset 0.3s ease-out",
                    }}
                />
            </svg>
        </div>
    );
};

/** Empty circle button for expand action */
const ExpandCircle = () => (
    <div className="w-6 h-6 rounded-full border-2 border-white/30 flex-shrink-0" />
);

/** Thumbnail component for expanded header */
const Thumbnail = ({ src }: { src?: string }) => {
    if (src) {
        return (
            <img
                src={src}
                alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
        );
    }

    return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 via-emerald-400 to-blue-500 flex-shrink-0" />
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TOCIsland({
    title,
    subtitle,
    thumbnail,
    headings: providedHeadings,
    contentSelector = DEFAULT_CONTENT_SELECTOR,
    headingLevels,
    scrollOffset = DEFAULT_SCROLL_OFFSET,
    className,
}: TOCIslandProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { headings, readTimeSeconds } = useHeadingsData(
        providedHeadings,
        contentSelector,
        headingLevels
    );
    const progress = useScrollProgress();
    const activeId = useActiveHeading(headings, scrollOffset);

    const elapsedSeconds = Math.round((progress / 100) * readTimeSeconds);

    const activeHeading = useMemo(() => {
        for (const h of headings) {
            if (h.id === activeId) return h;
            const child = h.children?.find((c) => c.id === activeId);
            if (child) return child;
        }
        return headings[0];
    }, [headings, activeId]);

    const flattenedHeadings = useMemo(() => {
        const flat: TOCHeading[] = [];
        headings.forEach((h) => {
            flat.push(h);
            h.children?.forEach((c) => flat.push(c));
        });
        return flat;
    }, [headings]);

    const handleNavigate = useCallback(
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
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
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

    if (headings.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={cn(
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
                className
            )}
        >
            <motion.div
                layout
                transition={{
                    layout: { type: "spring", stiffness: 400, damping: 30 },
                }}
                className={cn(
                    "relative overflow-hidden",
                    "bg-[#1c1c1e] backdrop-blur-xl",
                    "shadow-2xl shadow-black/50",
                    isExpanded ? "rounded-[20px]" : "rounded-full"
                )}
            >
                {/* Collapsed State */}
                <AnimatePresence mode="wait">
                    {!isExpanded && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setIsExpanded(true)}
                            className={cn(
                                "flex items-center gap-3 pl-3 pr-3 py-2.5",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            )}
                        >
                            {/* Circular progress indicator */}
                            <CircularProgress progress={progress} />

                            {/* Current section title */}
                            <span className="text-white text-[15px] font-medium px-1 max-w-[180px] truncate">
                                {activeHeading?.title || title || "Contents"}
                            </span>

                            {/* Percentage */}
                            <span className="text-white/40 text-xs font-mono tabular-nums">
                                {Math.round(progress)}%
                            </span>

                            {/* Expand circle button */}
                            <ExpandCircle />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Expanded State */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="p-5 min-w-[300px]"
                        >
                            {/* Header with thumbnail, title, subtitle */}
                            <div className="flex items-center gap-4 mb-6">
                                <Thumbnail src={thumbnail} />

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-base leading-tight">
                                        {title || "Contents"}
                                    </h3>
                                    {subtitle && (
                                        <p className="text-white/50 text-sm mt-0.5">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* TOC List */}
                            <nav className="space-y-1 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                                {/* Title as first item (most dimmed) */}
                                {title && (
                                    <div className="py-1 text-white/25 text-[15px]">
                                        {title}
                                    </div>
                                )}

                                {flattenedHeadings.map((heading) => {
                                    const isActive = activeId === heading.id;

                                    return (
                                        <button
                                            key={heading.id}
                                            onClick={() => handleNavigate(heading.id)}
                                            className={cn(
                                                "block w-full text-left py-1 text-[15px] transition-colors duration-150",
                                                "focus:outline-none",
                                                isActive
                                                    ? "text-white"
                                                    : "text-white/40 hover:text-white/60"
                                            )}
                                        >
                                            {heading.title}
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Progress bar with time */}
                            <div className="flex items-center gap-3">
                                <span className="text-white/50 text-xs font-mono tabular-nums min-w-[40px]">
                                    {formatTime(elapsedSeconds)}
                                </span>

                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-white/40 rounded-full"
                                        style={{ width: `${progress}%` }}
                                        transition={{ duration: 0.1, ease: "linear" }}
                                    />
                                </div>

                                <span className="text-white/50 text-xs font-mono tabular-nums min-w-[40px] text-right">
                                    {formatTime(readTimeSeconds)}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Custom scrollbar styles */}
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

export default TOCIsland;