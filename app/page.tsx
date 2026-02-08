import HomeClient from "@/components/home-client"
import { getHomeJournalData } from "@/lib/journal-feed"

export default function Home() {
    const data = getHomeJournalData()
    return <HomeClient data={data} />
}
