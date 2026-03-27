import { NextRequest } from "next/server"
import { apiResponse, apiError } from "@/lib/api/response"
import { getExperienceBySlug } from "@/lib/experience-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = getExperienceBySlug(slug)

  if (!item) {
    return apiError("Experience not found", 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, ...rest } = item
  return apiResponse(rest)
}
