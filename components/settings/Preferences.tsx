"use client"

import { useApp } from "@/contexts/AppContext"
import { Bell, Eye, Lock, Settings2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { FieldLabel } from "../ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Checkbox } from "../ui/checkbox"

export type PreferencesSection = "general" | "display" | "notifications" | "privacy"

interface PreferencesProps {
  section?: PreferencesSection
}

export function Preferences({ section }: PreferencesProps) {
  const { settings, updateSettings } = useApp()
  const showSection = (sectionName: PreferencesSection) => !section || section === sectionName

  return (
    <div className="space-y-6">
      {showSection("general") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="currency">Currency</FieldLabel>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => {
                    const symbols: Record<string, string> = {
                      USD: "$",
                      EUR: "€",
                      GBP: "£",
                      JPY: "¥",
                      INR: "₹",
                    }
                    updateSettings({ currency: value, currencySymbol: symbols[value] || "₹" })
                  }}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <FieldLabel htmlFor="date-format">Date Format</FieldLabel>
                <Select
                  value={settings.dateFormat}
                  onValueChange={(value: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD") =>
                    updateSettings({ dateFormat: value })
                  }
                >
                  <SelectTrigger id="date-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showSection("display") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <CardTitle>Display Settings</CardTitle>
            </div>
            <CardDescription>Control how information is displayed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FieldLabel>Show Cents</FieldLabel>
                <p className="text-sm text-muted-foreground">Display decimal places in amounts</p>
              </div>
              <Checkbox
                checked={settings.display.showCents}
                onCheckedChange={(checked) =>
                  updateSettings({ display: { ...settings.display, showCents: !!checked } })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FieldLabel>Compact Mode</FieldLabel>
                <p className="text-sm text-muted-foreground">Use dense layout for lists</p>
              </div>
              <Checkbox
                checked={settings.display.compactMode}
                onCheckedChange={(checked) =>
                  updateSettings({ display: { ...settings.display, compactMode: !!checked } })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {showSection("notifications") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FieldLabel>Enable Notifications</FieldLabel>
                <p className="text-sm text-muted-foreground">Master switch for all notifications</p>
              </div>
              <Checkbox
                checked={settings.notifications.enabled}
                onCheckedChange={(checked) =>
                  updateSettings({
                    notifications: { ...settings.notifications, enabled: !!checked },
                  })
                }
              />
            </div>

            {settings.notifications.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Budget Alerts</FieldLabel>
                    <p className="text-sm text-muted-foreground">Notify when approaching budget limits</p>
                  </div>
                  <Checkbox
                    checked={settings.notifications.budgetAlerts}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: { ...settings.notifications, budgetAlerts: !!checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Bill Reminders</FieldLabel>
                    <p className="text-sm text-muted-foreground">Notify about upcoming bills</p>
                  </div>
                  <Checkbox
                    checked={settings.notifications.billReminders}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: { ...settings.notifications, billReminders: !!checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Goal Milestones</FieldLabel>
                    <p className="text-sm text-muted-foreground">Notify when reaching savings goals</p>
                  </div>
                  <Checkbox
                    checked={settings.notifications.goalMilestones}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: { ...settings.notifications, goalMilestones: !!checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FieldLabel>Recurring Transactions</FieldLabel>
                    <p className="text-sm text-muted-foreground">Notify about due recurring transactions</p>
                  </div>
                  <Checkbox
                    checked={settings.notifications.recurringTransactions}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        notifications: { ...settings.notifications, recurringTransactions: !!checked },
                      })
                    }
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {showSection("privacy") && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              <CardTitle>Privacy & Security</CardTitle>
            </div>
            <CardDescription>Control access and data protection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FieldLabel>Require Authentication</FieldLabel>
                <p className="text-sm text-muted-foreground">Require login to access app (coming soon)</p>
              </div>
              <Checkbox checked={settings.privacy.requireAuth} disabled />
            </div>

            <div>
              <FieldLabel htmlFor="auto-lock">Auto-Lock (minutes)</FieldLabel>
              <Select
                value={settings.privacy.autoLockMinutes.toString()}
                onValueChange={(value) =>
                  updateSettings({
                    privacy: { ...settings.privacy, autoLockMinutes: parseInt(value) },
                  })
                }
              >
                <SelectTrigger id="auto-lock">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="0">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
