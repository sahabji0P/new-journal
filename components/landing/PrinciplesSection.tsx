"use client"

import { useRef } from "react"
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap-init"
import { HighlightText } from "@/components/landing/HighlightText"

const principles = [
  {
    number: "01",
    titleParts: [
      { text: "CONTROL", highlight: true },
      { text: " BEFORE SCALE", highlight: false },
    ],
    description: "Reduce financial drift before adding complexity. Every number must be explainable.",
    align: "left",
  },
  {
    number: "02",
    titleParts: [
      { text: "SYSTEMS", highlight: true },
      { text: " OVER SHEETS", highlight: false },
    ],
    description: "Build behavior and rules, not disconnected reports that decay over time.",
    align: "right",
  },
  {
    number: "03",
    titleParts: [
      { text: "SIGNAL ", highlight: false },
      { text: "CLARITY", highlight: true },
    ],
    description: "Surface the next best action with confidence, not just more data.",
    align: "left",
  },
  {
    number: "04",
    titleParts: [
      { text: "SECURE ", highlight: false },
      { text: "COLLAB", highlight: true },
    ],
    description: "Share financial workflows with strict controls and transparent accountability.",
    align: "right",
  },
]

export function PrinciplesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const principlesRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(headerRef.current, {
        x: -60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      })

      const articles = principlesRef.current?.querySelectorAll("article")
      articles?.forEach((article, index) => {
        const isRight = principles[index].align === "right"
        gsap.from(article, {
          x: isRight ? 80 : -80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: article,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        })
      })
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} id="principles" className="relative py-32 pl-6 pr-6 md:pl-28 md:pr-12">
      <div ref={headerRef} className="mb-24">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">03 / Methods</span>
        <h2 className="mt-4 text-5xl font-semibold tracking-tight text-zinc-100 md:text-7xl">HOW CORE RUNS</h2>
      </div>

      <div ref={principlesRef} className="space-y-24 md:space-y-32">
        {principles.map((principle) => (
          <article
            key={principle.number}
            className={`flex flex-col ${principle.align === "right" ? "items-end text-right" : "items-start text-left"}`}
          >
            <span className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              {principle.number} / {principle.titleParts[0].text.split(" ")[0]}
            </span>

            <h3 className="text-4xl font-semibold leading-none tracking-tight text-zinc-100 md:text-6xl lg:text-8xl">
              {principle.titleParts.map((part, index) =>
                part.highlight ? (
                  <HighlightText key={index} parallaxSpeed={0.6}>
                    {part.text}
                  </HighlightText>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </h3>

            <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-zinc-500">{principle.description}</p>

            <div className="mt-8 h-[1px] w-24 bg-zinc-800 md:w-48" />
          </article>
        ))}
      </div>
    </section>
  )
}
