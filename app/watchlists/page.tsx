import { WatchlistsManagement } from "@/components/watchlists/WatchlistsManagement"

export default function WatchlistsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-mono">Watchlists</h2>
        <p className="text-muted-foreground font-mono text-sm">
          Track spending by category, tag, or payee with custom limits and alerts
        </p>
      </div>
      <WatchlistsManagement />
    </div>
  )
}
