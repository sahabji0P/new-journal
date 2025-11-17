"use client"

import type { FormEvent } from "react";
import { useState } from "react";

export default function IngestForm() {
    const [url, setUrl] = useState("");
    const [response, setResponse] = useState({ message: "", url_id: "", job_id: "", status: "", error: "" })

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // handled by server action
        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ url }),
            })

            const data = await res.json()
            setResponse({ message: data.message || "", url_id: data.url_id || "", job_id: data.job_id || "", status: data.status || "", error: data.error || "" })
        } catch (error) {
            setResponse({ message: "Failed to submit URL", url_id: "", job_id: "", status: "", error: "Failed to submit URL" })
        }
    }


    const handleStatus = async () => {
    }

    return (
        <main className="max-w-4xl mx-auto px-8 lg:px-16 py-24">
            <header className="mb-10">
                <div className="text-sm text-muted-foreground font-mono">TOOLS</div>
                <h1 className="text-3xl sm:text-4xl font-light mt-2">Ingest URL</h1>
                <p className="mt-3 text-muted-foreground max-w-2xl">Submit a URL to enqueue it for processing and view the response below.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="url" className="text-sm text-muted-foreground">Enter a URL</label>
                    <input
                        id="url"
                        name="url"
                        type="url"
                        placeholder="https://example.com/article"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                    >
                        Submit
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 rounded-lg bg-lime-500 border border-border hover:border-muted-foreground/50 text-primary-foreground"
                        onClick={handleStatus}
                    >
                        Get Status
                    </button>
                    <button
                        type="button"
                        className="px-4 py-2 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                        onClick={() => setResponse({ message: "", url_id: "", job_id: "", status: "", error: "" })}
                    >
                        Clear
                    </button>
                </div>
            </form>

            {response.message && (
                <div className="mt-8 p-6 border border-border rounded-xl bg-card">
                    <div className="text-xs text-muted-foreground mb-3">Response</div>

                    <pre className="text-sm whitespace-pre-wrap break-words">
                        {`{
    "message": "${response.message}",
    "url_id": "${response.url_id}",
    "job_id": "${response.job_id}",
    "status": "${response.status}"
}`}
                    </pre>
                </div>
            )}

        </main>
    )
}

