import { NextRequest } from "next/server"
import { apiResponse, apiError } from "@/lib/api/response"
import { getProjectBySlug } from "@/lib/project-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = getProjectBySlug(slug)

  if (!item) {
    return apiError("Project not found", 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, ...rest } = item
  return apiResponse(rest)
}
