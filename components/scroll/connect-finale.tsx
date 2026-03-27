"use client"

import { motion, useInView } from "framer-motion"
import { Github, Linkedin, Mail, Twitter } from "lucide-react"
import { useRef } from "react"

const SOCIAL_LINKS = [
    {
        label: "GitHub",
        href: "https://github.com/sahabji0P",
        handle: "@sahabji0P",
        icon: Github,
    },
    {
        label: "X",
        href: "https://twitter.com/itsshashwatj",
        handle: "@itsshashwatj",
        icon: Twitter,
    },
    {
        label: "LinkedIn",
        href: "https://linkedin.com/in/itsshashwatjain",
        handle: "@itsshashwatjain",
        icon: Linkedin,
    },
]

export function ConnectFinale() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

    return (
        <section id="connect" className="py-24">
            <div ref={sectionRef} className="text-center space-y-10">
                {/* CTA heading */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{
                        duration: 0.6,
                        type: "spring",
                        stiffness: 180,
                        damping: 28,
                    }}
                    className="space-y-4"
                >
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Connect
                    </p>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                        <span className="bg-gradient-to-r from-foreground via-lime-400 to-foreground bg-clip-text text-transparent">
                            Let&apos;s build something
                        </span>
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
                        Always open to discussing products, systems, and ideas worth building.
                    </p>
                </motion.div>

                {/* Email */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{
                        duration: 0.5,
                        delay: 0.15,
                        type: "spring",
                        stiffness: 200,
                        damping: 26,
                    }}
                >
                    <a
                        href="mailto:shashwat@example.com"
                        className="inline-flex items-center gap-2.5 text-base sm:text-lg hover:text-lime-400 transition-colors"
                    >
                        <Mail className="w-5 h-5" />
                        shashwat@example.com
                    </a>
                </motion.div>

                {/* Social links */}
                <div className="flex items-center justify-center gap-4">
                    {SOCIAL_LINKS.map((link, index) => (
                        <motion.a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={
                                isInView
                                    ? { opacity: 1, y: 0, scale: 1 }
                                    : { opacity: 0, y: 20, scale: 0.9 }
                            }
                            transition={{
                                duration: 0.5,
                                delay: 0.25 + index * 0.1,
                                type: "spring",
                                stiffness: 260,
                                damping: 24,
                            }}
                            className="group rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm px-5 py-4 hover:border-lime-400/50 transition-all duration-300 hover:-translate-y-1"
                        >
                            <link.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground group-hover:text-lime-400 transition-colors" />
                            <p className="text-sm font-medium">{link.label}</p>
                            <p className="text-xs text-muted-foreground">
                                {link.handle}
                            </p>
                        </motion.a>
                    ))}
                </div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="text-xs text-muted-foreground pt-8"
                >
                    Made with Next.js + too much coffee
                </motion.p>
            </div>
        </section>
    )
}
