"use client"

import type React from "react"
import { gsap, useGSAP } from "@/lib/gsap-init"
import { useMemo, useState, useCallback, useEffect, useRef, createContext, useContext } from "react"
import { Volume2, VolumeX } from "lucide-react"

interface AudioContextType {
  isMuted: boolean
  toggleMute: () => void
  playClick: () => void
}

const SplitFlapAudioContext = createContext<AudioContextType | null>(null)

function useSplitFlapAudio() {
  return useContext(SplitFlapAudioContext)
}

export function SplitFlapAudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass()
      }
    }
    return audioContextRef.current
  }, [])

  const triggerHaptic = useCallback(() => {
    if (isMuted) return
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10)
    }
  }, [isMuted])

  const playClick = useCallback(() => {
    if (isMuted) return

    triggerHaptic()

    try {
      const ctx = getAudioContext()
      if (!ctx) return

      if (ctx.state === "suspended") {
        void ctx.resume()
      }

      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      const lowpass = ctx.createBiquadFilter()

      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.015)

      filter.type = "bandpass"
      filter.frequency.setValueAtTime(1200, ctx.currentTime)
      filter.Q.setValueAtTime(0.8, ctx.currentTime)

      lowpass.type = "lowpass"
      lowpass.frequency.value = 2500
      lowpass.Q.value = 0.5

      gainNode.gain.setValueAtTime(0.05, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(lowpass)
      lowpass.connect(ctx.destination)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.02)
    } catch {
      // Ignore if WebAudio is unavailable
    }
  }, [isMuted, getAudioContext, triggerHaptic])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
    if (isMuted) {
      try {
        const ctx = getAudioContext()
        if (ctx && ctx.state === "suspended") {
          void ctx.resume()
        }
      } catch {
        // Ignore if WebAudio is unavailable
      }
    }
  }, [isMuted, getAudioContext])

  const value = useMemo(() => ({ isMuted, toggleMute, playClick }), [isMuted, toggleMute, playClick])

  return <SplitFlapAudioContext.Provider value={value}>{children}</SplitFlapAudioContext.Provider>
}

