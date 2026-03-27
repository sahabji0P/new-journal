import { NextRequest } from "next/server"
import { apiResponse, apiError } from "@/lib/api/response"
import { getThoughtBySlug } from "@/lib/mdx-utils"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const item = getThoughtBySlug(slug)

  if (!item) {
    return apiError("Thought not found", 404)
  }

  return apiResponse(item)
}
