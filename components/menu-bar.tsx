"use client"

import { motion } from "framer-motion"
import {
  ArrowRightLeft,
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
    iconColor: "text-blue-500",
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
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    href: "/settings",
    gradient:
      "radial-gradient(circle, rgba(107,114,128,0.15) 0%, rgba(75,85,99,0.06) 50%, rgba(55,65,81,0) 100%)",
    iconColor: "text-gray-500",
  },
]

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
      scale: { duration: 0.5, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
}

const sharedTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.5,
}

export function MenuBar() {
  const { theme } = useTheme()

  const isDarkTheme = theme === "dark"

  return (
    <motion.nav
      className="p-3 rounded-3xl bg-gradient-to-b from-background/90 to-background/60 backdrop-blur-lg border border-border/50 shadow-2xl overflow-hidden max-w-fit fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      initial="initial"
      whileHover="hover"
    >
      <motion.div
        className={`absolute -inset-3 bg-gradient-radial from-transparent ${isDarkTheme
          ? "via-amber-400/20 via-15% via-blue-400/20 via-30% via-green-400/20 via-45% via-purple-400/20 via-60% via-pink-400/20 via-75% via-red-400/20 via-90%"
          : "via-amber-400/15 via-15% via-blue-400/15 via-30% via-green-400/15 via-45% via-purple-400/15 via-60% via-pink-400/15 via-75% via-red-400/15 via-90%"
          } to-transparent rounded-3xl z-0 pointer-events-none`}
        variants={navGlowVariants}
      />
      <ul className="flex items-center gap-1 relative z-10 flex-wrap justify-center">
        {menuItems.map((item) => (
          <motion.li key={item.label} className="relative">
            <motion.div
              className="block rounded-xl overflow-visible group relative"
              style={{ perspective: "600px" }}
              whileHover="hover"
              initial="initial"
            >
              <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                variants={glowVariants}
                style={{
                  background: item.gradient,
                  opacity: 0,
                  borderRadius: "16px",
                }}
              />
              <Link href={item.href} passHref className="block">
                <motion.div
                  className="flex items-center gap-2 px-3 py-2 relative z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl text-sm font-medium cursor-pointer"
                  variants={itemVariants}
                  transition={sharedTransition}
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
                </motion.div>
              </Link>
              <Link href={item.href} passHref className="block absolute inset-0">
                <motion.div
                  className="flex items-center gap-2 px-3 py-2 z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl text-sm font-medium cursor-pointer"
                  variants={backVariants}
                  transition={sharedTransition}
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center top",
                    rotateX: 90,
                  }}
                >
                  <span
                    className={`transition-colors duration-300 group-hover:${item.iconColor} text-foreground`}
                  >
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline-block">{item.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  )
}
