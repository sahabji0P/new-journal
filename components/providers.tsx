"use client";

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
            {children}
            <NavIsland />
        </ThemeProvider>
    );
}
