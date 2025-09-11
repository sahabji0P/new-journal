"use client"

import { MenuBar } from "@/components/menu-bar"
import { Categories } from "@/components/settings/Categories"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock budgets data for categories component
const budgets = [
    { id: 1, name: "Monthly Budget" },
    { id: 2, name: "Goa Trip" },
]

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <MenuBar />
            <main className="max-w-6xl mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold mb-8">Settings</h1>
                <Tabs defaultValue="categories" className="w-full">
                    <TabsList>
                        <TabsTrigger value="categories">Categories</TabsTrigger>
                        <TabsTrigger value="accounts">Accounts</TabsTrigger>
                        <TabsTrigger value="general">General</TabsTrigger>
                    </TabsList>
                    <TabsContent value="categories">
                        <Categories budgets={budgets} />
                    </TabsContent>
                    <TabsContent value="accounts">
                        <p>Manage your accounts here.</p>
                    </TabsContent>
                    <TabsContent value="general">
                        <p>General application settings.</p>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
