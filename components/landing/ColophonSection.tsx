"use client"

import { useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"

const footerGroups = [
  {
    title: "SAATHI",
    items: ["AI assistant for CORE workflows"],
  },
  {
    title: "Stack",
    items: ["Next.js", "Prisma", "GSAP"],
  },
  {
    title: "Surfaces",
    items: ["Dashboard", "Transactions", "Settlements"],
  },
  {
    title: "Year",
    items: ["2026"],
  },
  {
    title: "Web Landers",
    items: ["Organization behind development"],
  },
]

export function ColophonSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const columns = gridRef.current?.querySelectorAll(":scope > article")
    if (!columns || columns.length === 0) return

    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(columns, {
        y: 26,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      })
    })
  }, { scope: sectionRef })

  return (
    <section
      ref={sectionRef}
      id="colophon"
      className="relative border-t border-zinc-800/60 py-18 pl-6 pr-6 md:pl-28 md:pr-12"
    >
      <div ref={gridRef} className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {footerGroups.map((group) => (
          <article key={group.title} className="space-y-3">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-500">{group.title}</h4>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item} className="font-mono text-xs text-zinc-300/90">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-12 border-t border-zinc-800/40 pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        © 2026 CORE. All rights reserved.
      </p>
    </section>
  )
}
