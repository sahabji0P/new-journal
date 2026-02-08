"use client"

import type { AppLoadingStage } from "@/contexts/AppContext"
import { CheckCircle2, Loader2 } from "lucide-react"

type AppStageLoaderProps = {
  visible: boolean
  stage: AppLoadingStage
  progress: number
}

const STAGES: Array<{ id: Exclude<AppLoadingStage, "ready">; label: string; detail: string }> = [
  {
    id: "preparing",
    label: "Preparing your dashboard",
    detail: "Setting up your workspace and preferences.",
  },
  {
    id: "syncing",
    label: "Syncing accounts",
    detail: "Fetching accounts, transactions, and balances.",
  },
  {
    id: "organizing",
    label: "Organizing dashboard",
    detail: "Loading goals, reminders, and advanced insights.",
  },
]

function stageIndex(stage: AppLoadingStage): number {
  if (stage === "ready") return STAGES.length
  return STAGES.findIndex(item => item.id === stage)
}

export function AppStageLoader({ visible, stage, progress }: AppStageLoaderProps) {
  if (!visible) return null

  const currentIndex = stageIndex(stage)
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="fixed inset-0 z-[120] bg-background/85 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border bg-card shadow-xl">
          <div className="space-y-5 p-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Please wait</p>
              <h2 className="text-xl font-semibold">Setting up your money workspace</h2>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{clampedProgress}% completed</p>

            <div className="space-y-3">
              {STAGES.map((item, index) => {
                const complete = index < currentIndex
                const active = index === currentIndex
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      active ? "border-primary/50 bg-primary/5" : "border-border/70"
                    }`}
                  >
                    <div className="mt-0.5">
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
