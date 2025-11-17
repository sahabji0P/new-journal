"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Accounts } from "./Accounts"
import { Categories } from "./Categories"
import { Preferences } from "./Preferences"
import { ExportImport } from "./ExportImport"

export function Settings() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">Settings</h2>
                <p className="text-muted-foreground">Manage your accounts, categories, and preferences</p>
            </div>

            <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="accounts">Accounts</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="export">Export/Import</TabsTrigger>
                </TabsList>

                <TabsContent value="accounts" className="mt-6">
                    <Accounts />
                </TabsContent>

                <TabsContent value="categories" className="mt-6">
                    <Categories />
                </TabsContent>

                <TabsContent value="preferences" className="mt-6">
                    <Preferences />
                </TabsContent>

                <TabsContent value="export" className="mt-6">
                    <ExportImport />
                </TabsContent>
            </Tabs>
        </div>
    )
}
