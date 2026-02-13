"use client"

import { useState, useRef, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const experiments = [
  {
    title: "Capture",
    medium: "Accounts + Transactions",
    description: "All spend and inflow enters one source of truth with category-level clarity.",
    span: "col-span-1 sm:col-span-2 sm:row-span-2",
  },
  {
    title: "Organize",
    medium: "Budgets + Categories",
    description: "Budget guardrails align spend to intent, not just to historical totals.",
    span: "col-span-1 row-span-1",
  },
  {
    title: "Coordinate",
    medium: "Settlements + Groups",
    description: "Shared balances, reminders, and closeouts happen in the same operational loop.",
    span: "col-span-1 sm:row-span-2",
  },
  {
    title: "Interpret",
    medium: "Signals + Insights",
    description: "SAATHI explains anomalies, trends, and action priorities in plain language.",
    span: "col-span-1 row-span-1",
  },
  {
    title: "Automate",
    medium: "Recurring Logic",
    description: "Predictable recurring workflows reduce manual tracking and missed events.",
    span: "col-span-1 sm:col-span-2 sm:row-span-1",
  },
  {
    title: "Control",
    medium: "Audit + Safety",
    description: "Every important movement is visible, attributable, and designed for confident decisions.",
    span: "col-span-1 row-span-1",
  },
]

export function WorkSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headerRef.current || !gridRef.current) return

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
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        },
      )

      const cards = gridRef.current?.querySelectorAll("article")
      if (cards && cards.length > 0) {
        gsap.set(cards, { y: 60, opacity: 0 })
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="work" className="relative py-32 pl-6 pr-6 md:pl-28 md:pr-12">
      <div ref={headerRef} className="mb-16 flex items-end justify-between">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">02 / System</span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-100 md:text-6xl">HOW CORE WORKS</h2>
        </div>
        <p className="hidden max-w-xs text-right font-mono text-xs leading-relaxed text-zinc-500 md:block">
          A single operating model from capture to control, with SAATHI assisting across each stage.
        </p>
      </div>

      <div
        ref={gridRef}
        className="grid auto-rows-[170px] grid-cols-1 gap-4 sm:auto-rows-[180px] sm:grid-cols-2 md:auto-rows-[200px] md:grid-cols-4 md:gap-6"
      >
        {experiments.map((experiment, index) => (
          <WorkCard key={experiment.title} experiment={experiment} index={index} persistHover={index === 0} />
        ))}
      </div>
    </section>
  )
}

function WorkCard({
  experiment,
  index,
  persistHover = false,
}: {
  experiment: {
    title: string
    medium: string
    description: string
    span: string
  }
  index: number
  persistHover?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const [isScrollActive, setIsScrollActive] = useState(false)

  useEffect(() => {
    if (!persistHover || !cardRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: "top 80%",
        onEnter: () => setIsScrollActive(true),
      })
    }, cardRef)

    return () => ctx.revert()
  }, [persistHover])

  const isActive = isHovered || isScrollActive

  return (
    <article
      ref={cardRef}
      className={`group relative flex flex-col justify-between overflow-hidden border border-zinc-800/70 p-5 transition-all duration-500 cursor-pointer ${experiment.span} ${
        isActive ? "border-orange-500/60" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute inset-0 bg-orange-500/6 transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-0"}`} />

      <div className="relative z-10">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{experiment.medium}</span>
        <h3 className={`mt-3 text-2xl font-semibold tracking-tight transition-colors duration-300 md:text-4xl ${isActive ? "text-orange-400" : "text-zinc-100"}`}>
          {experiment.title}
        </h3>
      </div>

      <div className="relative z-10">
        <p
          className={`max-w-[280px] font-mono text-xs leading-relaxed text-zinc-400 transition-all duration-500 ${
            isActive ? "md:translate-y-0 md:opacity-100" : "md:translate-y-2 md:opacity-0"
          }`}
        >
          {experiment.description}
        </p>
      </div>

      <span className={`absolute bottom-4 right-4 font-mono text-[10px] transition-colors duration-300 ${isActive ? "text-orange-400" : "text-zinc-600"}`}>
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className={`absolute right-0 top-0 h-12 w-12 transition-all duration-500 ${isActive ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute right-0 top-0 h-[1px] w-full bg-orange-500" />
        <div className="absolute right-0 top-0 h-full w-[1px] bg-orange-500" />
      </div>
    </article>
  )
}
