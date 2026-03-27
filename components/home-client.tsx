"use client"

import { BentoGrid } from "@/components/dashboard/bento-grid"
import { SectionArt } from "@/components/generative/section-art"
import { HeroContent } from "@/components/hero/hero-content"
import { ParticleHero } from "@/components/hero/particle-hero"
import { ConnectFinale } from "@/components/scroll/connect-finale"
import { EditorialNotes } from "@/components/scroll/editorial-notes"
import { HorizontalJourney } from "@/components/scroll/horizontal-journey"
import { ScrollNarrative } from "@/components/scroll/scroll-narrative"
import { StaggeredBuilds } from "@/components/scroll/staggered-builds"
import { StickyNowSection } from "@/components/scroll/sticky-now-section"
import type { HomeJournalData } from "@/lib/journal-feed"
import { HOME_SECTION_ITEMS, useNavPageConfig } from "@/lib/nav-context"

interface HomeClientProps {
    data: HomeJournalData
}

export default function HomeClient({ data }: HomeClientProps) {
    useNavPageConfig({
        navItems: HOME_SECTION_ITEMS,
        showTOC: true,
        manualSections: [
            { id: "intro", title: "Intro", level: 2 },
            { id: "now", title: "Now", level: 2 },
            { id: "journey", title: "Journey", level: 2 },
            { id: "builds", title: "Selected Builds", level: 2 },
            { id: "dashboard", title: "By the Numbers", level: 2 },
            { id: "notes", title: "Journal Notes", level: 2 },
            { id: "connect", title: "Connect", level: 2 },
        ],
        pageTitle: "Journal",
    })

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <main className="relative z-10">
                <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
                    <ParticleHero className="-mx-6 px-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
                        <HeroContent />
                    </ParticleHero>
                </div>

                <ScrollNarrative>
                    <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
                        <StickyNowSection now={data.now} />
                    </div>

                    {/* Journey with generative art background */}
                    <div className="relative">
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            <SectionArt section="journey" data={data.journey} />
                        </div>
                        <HorizontalJourney journey={data.journey} />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
                        {/* Builds with generative art background */}
                        <div className="relative">
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <SectionArt section="builds" data={data.builds} />
                            </div>
                            <StaggeredBuilds builds={data.builds} />
                        </div>

                        {/* Live Metrics Dashboard */}
                        <section id="dashboard" className="py-24">
                            <div className="space-y-2 mb-8">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Data</p>
                                <h2 className="text-3xl sm:text-4xl font-light tracking-tight">By the Numbers</h2>
                            </div>
                            <BentoGrid />
                        </section>

                        {/* Notes with generative art background */}
                        <div className="relative">
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <SectionArt section="notes" data={data.notes} />
                            </div>
                            <EditorialNotes notes={data.notes} />
                        </div>

                        <ConnectFinale />
                    </div>
                </ScrollNarrative>
            </main>
        </div>
    )
}
