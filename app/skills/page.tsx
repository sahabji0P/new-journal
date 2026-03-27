import { buildSkillGraph } from "@/lib/skill-graph"
import SkillsClient from "./skills-client"

export const metadata = {
  title: "Skills | Shashwat Jain",
  description: "An interactive force-directed graph of skills, projects, research, and experience.",
}

export default function SkillsPage() {
  const data = buildSkillGraph()
  return <SkillsClient data={data} />
}
