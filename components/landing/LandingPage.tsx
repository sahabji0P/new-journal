"use client"

import { HeroSection } from "@/components/landing/HeroSection"
import { SignalsSection } from "@/components/landing/SignalsSection"
import { WorkSection } from "@/components/landing/WorkSection"
import { ColophonSection } from "@/components/landing/ColophonSection"
import { SideSectionNav } from "@/components/landing/SideSectionNav"

const marqueeItems = [
  "SAATHI Live Guidance",
  "CORE Budget Guardrails",
  "Settlement Closeouts",
  "Recurring Intelligence",
  "Cashflow Forecasting",
  "Smart Categorization",
]

export function LandingPage() {
  return (
    <main className="relative -mb-16 min-h-screen bg-[#08090b] text-zinc-100 md:-mb-0">
      <SideSectionNav />
      <div className="grid-bg fixed inset-0 opacity-30" aria-hidden="true" />
      <div className="landing-noise fixed inset-0 pointer-events-none" />

      <div className="relative z-10">
        <HeroSection />

        <div className="border-y border-zinc-700/70 py-4 md:ml-28 md:py-5">
          <div className="overflow-hidden">
            <div className="landing-marquee-row">
              {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <span key={`${item}-${index}`} className="landing-marquee-item">
                  <span className="landing-marquee-item-text">{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <SignalsSection />
        <WorkSection />
        <ColophonSection />
      </div>
    </main>
  )
}
