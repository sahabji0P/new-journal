"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { signIn } from "next-auth/react"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { ScrambleTextOnHover } from "@/components/landing/ScrambleText"

gsap.registerPlugin(ScrollTrigger)

const outcomes = [
  {
    title: "Clarity",
    description: "Every account, transaction, and settlement appears in one operating surface.",
  },
  {
    title: "Velocity",
    description: "SAATHI reduces time-to-decision by turning data into direct actions.",
  },
  {
    title: "Control",
    description: "Budgets, reminders, and audit trails keep teams aligned and accountable.",
  },
]

export function OutcomeSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      const targets = contentRef.current?.querySelectorAll(".outcome-animate")
      if (!targets || targets.length === 0) return

      gsap.from(targets, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 86%",
          toggleActions: "play none none reverse",
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const handleEnterCore = async () => {
    if (isSigningIn) return
    setIsSigningIn(true)
    try {
      const result = await signIn("google", { callbackUrl: "/dashboard", redirect: false })
      if (result?.url) {
        window.location.href = result.url
        return
      }
      setIsSigningIn(false)
    } catch {
      setIsSigningIn(false)
    }
  }

  return (
    <section ref={sectionRef} id="outcomes" className="relative border-t border-zinc-800/60 py-24 pl-6 pr-6 md:pl-28 md:pr-12">
      <div ref={contentRef} className="space-y-10">
        <div className="outcome-animate">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">03 / Outcome</span>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-100 md:text-6xl">
            THE CORE INTERFACE MAKES FINANCE OPERATIONAL, NOT REACTIVE.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {outcomes.map((item) => (
            <article key={item.title} className="outcome-animate border border-zinc-800/70 bg-zinc-950/70 p-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-200">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">{item.description}</p>
            </article>
          ))}
        </div>

        <div className="outcome-animate border border-orange-500/40 bg-orange-500/5 p-6 md:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-300">
            Ready to run your finance workflow in one place?
          </p>
          <button
            type="button"
            onClick={handleEnterCore}
            disabled={isSigningIn}
            className="mt-5 inline-flex items-center gap-3 border border-zinc-700 px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-zinc-100 transition-all duration-200 hover:border-orange-500 hover:text-orange-400"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <ScrambleTextOnHover text="Enter CORE Interface" as="span" duration={0.55} />
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
