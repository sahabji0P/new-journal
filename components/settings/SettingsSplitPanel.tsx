"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

export interface SettingsSplitSection {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  content: ReactNode
}

interface SettingsSplitPanelProps {
  title: string
  description?: string
  sections: SettingsSplitSection[]
  defaultSectionId: string
}

export function SettingsSplitPanel({
  title,
  description,
  sections,
  defaultSectionId,
}: SettingsSplitPanelProps) {
  const fallbackSectionId = sections[0]?.id ?? ""
  const initialSection = sections.some(section => section.id === defaultSectionId)
    ? defaultSectionId
    : fallbackSectionId

  const [activeSectionId, setActiveSectionId] = useState(initialSection)

  useEffect(() => {
    if (!sections.some(section => section.id === activeSectionId)) {
      setActiveSectionId(initialSection)
    }
  }, [activeSectionId, sections, initialSection])

  const activeSection = useMemo(
    () => sections.find(section => section.id === activeSectionId) ?? sections[0],
    [sections, activeSectionId]
  )

  if (!activeSection) {
    return null
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <SidebarProvider className="items-start">
        <Sidebar collapsible="none" className="hidden md:flex border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map(section => {
                    const Icon = section.icon
                    return (
                      <SidebarMenuItem key={section.id}>
                        <SidebarMenuButton
                          isActive={section.id === activeSectionId}
                          onClick={() => setActiveSectionId(section.id)}
                          className="h-auto min-h-10 py-2"
                        >
                          <Icon className="mt-0.5" />
                          <div className="min-w-0 text-left">
                            <span className="block text-sm truncate">{section.label}</span>
                            {section.description && (
                              <span className="block text-xs text-muted-foreground truncate">
                                {section.description}
                              </span>
                            )}
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex min-h-[480px] md:min-h-[560px] flex-1 flex-col">
          <header className="hidden border-b px-6 py-4 md:block">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {activeSection.label}
            </p>
          </header>

          <div className="border-b p-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {sections.map(section => (
                <Button
                  key={section.id}
                  type="button"
                  size="sm"
                  variant={section.id === activeSectionId ? "default" : "outline"}
                  onClick={() => setActiveSectionId(section.id)}
                  className="shrink-0"
                >
                  {section.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">{activeSection.content}</div>
        </main>
      </SidebarProvider>
    </div>
  )
}
