"use client"

import { Check, Copy } from "lucide-react"
import { useCallback, useState } from "react"

interface JsonViewerProps {
    data: unknown
    className?: string
}

function highlightJson(json: string): string {
    // Input is always from JSON.stringify, which produces safe output
    // (no user-controlled HTML). Escaping HTML entities as extra safety.
    const escaped = json
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    // Apply syntax highlighting via regex replacements
    return escaped.replace(
        /("(?:\\.|[^"\\])*")\s*:/g,
        '<span class="text-cyan-400">$1</span>:'
    ).replace(
        /:\s*("(?:\\.|[^"\\])*")/g,
        ': <span class="text-lime-400">$1</span>'
    ).replace(
        /:\s*(\d+\.?\d*)/g,
        ': <span class="text-amber-400">$1</span>'
    ).replace(
        /:\s*(true|false)/g,
        ': <span class="text-violet-400">$1</span>'
    ).replace(
        /:\s*(null)/g,
        ': <span class="text-red-400">$1</span>'
    )
}

export default function JsonViewer({ data, className = "" }: JsonViewerProps) {
    const [copied, setCopied] = useState(false)
    const rawJson = JSON.stringify(data, null, 2)

    const handleCopy = useCallback(() => {
        void navigator.clipboard.writeText(rawJson).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }, [rawJson])

    const highlighted = highlightJson(rawJson)

    return (
        <div className={`relative group rounded-lg overflow-hidden ${className}`}>
            <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 z-10 p-2 rounded-md bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                aria-label="Copy JSON"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-lime-400" />
                ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
            </button>
            <pre className="bg-[#0a0a0c] p-4 overflow-auto max-h-[600px] text-sm leading-relaxed font-mono">
                {/* Safe: input is always JSON.stringify output, HTML-escaped above */}
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
        </div>
    )
}
