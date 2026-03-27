"use client"

import { useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { Sparkles, ArrowRight, CheckCircle, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Suggestion {
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  amount: number
}

interface GroupSuggestionsCardProps {
  suggestions: Suggestion[]
  currentUserId: string
  formatCurrency: (n: number) => string
  onSettleUp: (suggestion: Suggestion) => void
  onRemind: (suggestion: { fromUserId: string; amount: number }) => void
  onResolve?: (suggestion: Suggestion) => void
}

export function GroupSuggestionsCard({
  suggestions,
  currentUserId,
  formatCurrency,
  onSettleUp,
  onRemind,
  onResolve,
}: GroupSuggestionsCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-suggestion-item]",
        { y: 8, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.2, stagger: 0.03, ease: "power2.out" }
      )
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="rounded-lg border p-2.5 sm:p-3">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        <Sparkles className="h-4 w-4 shrink-0" />
        Suggested Settlements
      </div>

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Everyone is settled up.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {suggestions.map((s) => (
            <div
              key={`${s.fromUserId}-${s.toUserId}`}
              data-suggestion-item
              className="rounded-md border px-2.5 sm:px-3 py-2 space-y-2"
            >
              {/* Top row: names + amount */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-sm font-medium min-w-0">
                  <span className="truncate max-w-[5rem] sm:max-w-none">{s.fromUserName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[5rem] sm:max-w-none">{s.toUserName}</span>
                </div>
                <span className="font-semibold shrink-0 whitespace-nowrap">
                  {formatCurrency(s.amount)}
                </span>
              </div>

              {/* Bottom row: action buttons */}
              {(currentUserId === s.fromUserId || currentUserId === s.toUserId) && (
                <div className="flex items-center gap-1.5">
                  {currentUserId === s.fromUserId && (
                    <Button size="sm" className="h-7 text-xs flex-1 sm:flex-none" onClick={() => onSettleUp(s)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                      Settle Up
                    </Button>
                  )}

                  {currentUserId === s.toUserId && (
                    <>
                      {onResolve && (
                        <Button
                          size="sm"
                          className="h-7 text-xs flex-1 sm:flex-none"
                          onClick={() => onResolve(s)}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1 sm:flex-none"
                        onClick={() =>
                          onRemind({ fromUserId: s.fromUserId, amount: s.amount })
                        }
                      >
                        <BellRing className="h-3.5 w-3.5 mr-1 shrink-0" />
                        Remind
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
