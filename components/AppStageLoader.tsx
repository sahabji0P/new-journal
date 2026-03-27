"use client"

import { useRef } from "react"
import type { AppLoadingStage } from "@/contexts/AppContext"
import { gsap, useGSAP } from "@/lib/gsap-init"
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
  const currentIndex = stageIndex(stage)
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const rootRef = useRef<HTMLDivElement>(null)
  const progressFillRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!visible) return

    gsap.set(".loader-progress-scan", { xPercent: -120 })
    gsap.fromTo(
      ".loader-shell",
      { autoAlpha: 0, y: 24, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
    )
    gsap.from(
      ".loader-intro",
      { y: 14, autoAlpha: 0, duration: 0.45, stagger: 0.08, ease: "power2.out", delay: 0.1 },
    )
    gsap.from(
      ".loader-stage",
      { x: -28, autoAlpha: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.22 },
    )
    gsap.to(".loader-progress-scan", {
      xPercent: 160,
      duration: 1.8,
      ease: "none",
      repeat: -1,
    })
  }, { scope: rootRef, dependencies: [visible], revertOnUpdate: true })

  useGSAP(() => {
    if (!visible || !progressFillRef.current) return

    gsap.to(progressFillRef.current, {
      width: `${clampedProgress}%`,
      duration: 0.65,
      ease: "power2.out",
    })
  }, { scope: rootRef, dependencies: [clampedProgress, visible] })

  useGSAP(() => {
    if (!visible) return

    gsap.killTweensOf(".loader-active-glow")
    gsap.set(".loader-active-glow", { opacity: 0 })
    gsap.to(".loader-stage-active .loader-active-glow", {
      opacity: 0.25,
      duration: 0.9,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    })
  }, { scope: rootRef, dependencies: [currentIndex, visible], revertOnUpdate: true })

  if (!visible) return null

  return (
    <div ref={rootRef} className="fixed inset-0 z-[120] overflow-hidden bg-[#07080a]/90 backdrop-blur-md">
      <div className="grid-bg absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="landing-noise absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="loader-shell w-full max-w-3xl border border-zinc-700/70 bg-[#090a0c]/95 shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          <div className="border-b border-zinc-700/70 px-6 py-4 md:px-8">
            <p className="loader-intro font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">CORE / INITIALIZING</p>
            <h2 className="loader-intro mt-2 text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">Preparing workspace runtime</h2>
          </div>

          <div className="space-y-8 px-6 py-6 md:px-8 md:py-8">
            <div className="loader-intro space-y-3">
              <div className="loader-intro flex items-center justify-between gap-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">Load Progress</p>
                <p className="font-mono text-sm text-orange-400">{clampedProgress}%</p>
              </div>

              <div className="relative h-2 overflow-hidden border border-zinc-700/70 bg-black/80">
                <div
                  ref={progressFillRef}
                  className="h-full w-0 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300"
                />
                <div className="loader-progress-scan pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              </div>
            </div>

            <div className="grid gap-3">
              {STAGES.map((item, index) => {
                const complete = index < currentIndex
                const active = index === currentIndex
                return (
                  <div
                    key={item.id}
                    className={`loader-stage relative border px-4 py-3 md:px-5 ${
                      active
                        ? "loader-stage-active border-orange-500/70 bg-orange-500/5"
                        : complete
                          ? "border-zinc-700/80 bg-zinc-900/50"
                          : "border-zinc-800/80 bg-zinc-950/70"
                    }`}
                  >
                    <div className="loader-active-glow pointer-events-none absolute inset-0 bg-orange-500/15 opacity-0" />
                    <div
                      className={`absolute left-0 top-0 h-full w-1 ${
                        active ? "bg-orange-500" : complete ? "bg-emerald-500/80" : "bg-zinc-700"
                      }`}
                    />
                    <div className="ml-2 flex items-start gap-3">
                      <div className="mt-0.5">
                        {complete ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : active ? (
                          <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-zinc-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-200">{item.label}</p>
                        <p className="text-sm text-zinc-500">{item.detail}</p>
                      </div>
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
