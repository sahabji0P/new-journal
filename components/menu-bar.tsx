"use client"

import { useRef } from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import {
  ArrowRightLeft,
  BarChart3,
  Landmark,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import type * as React from "react"

interface MenuItem {
  icon: React.ReactNode
  label: string
  href: string
  gradient: string
  iconColor: string
}

const menuItems: MenuItem[] = [
  {
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: "Dashboard",
    href: "/dashboard",
    gradient:
      "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
    iconColor: "text-green-500",
  },
  {
    icon: <ArrowRightLeft className="h-5 w-5" />,
    label: "Transactions",
    href: "/transactions",
    gradient:
      "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-amber-400",
  },

  {
    icon: <Landmark className="h-5 w-5" />,
    label: "Budget",
    href: "/budget",
    gradient:
      "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.06) 50%, rgba(180, 83, 9, 0) 100%)",
    iconColor: "text-amber-500",
  },

  {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Analytics",
    href: "/analytics",
    gradient:
      "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.06) 50%, rgba(109, 40, 217, 0) 100%)",
    iconColor: "text-orange-400",
  },

  {
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    href: "/settings",
    gradient:
      "radial-gradient(circle, rgba(107,114,128,0.15) 0%, rgba(75,85,99,0.06) 50%, rgba(55,65,81,0) 100%)",
    iconColor: "text-gray-500",
  },
]

export function MenuBar() {
  const { theme } = useTheme()
  const navRef = useRef<HTMLElement>(null)

  const isDarkTheme = theme === "dark"

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const nav = navRef.current
      if (!nav) return

      const navGlow = nav.querySelector("[data-nav-glow]") as HTMLElement | null
      const items = nav.querySelectorAll("[data-menu-item]")

      // Nav-level glow on hover
      if (navGlow) {
        nav.addEventListener("mouseenter", () => {
          gsap.to(navGlow, { autoAlpha: 1, duration: 0.5, ease: "power2.out" })
        })
        nav.addEventListener("mouseleave", () => {
          gsap.to(navGlow, { autoAlpha: 0, duration: 0.5, ease: "power2.out" })
        })
      }

      // Per-item 3D flip + glow on hover
      items.forEach((item) => {
        const front = item.querySelector("[data-item-front]") as HTMLElement | null
        const back = item.querySelector("[data-item-back]") as HTMLElement | null
        const glow = item.querySelector("[data-item-glow]") as HTMLElement | null

        if (!front || !back) return

        item.addEventListener("mouseenter", () => {
          // Front face flips away
          gsap.to(front, {
            rotateX: -90,
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.out",
          })
          // Back face flips in
          gsap.to(back, {
            rotateX: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
          })
          // Glow appears
          if (glow) {
            gsap.to(glow, {
              autoAlpha: 1,
              scale: 2,
              duration: 0.5,
              ease: "power2.out",
            })
          }
        })

        item.addEventListener("mouseleave", () => {
          // Front face returns
          gsap.to(front, {
            rotateX: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
          })
          // Back face flips away
          gsap.to(back, {
            rotateX: 90,
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.out",
          })
          // Glow disappears
          if (glow) {
            gsap.to(glow, {
              autoAlpha: 0,
              scale: 0.8,
              duration: 0.5,
              ease: "power2.out",
            })
          }
        })
      })
    })
    return () => mm.revert()
  }, { scope: navRef })

  return (
    <nav
      ref={navRef}
      className="p-3 rounded-3xl bg-gradient-to-b from-background/90 to-background/60 backdrop-blur-lg border border-border/50 shadow-2xl overflow-hidden max-w-fit fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        data-nav-glow
        className={`absolute -inset-3 bg-gradient-radial from-transparent ${isDarkTheme
          ? "via-amber-400/20 via-15% via-amber-400/20 via-30% via-green-400/20 via-45% via-orange-400/20 via-60% via-pink-400/20 via-75% via-red-400/20 via-90%"
          : "via-amber-400/15 via-15% via-amber-400/15 via-30% via-green-400/15 via-45% via-orange-400/15 via-60% via-pink-400/15 via-75% via-red-400/15 via-90%"
          } to-transparent rounded-3xl z-0 pointer-events-none`}
        style={{ visibility: "hidden" }}
      />
      <ul className="flex items-center gap-1 relative z-10 flex-wrap justify-center">
        {menuItems.map((item) => (
          <li key={item.label} className="relative">
            <div
              data-menu-item
              className="block rounded-xl overflow-visible group relative"
              style={{ perspective: "600px" }}
            >
              <div
                data-item-glow
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                  background: item.gradient,
                  opacity: 0,
                  visibility: "hidden",
                  borderRadius: "16px",
                  transform: "scale(0.8)",
                }}
              />
              <Link href={item.href} passHref className="block">
                <div
                  data-item-front
                  className="flex items-center gap-2 px-3 py-2 relative z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl text-sm font-medium cursor-pointer"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center bottom",
                  }}
                >
                  <span
                    className={`transition-colors duration-300 group-hover:${item.iconColor} text-foreground`}
                  >
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline-block">{item.label}</span>
                </div>
              </Link>
              <Link href={item.href} passHref className="block absolute inset-0">
                <div
                  data-item-back
                  className="flex items-center gap-2 px-3 py-2 z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl text-sm font-medium cursor-pointer"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center top",
                    transform: "rotateX(90deg)",
                    visibility: "hidden",
                  }}
                >
                  <span
                    className={`transition-colors duration-300 group-hover:${item.iconColor} text-foreground`}
                  >
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline-block">{item.label}</span>
                </div>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  )
}
