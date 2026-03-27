import { apiResponse } from "@/lib/api/response"
import { aggregateSkills } from "@/lib/api/skills"

export async function GET() {
  const skills = aggregateSkills()
  return apiResponse({ skills })
}
