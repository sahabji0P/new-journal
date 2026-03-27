"use client"

import EndpointTree from "@/components/playground/endpoint-tree"
import type { Endpoint, EndpointGroup } from "@/components/playground/endpoint-tree"
import JsonViewer from "@/components/playground/json-viewer"
import { DEFAULT_NAV_ITEMS, NAV_ICONS, useNavPageConfig } from "@/lib/nav-context"
import { motion } from "framer-motion"
import { Check, ChevronDown, ChevronUp, Copy, Loader2, Play, Terminal } from "lucide-react"
import { useRef, useState } from "react"

// ============================================================================
// ENDPOINT CONFIGURATION
// ============================================================================

const ENDPOINT_GROUPS: EndpointGroup[] = [
    {
        group: "Profile",
        endpoints: [
            { path: "/api/v1/profile", method: "GET", description: "Get profile information", params: [] },
        ],
    },
    {
        group: "Experience",
        endpoints: [
            {
                path: "/api/v1/experience",
                method: "GET",
                description: "List all experiences",
                params: [
                    { name: "featured", type: "boolean", description: "Filter featured only" },
                    { name: "year", type: "string", description: "Filter by year" },
                    { name: "limit", type: "number", description: "Limit results" },
                    { name: "fields", type: "string", description: "Comma-separated fields" },
                ],
            },
            { path: "/api/v1/experience/:slug", method: "GET", description: "Get experience by slug", params: [] },
        ],
    },
    {
        group: "Projects",
        endpoints: [
            {
                path: "/api/v1/projects",
                method: "GET",
                description: "List all projects",
                params: [
                    { name: "featured", type: "boolean", description: "Filter featured only" },
                    { name: "category", type: "string", description: "Filter by category" },
                    { name: "year", type: "string", description: "Filter by year" },
                    { name: "limit", type: "number", description: "Limit results" },
                    { name: "fields", type: "string", description: "Comma-separated fields" },
                ],
            },
            { path: "/api/v1/projects/:slug", method: "GET", description: "Get project by slug", params: [] },
        ],
    },
    {
        group: "Research",
        endpoints: [
            {
                path: "/api/v1/research",
                method: "GET",
                description: "List all publications",
                params: [
                    { name: "featured", type: "boolean", description: "Filter featured only" },
                    { name: "year", type: "string", description: "Filter by year" },
                    { name: "limit", type: "number", description: "Limit results" },
                    { name: "fields", type: "string", description: "Comma-separated fields" },
                ],
            },
            { path: "/api/v1/research/:slug", method: "GET", description: "Get publication by slug", params: [] },
        ],
    },
    {
        group: "Thoughts",
        endpoints: [
            {
                path: "/api/v1/thoughts",
                method: "GET",
                description: "List all thoughts",
                params: [
                    { name: "category", type: "string", description: "Filter by category" },
                    { name: "year", type: "string", description: "Filter by year" },
                    { name: "limit", type: "number", description: "Limit results" },
                    { name: "fields", type: "string", description: "Comma-separated fields" },
                ],
            },
            { path: "/api/v1/thoughts/:slug", method: "GET", description: "Get thought by slug (includes content)", params: [] },
        ],
    },
    {
        group: "Aggregations",
        endpoints: [
            { path: "/api/v1/skills", method: "GET", description: "Aggregated skills from all sources", params: [] },
            { path: "/api/v1/stats", method: "GET", description: "Portfolio-wide statistics", params: [] },
        ],
    },
]

// ============================================================================
// TYPES
// ============================================================================

