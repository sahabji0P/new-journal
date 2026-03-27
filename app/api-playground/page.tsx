import PlaygroundClient from "@/components/playground/playground-client"

export const metadata = {
    title: "API Playground | Shashwat Jain",
    description:
        "Explore the portfolio data through a REST API. Select endpoints, configure parameters, and view responses.",
}

export default function APIPlaygroundPage() {
    return <PlaygroundClient />
}