export function SplitFlapMuteToggle({ className = "" }: { className?: string }) {
  const audio = useSplitFlapAudio()
  if (!audio) return null

  return (
    <button
      onClick={audio.toggleMute}
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-300 transition-colors duration-200 ${className}`}
      aria-label={audio.isMuted ? "Unmute sound effects" : "Mute sound effects"}
      type="button"
    >
      {audio.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      <span>{audio.isMuted ? "Sound Off" : "Sound On"}</span>
    </button>
  )
}

interface SplitFlapTextProps {
  text: string
  className?: string
  speed?: number
}

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")

function SplitFlapTextInner({ text, className = "", speed = 50 }: SplitFlapTextProps) {
  const chars = useMemo(() => text.split(""), [text])
  const [animationKey, setAnimationKey] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const audio = useSplitFlapAudio()

  const handleMouseEnter = useCallback(() => {
    setAnimationKey((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasInitialized(true)
    }, 1100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`inline-flex gap-[0.06em] items-center cursor-pointer max-w-full overflow-x-auto no-scrollbar ${className}`}
      aria-label={text}
      onMouseEnter={handleMouseEnter}
      style={{ perspective: "1000px" }}
    >
      {chars.map((char, index) => (
        <SplitFlapChar
          key={index}
          char={char.toUpperCase()}
          index={index}
          animationKey={animationKey}
          skipEntrance={hasInitialized}
          speed={speed}
          playClick={audio?.playClick}
        />
      ))}
    </div>
  )
}

export function SplitFlapText(props: SplitFlapTextProps) {
  return <SplitFlapTextInner {...props} />
}

interface SplitFlapCharProps {
  char: string
  index: number
  animationKey: number
  skipEntrance: boolean
  speed: number
  playClick?: () => void
}

function SplitFlapChar({ char, index, animationKey, skipEntrance, speed, playClick }: SplitFlapCharProps) {
  const displayChar = CHARSET.includes(char) ? char : " "
  const isSpace = char === " "
  const [currentChar, setCurrentChar] = useState(skipEntrance ? displayChar : " ")
  const [isSettled, setIsSettled] = useState(skipEntrance)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tileRef = useRef<HTMLDivElement>(null)
  const flipPanelRef = useRef<HTMLDivElement>(null)

  const tileDelay = 0.12 * index

  // Entrance animation for the outer tile
  useGSAP(() => {
    if (isSpace || !tileRef.current) return
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (skipEntrance) {
        gsap.set(tileRef.current, { autoAlpha: 1, y: 0 })
      } else {
        gsap.fromTo(
          tileRef.current,
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, delay: tileDelay, duration: 0.3, ease: "power1.out" }
        )
      }
    })
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(tileRef.current, { autoAlpha: 1, y: 0 })
    })
    return () => mm.revert()
  }, { dependencies: [isSpace, skipEntrance, tileDelay] })

  // 3D flip animation for the flap panel
  useGSAP(() => {
    if (isSpace || !flipPanelRef.current) return
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const flipDelay = skipEntrance ? tileDelay * 0.5 : tileDelay + 0.15
      gsap.fromTo(
        flipPanelRef.current,
        { rotateX: -90 },
        {
          rotateX: 0,
          delay: flipDelay,
          duration: 0.25,
          ease: "power2.out",
        }
      )
    })
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(flipPanelRef.current, { rotateX: 0 })
    })
    return () => mm.revert()
  }, { dependencies: [animationKey, isSettled, isSpace, skipEntrance, tileDelay] })

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (isSpace) {
      setCurrentChar(" ")
      setIsSettled(true)
      return
    }

    setIsSettled(false)
    setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])

    const baseFlips = 8
    const startDelay = skipEntrance ? tileDelay * 360 : tileDelay * 680
    let flipIndex = 0

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        const settleThreshold = baseFlips + index * 3

        if (flipIndex >= settleThreshold) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setCurrentChar(displayChar)
          setIsSettled(true)
          if (playClick) playClick()
          return
        }
        setCurrentChar(CHARSET[Math.floor(Math.random() * CHARSET.length)])
        if (flipIndex % 2 === 0 && playClick) playClick()
        flipIndex++
      }, speed)
    }, startDelay)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [displayChar, isSpace, tileDelay, animationKey, skipEntrance, index, speed, playClick])

  if (isSpace) {
    return (
      <div
        style={{
          width: "0.3em",
          fontSize: "clamp(3.8rem, 14vw, 12rem)",
        }}
      />
    )
  }

  const bgColor = isSettled ? "hsl(0, 0%, 0%)" : "rgba(249, 115, 22, 0.18)"
  const textColor = isSettled ? "#f4f4f5" : "#f97316"

  return (
    <div
      ref={tileRef}
      className="relative overflow-hidden flex items-center justify-center font-mono border-r border-zinc-900"
      style={{
        fontSize: "clamp(3.8rem, 14vw, 12rem)",
        width: "0.62em",
        height: "1.05em",
        backgroundColor: bgColor,
        transformStyle: "preserve-3d",
        transition: "background-color 0.15s ease",
        visibility: skipEntrance ? "visible" : "hidden",
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/30 pointer-events-none z-10" />

      <div className="absolute inset-x-0 top-0 bottom-1/2 flex items-end justify-center overflow-hidden">
        <span className="block translate-y-[0.52em] leading-none transition-colors duration-150" style={{ color: textColor }}>
          {currentChar}
        </span>
      </div>

      <div className="absolute inset-x-0 top-1/2 bottom-0 flex items-start justify-center overflow-hidden">
        <span className="-translate-y-[0.52em] leading-none transition-colors duration-150" style={{ color: textColor }}>
          {currentChar}
        </span>
      </div>

      <div
        ref={flipPanelRef}
        className="absolute inset-x-0 top-0 bottom-1/2 origin-bottom overflow-hidden"
        style={{
          backgroundColor: bgColor,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          transition: "background-color 0.15s ease",
          transform: "rotateX(-90deg)",
        }}
      >
        <div className="flex h-full items-end justify-center">
          <span className="translate-y-[0.52em] leading-none transition-colors duration-150" style={{ color: textColor }}>
            {currentChar}
          </span>
        </div>
      </div>
    </div>
  )
}
