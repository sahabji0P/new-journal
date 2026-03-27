import { NextRequest } from "next/server"
import { apiResponse, apiError } from "@/lib/api/response"
import { getWorkBySlug } from "@/lib/work-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = getWorkBySlug(slug)

  if (!item) {
    return apiError("Research not found", 404)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, ...rest } = item
  return apiResponse(rest)
}
