import { NextRequest } from "next/server"
import { apiResponse, parseQueryParams, sparseFields } from "@/lib/api/response"
import { getAllThoughts } from "@/lib/mdx-utils"

export async function GET(request: NextRequest) {
  const { category, year, limit, fields } = parseQueryParams(request.nextUrl.searchParams)

  let items = getAllThoughts()

  if (category) items = items.filter((i) => i.category === category)
  if (year) items = items.filter((i) => new Date(i.date).getFullYear().toString() === year)
  if (limit) items = items.slice(0, limit)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const data = items.map(({ content, ...rest }) => sparseFields(rest, fields))

  return apiResponse(data)
}
