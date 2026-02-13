"use client"

import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const signals = [
  {
    date: "2026.02.12",
    title: "Budget Guard",
    note: "Auto-detects overspend paths before monthly close.",
  },
  {
    date: "2026.02.06",
    title: "Settlement Mesh",
    note: "Group balances now resolve with one-click payment actions.",
  },
  {
    date: "2026.01.30",
    title: "Forecast Pulse",
    note: "Runway confidence model tuned for volatile inflow patterns.",
  },
  {
    date: "2026.01.24",
    title: "Ledger Trace",
    note: "Auditable change logs for every transaction mutation.",
  },
  {
    date: "2026.01.10",
    title: "Signal Cards",
    note: "Adaptive insight summaries in the dashboard feed.",
  },
]

export function SignalsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    if (!sectionRef.current || !cursorRef.current) return

    const section = sectionRef.current
    const cursor = cursorRef.current

    const handleMouseMove = (event: MouseEvent) => {
      const rect = section.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      gsap.to(cursor, {
        x,
        y,
        duration: 0.45,
        ease: "power3.out",
      })
    }

    const handleMouseEnter = () => setIsHovering(true)
    const handleMouseLeave = () => setIsHovering(false)

    section.addEventListener("mousemove", handleMouseMove)
    section.addEventListener("mouseenter", handleMouseEnter)
    section.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      section.removeEventListener("mousemove", handleMouseMove)
      section.removeEventListener("mouseenter", handleMouseEnter)
      section.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !cardsRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        },
      )

      const cards = cardsRef.current?.querySelectorAll("article")
      if (cards) {
        gsap.fromTo(
          cards,
          { x: -100, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.18,
            ease: "power3.out",
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="signals" ref={sectionRef} className="relative py-32 pl-6 md:pl-28">
      <div
        ref={cursorRef}
        className={`pointer-events-none absolute left-0 top-0 z-20 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-orange-500/15 transition-opacity duration-300 md:block ${
          isHovering ? "opacity-100" : "opacity-0"
        }`}
      />

      <div ref={headerRef} className="mb-16 pr-6 md:pr-12">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">01 / Signals</span>
        <h2 className="mt-4 text-5xl font-semibold tracking-tight text-zinc-100 md:text-7xl">LIVE FEED</h2>
      </div>

      <div
        ref={cardsRef}
        className="scrollbar-hide flex gap-8 overflow-x-auto pb-8 pr-12"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {signals.map((signal, index) => (
          <article
            key={signal.title}
            className="group relative w-80 flex-shrink-0 transition-transform duration-500 ease-out hover:-translate-y-2"
          >
            <div className="relative border border-zinc-800/70 bg-zinc-950/80 p-8">
              <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

              <div className="mb-8 flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  No. {String(index + 1).padStart(2, "0")}
                </span>
                <time className="font-mono text-[10px] text-zinc-600">{signal.date}</time>
              </div>

              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-zinc-200 transition-colors duration-300 group-hover:text-orange-400">
                {signal.title}
              </h3>

              <div className="mb-6 h-px w-12 bg-orange-500/70 transition-all duration-500 group-hover:w-full" />

              <p className="font-mono text-xs leading-relaxed text-zinc-500">{signal.note}</p>

              <div className="absolute bottom-0 right-0 h-6 w-6 overflow-hidden">
                <div className="absolute bottom-0 right-0 h-8 w-8 translate-x-4 translate-y-4 rotate-45 border-l border-t border-zinc-700/40 bg-black" />
              </div>
            </div>

            <div className="absolute inset-0 -z-10 translate-x-1 translate-y-1 bg-orange-500/8 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </article>
        ))}
      </div>
    </section>
  )
}
