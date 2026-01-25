"use client";

import { NavProvider } from "@/lib/nav-context";
import { ThemeProvider } from "next-themes";
import { NavIsland } from "./nav-island";

interface ProvidersProps {
    children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
        >
            <NavProvider>
                {children}
                <NavIsland />
            </NavProvider>
        </ThemeProvider>
    );
}
