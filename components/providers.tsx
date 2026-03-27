"use client";

import ChatWidget from "@/components/chat/chat-widget";
import { NavProvider } from "@/lib/nav-context";
import { ThemeProvider } from "next-themes";
import { NavIsland } from "./nav-island";
import TerminalToggle from "./terminal/terminal-toggle";

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
                <TerminalToggle />
                <ChatWidget />
            </NavProvider>
        </ThemeProvider>
    );
}
