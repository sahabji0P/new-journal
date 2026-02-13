"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowUpRight } from "lucide-react"
import { AnimatedNoise } from "@/components/landing/AnimatedNoise"
import { ScrambleTextOnHover } from "@/components/landing/ScrambleText"
import {
  SplitFlapText,
  SplitFlapMuteToggle,
  SplitFlapAudioProvider,
} from "@/components/landing/SplitFlapText"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -84,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative flex min-h-screen items-center overflow-hidden px-6 pb-12 pt-28 md:pl-28 md:pr-12"
    >
      <AnimatedNoise opacity={0.03} />

      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 md:block">
        <span className="block origin-left -rotate-90 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
          CORE
        </span>
      </div>

      <div ref={contentRef} className="flex w-full flex-1 flex-col lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-4xl">
          <SplitFlapAudioProvider>
            <div className="relative">
              <SplitFlapText text="CORE" speed={80} />
              <div className="mt-4">
                <SplitFlapMuteToggle />
              </div>
            </div>
          </SplitFlapAudioProvider>

          <h2 className="mt-5 text-[clamp(1rem,3vw,2rem)] font-medium tracking-wide text-zinc-300">
            Studies in Operational Finance Control
          </h2>

          <p className="mt-10 max-w-2xl font-mono text-sm leading-relaxed text-zinc-300 md:text-[15px]">
            CORE designs money systems that behave, not dashboards that just display. SAATHI assists with insight-driven actions where teams need precision.
          </p>

          <div className="mt-16 flex flex-wrap items-center gap-8">
            <Link
              href="/auth/signin?callbackUrl=/dashboard"
              className="group inline-flex items-center gap-3 border border-zinc-700 px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-zinc-200 transition-all duration-200 hover:border-orange-500 hover:text-orange-400"
            >
              <ScrambleTextOnHover text="View Workspace" as="span" duration={0.6} />
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-6 md:bottom-12 md:right-12">
        <div className="border border-zinc-800 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          v.01 / CORE BUILD
        </div>
      </div>
    </section>
  )
}