interface ApiResponse {
    status: number
    statusText: string
    time: number
    data: unknown
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PlaygroundClient() {
    const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint>(
        ENDPOINT_GROUPS[0].endpoints[0]
    )
    const [queryParams, setQueryParams] = useState<Record<string, string>>({})
    const [slugValue, setSlugValue] = useState("")
    const [response, setResponse] = useState<ApiResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [urlCopied, setUrlCopied] = useState(false)
    const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
    const abortRef = useRef<AbortController | null>(null)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useNavPageConfig({
        navItems: [
            ...DEFAULT_NAV_ITEMS,
            { id: "api", label: "API", href: "/api-playground", icon: NAV_ICONS.api },
        ],
        showTOC: false,
        pageTitle: "API Playground",
    })

    // Build the full request URL (derived, no memoization needed — cheap computation)
    let urlPath = selectedEndpoint.path
    if (urlPath.includes(":slug")) {
        urlPath = urlPath.replace(":slug", encodeURIComponent(slugValue || "example"))
    }
    const urlParams = new URLSearchParams()
    for (const [key, value] of Object.entries(queryParams)) {
        if (value.trim()) urlParams.set(key, value.trim())
    }
    const qs = urlParams.toString()
    const fullUrl = `${urlPath}${qs ? `?${qs}` : ""}`

    function handleSelectEndpoint(endpoint: Endpoint) {
        abortRef.current?.abort()
        setSelectedEndpoint(endpoint)
        setQueryParams({})
        setSlugValue("")
        setResponse(null)
    }

    function handleParamChange(name: string, value: string) {
        setQueryParams((prev) => ({ ...prev, [name]: value }))
    }

    async function handleSendRequest() {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        setIsLoading(true)
        try {
            const start = performance.now()
            const res = await fetch(fullUrl, { signal: controller.signal })
            const time = Math.round(performance.now() - start)
            const data: unknown = await res.json()
            setResponse({ status: res.status, statusText: res.statusText, time, data })
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") return
            const message = err instanceof Error ? err.message : "Unknown error"
            setResponse({
                status: 0,
                statusText: "Network Error",
                time: 0,
                data: { error: message },
            })
        } finally {
            setIsLoading(false)
        }
    }

    function handleCopyUrl() {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        const absoluteUrl = `${window.location.origin}${fullUrl}`
        void navigator.clipboard.writeText(absoluteUrl).then(
            () => {
                setUrlCopied(true)
                copyTimerRef.current = setTimeout(() => setUrlCopied(false), 2000)
            },
            () => { /* clipboard permission denied — silently ignore */ }
        )
    }

    const hasSlug = selectedEndpoint.path.includes(":slug")
    const hasParams = selectedEndpoint.params.length > 0

    return (
        <main className="min-h-screen px-4 sm:px-6 pt-24 pb-16 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="flex items-center gap-3 mb-3">
                    <Terminal className="w-5 h-5 text-lime-400" />
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        API Playground
                    </h1>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
                    Explore the portfolio data through a REST API. Select an endpoint,
                    configure parameters, and send requests.
                </p>
            </motion.div>

            {/* Two-panel layout */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left panel: Endpoint tree + params */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="lg:w-80 shrink-0"
                >
                    {/* Mobile toggle */}
                    <button
                        type="button"
                        aria-expanded={mobileTreeOpen}
                        aria-controls="endpoint-tree-panel"
                        onClick={() => setMobileTreeOpen((o) => !o)}
                        className="lg:hidden w-full flex items-center justify-between p-3 rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 mb-2 text-sm"
                    >
                        <span className="text-muted-foreground">Endpoints</span>
                        {mobileTreeOpen ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>

                    <div
                        id="endpoint-tree-panel"
                        className={`lg:block ${mobileTreeOpen ? "block" : "hidden"}`}
                    >
                        <div className="rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 p-3">
                            <EndpointTree
                                groups={ENDPOINT_GROUPS}
                                selectedPath={selectedEndpoint.path}
                                onSelect={handleSelectEndpoint}
                            />
                        </div>
                    </div>

                    {/* Parameter form */}
                    {(hasSlug || hasParams) && (
                        <div className="mt-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 p-4">
                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                Parameters
                            </h3>

                            {hasSlug && (
                                <div className="mb-3">
                                    <label htmlFor="param-slug" className="block text-xs text-muted-foreground mb-1">
                                        slug
                                        <span className="text-red-400 ml-1">*</span>
                                    </label>
                                    <input
                                        id="param-slug"
                                        type="text"
                                        value={slugValue}
                                        onChange={(e) => setSlugValue(e.target.value)}
                                        placeholder="e.g. my-item-slug"
                                        className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-border/50 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-lime-400/50"
                                    />
                                </div>
                            )}

                            {selectedEndpoint.params.map((param) => (
                                <div key={param.name} className="mb-3 last:mb-0">
                                    <label htmlFor={`param-${param.name}`} className="block text-xs text-muted-foreground mb-1">
                                        {param.name}
                                        <span className="ml-1.5 text-[10px] text-muted-foreground/50">
                                            {param.type}
                                        </span>
                                    </label>
                                    {param.type === "boolean" ? (
                                        <select
                                            id={`param-${param.name}`}
                                            value={queryParams[param.name] ?? ""}
                                            onChange={(e) =>
                                                handleParamChange(param.name, e.target.value)
                                            }
                                            className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-border/50 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-lime-400/50"
                                        >
                                            <option value="">--</option>
                                            <option value="true">true</option>
                                            <option value="false">false</option>
                                        </select>
                                    ) : (
                                        <input
                                            id={`param-${param.name}`}
                                            type="text"
                                            value={queryParams[param.name] ?? ""}
                                            onChange={(e) =>
                                                handleParamChange(param.name, e.target.value)
                                            }
                                            placeholder={param.description}
                                            className="w-full px-3 py-1.5 rounded-md bg-white/5 border border-border/50 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-lime-400/50"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Right panel: URL bar + response */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-1 min-w-0"
                >
                    {/* Endpoint description */}
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            {selectedEndpoint.description}
                        </h2>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                            {selectedEndpoint.method} {selectedEndpoint.path}
                        </p>
                    </div>

                    {/* URL bar + Send button */}
                    <div className="flex items-stretch gap-2 mb-4">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 font-mono text-sm overflow-hidden">
                            <span className="text-emerald-400 shrink-0 text-xs font-semibold">
                                GET
                            </span>
                            <span className="truncate text-muted-foreground">
                                {fullUrl}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyUrl}
                                className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                                aria-label="Copy URL"
                            >
                                {urlCopied ? (
                                    <Check className="w-3.5 h-3.5 text-lime-400" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleSendRequest()}
                            disabled={isLoading || (hasSlug && !slugValue.trim())}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400/15 border border-lime-400/30 text-lime-400 text-sm font-medium hover:bg-lime-400/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Send
                        </button>
                    </div>

                    {/* Response area */}
                    {response ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 overflow-hidden"
                        >
                            {/* Response header */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                                        response.status >= 200 && response.status < 300
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : response.status >= 400
                                              ? "bg-red-500/20 text-red-400"
                                              : "bg-amber-500/20 text-amber-400"
                                    }`}
                                >
                                    {response.status} {response.statusText}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {response.time}ms
                                </span>
                            </div>

                            {/* Response body */}
                            <JsonViewer data={response.data} />
                        </motion.div>
                    ) : (
                        <div className="rounded-lg bg-card/30 backdrop-blur-sm border border-border/50 p-12 text-center">
                            <Terminal className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground/50">
                                Select an endpoint and send a request to see the response
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    )
}
