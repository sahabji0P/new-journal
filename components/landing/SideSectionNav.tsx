"use client"

import { useEffect, useState } from "react"

const navItems = [
  { id: "hero", label: "Index" },
  { id: "signals", label: "Signals" },
  { id: "work", label: "Workspace" },
  { id: "colophon", label: "Footer" },
]

export function SideSectionNav() {
  const [activeSection, setActiveSection] = useState("hero")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.34 },
    )

    navItems.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col justify-center border-r border-zinc-800/70 bg-[#08090b]/80 backdrop-blur-sm md:flex">
      <div className="flex flex-col gap-6 px-4">
        {navItems.map(({ id, label }) => {
          const active = activeSection === id
          return (
            <button key={id} onClick={() => scrollToSection(id)} className="group relative flex items-center gap-3" type="button">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  active ? "bg-orange-500 scale-125" : "bg-zinc-500/40 group-hover:bg-zinc-200/60"
                }`}
              />
              <span
                className={`absolute left-6 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest opacity-0 transition-all duration-200 group-hover:left-8 group-hover:opacity-100 ${
                  active ? "text-orange-400" : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
