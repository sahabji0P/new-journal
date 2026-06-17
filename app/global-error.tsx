"use client"

import "./globals.css"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">500</h1>
            <p className="text-muted-foreground mb-4">Something went wrong</p>
            <button
              onClick={reset}
              className="text-sm underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
