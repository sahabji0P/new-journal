"use client"

import { ChevronRight, Folder } from "lucide-react"
import { useState } from "react"

export interface EndpointParam {
    name: string
    type: string
    description: string
}

export interface Endpoint {
    path: string
    method: string
    description: string
    params: EndpointParam[]
}

export interface EndpointGroup {
    group: string
    endpoints: Endpoint[]
}

interface EndpointTreeProps {
    groups: EndpointGroup[]
    selectedPath: string
    onSelect: (endpoint: Endpoint) => void
}

export default function EndpointTree({ groups, selectedPath, onSelect }: EndpointTreeProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        return new Set([groups[0]?.group ?? ""])
    })

    function toggleGroup(group: string) {
        setExpandedGroups((prev) => {
            const next = new Set(prev)
            if (next.has(group)) {
                next.delete(group)
            } else {
                next.add(group)
            }
            return next
        })
    }

    function getDisplayPath(path: string): string {
        const segments = path.split("/").filter(Boolean)
        const display = segments.length > 3 ? segments.slice(-2) : segments.slice(-1)
        return "/" + display.join("/")
    }

    return (
        <nav className="space-y-1">
            {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.group)

                return (
                    <div key={group.group}>
                        <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`group-${group.group}`}
                            onClick={() => toggleGroup(group.group)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/5"
                        >
                            <ChevronRight
                                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                            <Folder className="w-3.5 h-3.5" />
                            <span className="flex-1 text-left">{group.group}</span>
                            <span className="text-[10px] text-muted-foreground/60">
                                {group.endpoints.length}
                            </span>
                        </button>

                        <div
                            id={`group-${group.group}`}
                            className="overflow-hidden transition-all duration-200"
                            style={{
                                display: "grid",
                                gridTemplateRows: isExpanded ? "1fr" : "0fr",
                                opacity: isExpanded ? 1 : 0,
                            }}
                        >
                            <div className="min-h-0 overflow-hidden">
                                <div className="ml-3 border-l border-border/30 pl-2 space-y-0.5 py-1">
                                    {group.endpoints.map((endpoint) => {
                                        const isSelected = selectedPath === endpoint.path

                                        return (
                                            <button
                                                key={endpoint.path}
                                                type="button"
                                                onClick={() => onSelect(endpoint)}
                                                title={endpoint.description}
                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all duration-150 ${
                                                    isSelected
                                                        ? "bg-lime-400/10 border-l-2 border-lime-400 text-foreground"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-l-2 border-transparent"
                                                }`}
                                            >
                                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0">
                                                    {endpoint.method}
                                                </span>
                                                <span className="font-mono text-xs truncate">
                                                    {getDisplayPath(endpoint.path)}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </nav>
    )
}
