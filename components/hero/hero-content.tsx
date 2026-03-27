"use client"

import { MagneticElement } from "@/components/effects/magnetic-element"
import { SplitFlapText } from "@/components/effects/split-flap-text"
import { TypewriterText } from "@/components/effects/typewriter-text"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowUpRight, Github, Linkedin, MapPin, Sparkles, Twitter } from "lucide-react"

interface HeroContentProps {
    reducedMotion?: boolean
    className?: string
}

const socialLinks = [
    { label: "GitHub", href: "https://github.com/sahabji0P", handle: "@sahabji0P", icon: Github },
    { label: "X", href: "https://twitter.com/itsshashwatj", handle: "@itsshashwatj", icon: Twitter },
    { label: "LinkedIn", href: "https://linkedin.com/in/itsshashwatjain", handle: "@itsshashwatjain", icon: Linkedin },
]

export function HeroContent({ reducedMotion: reducedMotionProp, className }: HeroContentProps) {
    const { shouldReduceEffects } = useReducedMotion()
    const reducedMotion = reducedMotionProp ?? shouldReduceEffects
    return (
        <div className={cn("relative z-10 flex min-h-[72vh] items-center py-28 sm:min-h-[76vh] sm:py-32", className)}>
            <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.45, ease: "easeOut" }}
                className="w-full max-w-3xl space-y-8"
            >
                <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Developer Journal</p>
                    <SplitFlapText
                        text="SHASHWAT JAIN"
                        speed={58}
                        cyclesPerChar={4}
                        reducedMotion={reducedMotion}
                        className="text-4xl font-light tracking-[0.08em] sm:text-6xl lg:text-7xl"
                    />
                    <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                        <TypewriterText
                            text="I build thoughtful software systems and document the journey in public."
                            delay={reducedMotion ? 0 : 800}
                            speed={28}
                            reducedMotion={reducedMotion}
                        />
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-lime-400" />
                        Open to collaborations
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-lime-400" />
                        Uttar Pradesh, India
                    </span>
                    <a
                        href="https://drive.google.com/file/d/13tx0V2x1mNvv6-aYam3mdQGuMH78ro3x/view"
                        className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Resume
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                    {socialLinks.map((item, index) => {
                        const Icon = item.icon

                        return (
                            <motion.div
                                key={item.label}
                                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                                animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={
                                    reducedMotion
                                        ? undefined
                                        : { delay: 1.15 + index * 0.1, duration: 0.35, ease: "easeOut" }
                                }
                            >
                                <MagneticElement strength={0.4} radius={110} disabled={reducedMotion}>
                                    <a
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group inline-flex items-center gap-3 rounded-2xl border border-lime-400/15 bg-[oklch(from_var(--card)_l_c_h_/_0.55)] px-4 py-3 text-left backdrop-blur-md transition-colors hover:border-lime-400/35 hover:bg-[oklch(from_var(--card)_l_c_h_/_0.72)]"
                                    >
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/20 bg-lime-400/10 text-lime-400">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="space-y-0.5">
                                            <span className="block text-sm font-medium text-foreground">{item.label}</span>
                                            <span className="block text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
                                                {item.handle}
                                            </span>
                                        </span>
                                    </a>
                                </MagneticElement>
                            </motion.div>
                        )
                    })}
                </div>
            </motion.div>
        </div>
    )
}
