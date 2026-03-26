"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import {
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  ChevronRight,
  Sparkles,
  X,
  LogIn
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Insight {
  id: string
  type: string
  title: string
  description: string
  severity: "info" | "warning" | "critical" | "success"
  category?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  isRead: boolean
  createdAt: string
}

interface InsightsPanelProps {
  onAskSaathi?: (question: string) => void
  compact?: boolean
}

export function InsightsPanel({ onAskSaathi, compact = false }: InsightsPanelProps) {
  const { data: session } = useSession()
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const modalOverlayRef = useRef<HTMLDivElement>(null)
  const modalContentRef = useRef<HTMLDivElement>(null)

  // Animate insight cards on mount/change
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = containerRef.current?.querySelectorAll("[data-insight-card]")
      if (cards && cards.length > 0) {
        gsap.from(cards, {
          y: 10,
          autoAlpha: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        })
      }
    })
    return () => mm.revert()
  }, { scope: containerRef, dependencies: [insights, isLoading] })

  // Animate modal open/close
  const animateModalIn = useCallback(() => {
    if (!modalOverlayRef.current || !modalContentRef.current) return
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        modalOverlayRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.2, ease: "power2.out" }
      )
      gsap.fromTo(
        modalContentRef.current,
        { scale: 0.95, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.2, ease: "power2.out" }
      )
    })
    return () => mm.revert()
  }, [])

  const animateModalOut = useCallback((onComplete: () => void) => {
    if (!modalOverlayRef.current || !modalContentRef.current) {
      onComplete()
      return
    }
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(modalContentRef.current, {
        scale: 0.95,
        autoAlpha: 0,
        duration: 0.15,
        ease: "power2.in",
      })
      gsap.to(modalOverlayRef.current, {
        autoAlpha: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete,
      })
    })
    // If reduced motion is preferred, just close immediately
    mm.add("(prefers-reduced-motion: reduce)", () => {
      onComplete()
    })
  }, [])

  useEffect(() => {
    if (selectedInsight) {
      animateModalIn()
    }
  }, [selectedInsight, animateModalIn])

  const closeModal = useCallback(() => {
    animateModalOut(() => setSelectedInsight(null))
  }, [animateModalOut])

  useEffect(() => {
    if (session) {
      loadInsights()
    }
  }, [session])

  const loadInsights = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/insights")
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      }
    } catch (error) {
      console.error("Failed to load insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/insights/generate", { method: "POST" })
      if (res.ok) {
        await loadInsights()
      }
    } catch (error) {
      console.error("Failed to generate insights:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setInsights(prev =>
        prev.map(i => ids.includes(i.id) ? { ...i, isRead: true } : i)
      )
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Lightbulb className="w-5 h-5 text-amber-400" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "bg-green-500/10 border-green-500/20"
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20"
      case "critical":
        return "bg-red-500/10 border-red-500/20"
      default:
        return "bg-amber-500/10 border-amber-500/20"
    }
  }

  const handleAskSaathi = (insight: Insight) => {
    const question = `Tell me more about this insight: "${insight.title}". ${insight.description}`
    if (onAskSaathi) {
      onAskSaathi(question)
    }
    markAsRead([insight.id])
  }

  if (compact) {
    // Compact view for dashboard
    const unreadInsights = insights.filter(i => !i.isRead).slice(0, 3)

    // Show sign-in prompt if not authenticated
    if (!session) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold">Smart Insights</h3>
          </div>
          <div className="text-center py-6">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-orange-400/60" />
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to get AI-powered financial insights
            </p>
            <Button asChild size="sm" className="bg-gradient-to-r from-orange-500 to-amber-400">
              <Link href="/">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div ref={containerRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold">Smart Insights</h3>
            {unreadInsights.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-500 rounded-full">
                {unreadInsights.length} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateInsights}
            disabled={isGenerating}
            className="text-xs"
          >
            {isGenerating ? (
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : unreadInsights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new insights</p>
            <Button
              variant="link"
              size="sm"
              onClick={generateInsights}
              className="text-xs"
            >
              Generate insights
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {unreadInsights.map((insight) => (
              <div
                key={insight.id}
                data-insight-card
                className={`p-3 rounded-lg border ${getSeverityColor(insight.severity)} cursor-pointer hover:scale-[1.02] transition-transform`}
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{insight.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {insight.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Insight Detail Modal */}
        {selectedInsight && (
          <div
            ref={modalOverlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            style={{ visibility: "hidden" }}
            onClick={closeModal}
          >
            <div
              ref={modalContentRef}
              className={`w-full max-w-md bg-background rounded-xl border ${getSeverityColor(selectedInsight.severity)} p-5`}
              style={{ visibility: "hidden" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(selectedInsight.severity)}
                  <div>
                    <p className="font-semibold">{selectedInsight.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {selectedInsight.type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeModal}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {selectedInsight.description}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    markAsRead([selectedInsight.id])
                    closeModal()
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Got it
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400"
                  onClick={() => {
                    handleAskSaathi(selectedInsight)
                    closeModal()
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Ask Saathi
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full view
  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold">Financial Insights</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateInsights}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Generate New Insights
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No insights yet</p>
          <p className="text-sm mt-1">Click &quot;Generate New Insights&quot; to analyze your finances</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              data-insight-card
              className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)} ${
                !insight.isRead ? "ring-2 ring-orange-500/20" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(insight.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{insight.title}</p>
                    {!insight.isRead && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-orange-500 text-black rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead([insight.id])}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark as read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAskSaathi(insight)}
                      className="h-7 text-xs text-orange-500 hover:text-orange-500"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Ask Saathi
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
