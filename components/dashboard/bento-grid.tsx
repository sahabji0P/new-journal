"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MetricCard } from "./metric-card"
import { useCountUp } from "@/lib/hooks/use-count-up"

interface SkillCategory {
  name: string
  count: number
}

interface MetricsData {
  content: {
    projects: number
    experiences: number
    publications: number
    thoughts: number
    totalWords: number
  }
  skills: {
    total: number
    topCategories: SkillCategory[]
  }
  api: {
    status: string
    responseTime: number
    endpoints: number
  }
  github: {
    username: string
    profileUrl: string
  }
}

// --- Animated stat number ---
function StatNumber({ value, delay }: { value: number; delay?: number }) {
  const animated = useCountUp(value, { delay })
  return <span>{animated.toLocaleString()}</span>
}

// --- Shimmer skeleton ---
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`bg-card/20 border border-border/30 rounded-xl p-5 animate-pulse ${className ?? ""}`}
    />
  )
}

// --- Stats 2x2 grid ---
function StatsCard({ data, loaded }: { data: MetricsData | null; loaded: boolean }) {
  const stats = loaded && data
    ? [
        { label: "Projects", value: data.content.projects },
        { label: "Experiences", value: data.content.experiences },
        { label: "Publications", value: data.content.publications },
        { label: "Thoughts", value: data.content.thoughts },
      ]
    : [
        { label: "Projects", value: 0 },
        { label: "Experiences", value: 0 },
        { label: "Publications", value: 0 },
        { label: "Thoughts", value: 0 },
      ]

  return (
    <MetricCard title="Content Overview" delay={0}>
      <div className="grid grid-cols-2 gap-4 flex-1">
        {stats.map(({ label, value }, i) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-3xl font-light text-foreground tabular-nums">
              <StatNumber value={value} delay={i * 120} />
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}

// --- Skills horizontal bars ---
function SkillsCard({ data, loaded }: { data: MetricsData | null; loaded: boolean }) {
  const categories = loaded && data ? data.skills.topCategories : []
  const maxCount = categories.reduce((m, c) => Math.max(m, c.count), 1)

  return (
    <MetricCard title="Skill Distribution" delay={0.1}>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {loaded && categories.length > 0 ? (
          categories.slice(0, 5).map(({ name, count }, i) => {
            const pct = Math.round((count / maxCount) * 100)
            return (
              <div key={name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground/80">{name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-lime-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col gap-3">
            {[80, 60, 45].map((w, i) => (
              <div key={i} className="h-4 rounded bg-border/30 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {loaded && data && (
          <p className="text-xs text-muted-foreground mt-1">
            {data.skills.total} unique technologies
          </p>
        )}
      </div>
    </MetricCard>
  )
}

// --- API health ---
function ApiCard({ data, loaded }: { data: MetricsData | null; loaded: boolean }) {
  return (
    <MetricCard title="API Health" delay={0.2}>
      <div className="flex flex-col gap-3 flex-1 justify-center">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lime-400" />
          </span>
          <span className="text-sm font-medium text-foreground">
            {loaded && data ? data.api.status.charAt(0).toUpperCase() + data.api.status.slice(1) : "Checking…"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Response time</span>
            <span className="text-foreground tabular-nums">
              {loaded && data ? `${data.api.responseTime}ms` : "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Endpoints</span>
            <span className="text-foreground tabular-nums">
              {loaded && data ? `${data.api.endpoints} active` : "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">GitHub</span>
            {loaded && data ? (
              <a
                href={data.github.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime-400 hover:text-lime-300 transition-colors"
              >
                @{data.github.username}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </MetricCard>
  )
}

// --- Words written ---
function WordsCard({ data, loaded }: { data: MetricsData | null; loaded: boolean }) {
  const words = loaded && data ? data.content.totalWords : 0

  return (
    <MetricCard title="Words Written" delay={0.3}>
      <div className="flex flex-col gap-1 flex-1 justify-center">
        <span className="text-4xl font-light text-foreground tabular-nums">
          <StatNumber value={words} delay={200} />
        </span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          words across all content
        </span>
        {loaded && data && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {data.content.thoughts} posts · {data.content.projects} projects · {data.content.publications} papers
          </p>
        )}
      </div>
    </MetricCard>
  )
}

// --- Tech timeline SVG ---
const TECH_TIMELINE = [
  { year: "2020", label: "Python · ML" },
  { year: "2021", label: "React · Node" },
  { year: "2022", label: "PyTorch · NLP" },
  { year: "2023", label: "Next.js · LLMs" },
  { year: "2024", label: "Agents · RAG" },
  { year: "2025", label: "Rust · Edge" },
]

function TechTimelineCard() {
  return (
    <MetricCard title="Tech Timeline" delay={0.4} className="col-span-full md:col-span-2">
      <div className="flex-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${TECH_TIMELINE.length * 120} 80`}
          className="w-full min-w-[400px]"
          aria-label="Tech learning timeline"
        >
          {/* Horizontal line */}
          <line
            x1="30"
            y1="40"
            x2={TECH_TIMELINE.length * 120 - 30}
            y2="40"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
          />

          {TECH_TIMELINE.map(({ year, label }, i) => {
            const cx = 30 + i * 120
            return (
              <g key={year}>
                {/* Dot */}
                <circle cx={cx} cy={40} r={5} fill="#a3e635" />
                {/* Year above */}
                <text
                  x={cx}
                  y={26}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  className="fill-foreground"
                  fontWeight="500"
                >
                  {year}
                </text>
                {/* Tech label below */}
                <text
                  x={cx}
                  y={60}
                  textAnchor="middle"
                  fontSize="9"
                  className="fill-muted-foreground"
                  fill="hsl(var(--muted-foreground))"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </MetricCard>
  )
}

// --- Main bento grid ---
export function BentoGrid() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/v1/metrics")
      .then((res) => res.json())
      .then((json) => {
        setData(json.data as MetricsData)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true) // show zeros on error rather than infinite loading
      })
  }, [])

  if (!loaded) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
        <SkeletonCard className="md:col-span-2 h-48" />
        <SkeletonCard className="md:col-span-2 h-48" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="md:col-span-2 h-40" />
      </div>
    )
  }

  return (
    <div
      className="grid gap-4 w-full"
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateAreas: `
          "stats   stats   skills  skills"
          "api     words   tech    tech"
        `,
      }}
    >
      {/* Stats — top left 2 cols */}
      <div style={{ gridArea: "stats" }}>
        <StatsCard data={data} loaded={loaded} />
      </div>

      {/* Skills — top right 2 cols */}
      <div style={{ gridArea: "skills" }}>
        <SkillsCard data={data} loaded={loaded} />
      </div>

      {/* API health */}
      <div style={{ gridArea: "api" }}>
        <ApiCard data={data} loaded={loaded} />
      </div>

      {/* Words */}
      <div style={{ gridArea: "words" }}>
        <WordsCard data={data} loaded={loaded} />
      </div>

      {/* Tech timeline — bottom right 2 cols */}
      <div style={{ gridArea: "tech" }}>
        <TechTimelineCard />
      </div>
    </div>
  )
}

// Mobile-friendly responsive wrapper
export function ResponsiveBentoGrid() {
  return (
    <>
      {/* Desktop: named grid areas */}
      <div className="hidden md:block">
        <BentoGrid />
      </div>

      {/* Mobile: single column stack */}
      <div className="flex flex-col gap-4 md:hidden">
        <MobileBentoGrid />
      </div>
    </>
  )
}

function MobileBentoGrid() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/v1/metrics")
      .then((res) => res.json())
      .then((json) => {
        setData(json.data as MetricsData)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  return (
    <>
      <StatsCard data={data} loaded={loaded} />
      <SkillsCard data={data} loaded={loaded} />
      <ApiCard data={data} loaded={loaded} />
      <WordsCard data={data} loaded={loaded} />
      <TechTimelineCard />
    </>
  )
}
