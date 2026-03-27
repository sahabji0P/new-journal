import { apiResponse } from "@/lib/api/response"
import { countUniqueSkills } from "@/lib/api/skills"
import { getAllExperiences } from "@/lib/experience-utils"
import { getAllProjects } from "@/lib/project-utils"
import { getAllWork } from "@/lib/work-utils"
import { getAllThoughts } from "@/lib/mdx-utils"

export async function GET() {
  const stats = {
    totalProjects: getAllProjects().length,
    totalExperiences: getAllExperiences().length,
    totalPublications: getAllWork().length,
    totalThoughts: getAllThoughts().length,
    uniqueSkills: countUniqueSkills(),
    lastUpdated: new Date().toISOString(),
  }

  return apiResponse(stats)
}
