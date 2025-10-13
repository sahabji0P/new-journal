"use client"

import { motion } from "framer-motion"
import { BookOpen, Briefcase, Home, MessageCircle } from "lucide-react"
import { useTheme } from "next-themes"
import type * as React from "react"

interface MenuItem {
    icon: React.ReactNode
    label: string
    href: string
    gradient: string
    iconColor: string
}

interface MenuBarProps {
    activeSection?: string
}

const menuItems: MenuItem[] = [
    {
        icon: <Home className="w-6 h-6 sm:h-5 sm:w-5" />,
        label: "Home",
        href: "#intro",
        gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
        iconColor: "text-blue-500",
    },
    {
        icon: <Briefcase className="w-6 h-6 sm:h-5 sm:w-5" />,
        label: "Work",
        href: "#work",
        gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
        iconColor: "text-orange-500",
    },
    {
        icon: <Briefcase className="w-6 h-6 sm:h-5 sm:w-5" />,
        label: "Projects",
        href: "#projects",
        gradient: "radial-gradient(circle, rgba(69,235,22,0.15) 0%, rgba(111,88,112,0.06) 50%, rgba(194,65,111,0) 100%)",
        iconColor: "text-orange-500",
    },
    {
        icon: <BookOpen className="w-6 h-6 sm:h-5 sm:w-5" />,
        label: "Thoughts",
        href: "#thoughts",
        gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
        iconColor: "text-green-500",
    },
    {
        icon: <MessageCircle className="w-6 h-6 sm:h-5 sm:w-5" />,
        label: "Connect",
        href: "#connect",
        gradient: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
        iconColor: "text-red-500",
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
            opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
            scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
        },
    },
}

const navGlowVariants = {
    initial: { opacity: 0 },
    hover: {
        opacity: 1,
        transition: {
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1],
        },
    },
}

const sharedTransition = {
    type: "spring",
    stiffness: 100,
    damping: 20,
    duration: 0.5,
}

const mobileIconVariants = {
    inactive: { scale: 1, y: 0 },
    active: {
        scale: 1.15,
        y: -6,
        transition: { type: "spring", stiffness: 400, damping: 17 }
    },
    tap: { scale: 0.9 }
}

export function MenuBar({ activeSection }: MenuBarProps) {
    const { theme } = useTheme()
    const isDarkTheme = theme === "dark"

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        e.preventDefault()
        const element = document.querySelector(href)
        element?.scrollIntoView({ behavior: "smooth" })
    }

    const getActiveClass = (href: string) => {
        const section = href.replace("#", "")
        return activeSection === section
    }

    return (
        <>
            {/* Mobile Bottom Navigation - Fixed at bottom */}
            <div className="block sm:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
                <div className="pointer-events-auto">
                    <div className="mx-auto bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
                        <div className="flex items-end justify-around px-1 pt-2 pb-4 safe-area-inset-bottom">
                            {menuItems.map((item) => {
                                const isActive = getActiveClass(item.href)
                                return (
                                    <motion.a
                                        key={item.label}
                                        href={item.href}
                                        onClick={(e) => handleNavClick(e, item.href)}
                                        className="flex flex-col items-center justify-end gap-1 px-3 py-1 rounded-2xl transition-colors relative flex-1 max-w-[80px] touch-manipulation"
                                        variants={mobileIconVariants}
                                        animate={isActive ? "active" : "inactive"}
                                        whileTap="tap"
                                    >
                                        {/* Active indicator dot */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="mobileActiveIndicator"
                                                className="absolute top-0 w-1.5 h-1.5 rounded-full"
                                                style={{ backgroundColor: item.iconColor.replace('text-', '') === 'blue-500' ? '#3b82f6' : item.iconColor.replace('text-', '') === 'orange-500' ? '#f97316' : item.iconColor.replace('text-', '') === 'green-500' ? '#22c55e' : '#ef4444' }}
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}

                                        {/* Icon with background */}
                                        <div className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isActive
                                            ? 'bg-white/10'
                                            : 'bg-transparent'
                                            }`}>
                                            <span className={`block transition-all duration-300 ${isActive ? item.iconColor : 'text-gray-500'
                                                }`}>
                                                {item.icon}
                                            </span>

                                            {/* Glow effect */}
                                            {isActive && (
                                                <motion.div
                                                    className="absolute inset-0 rounded-2xl blur-lg -z-10 opacity-60"
                                                    style={{ background: item.gradient }}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 0.6 }}
                                                    exit={{ opacity: 0 }}
                                                />
                                            )}
                                        </div>

                                        {/* Label */}
                                        <span className={`text-[11px] font-medium transition-all duration-300 whitespace-nowrap ${isActive
                                            ? 'text-white opacity-100'
                                            : 'text-gray-500 opacity-80'
                                            }`}>
                                            {item.label}
                                        </span>
                                    </motion.a>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Menu Bar - Centered */}
            <div className="hidden sm:flex sm:justify-center sm:w-full">
                <motion.nav
                    className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg relative overflow-hidden w-fit"
                    initial="initial"
                    whileHover="hover"
                >
                    <motion.div
                        className={`absolute -inset-2 bg-gradient-radial from-transparent via-${isDarkTheme ? "blue" : "indigo"}-400/10 to-transparent opacity-0 pointer-events-none`}
                        variants={navGlowVariants}
                    />
                    <ul className="flex items-center gap-1 sm:gap-2 relative z-10">
                        {menuItems.map((item) => (
                            <motion.li key={item.label} className="relative">
                                <motion.div
                                    className="block rounded-lg sm:rounded-xl overflow-visible group relative"
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
                                    <motion.a
                                        href={item.href}
                                        onClick={(e) => handleNavClick(e, item.href)}
                                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 relative z-10 bg-transparent transition-colors rounded-lg sm:rounded-xl ${getActiveClass(item.href)
                                            ? "text-foreground"
                                            : "text-muted-foreground group-hover:text-foreground"
                                            }`}
                                        variants={itemVariants}
                                        transition={sharedTransition}
                                        style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                                    >
                                        <span
                                            className={`transition-colors duration-300 ${getActiveClass(item.href) ? item.iconColor : `group-hover:${item.iconColor}`
                                                }`}
                                        >
                                            {item.icon}
                                        </span>
                                        <span className="hidden md:inline text-sm sm:text-base">{item.label}</span>
                                    </motion.a>
                                    <motion.a
                                        href={item.href}
                                        onClick={(e) => handleNavClick(e, item.href)}
                                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 absolute inset-0 z-10 bg-transparent transition-colors rounded-lg sm:rounded-xl ${getActiveClass(item.href)
                                            ? "text-foreground"
                                            : "text-muted-foreground group-hover:text-foreground"
                                            }`}
                                        variants={backVariants}
                                        transition={sharedTransition}
                                        style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
                                    >
                                        <span
                                            className={`transition-colors duration-300 ${getActiveClass(item.href) ? item.iconColor : `group-hover:${item.iconColor}`
                                                }`}
                                        >
                                            {item.icon}
                                        </span>
                                        <span className="hidden md:inline text-sm sm:text-base">{item.label}</span>
                                    </motion.a>
                                </motion.div>
                            </motion.li>
                        ))}
                    </ul>
                </motion.nav>
            </div>
        </>
    )
}