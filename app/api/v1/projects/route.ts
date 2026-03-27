import { NextRequest } from "next/server"
import { apiResponse, parseQueryParams, sparseFields } from "@/lib/api/response"
import { getAllProjects } from "@/lib/project-utils"

export async function GET(request: NextRequest) {
  const { featured, category, year, limit, fields } = parseQueryParams(request.nextUrl.searchParams)

  let items = getAllProjects()

  if (featured !== undefined) items = items.filter((i) => i.featured === featured)
  if (category) items = items.filter((i) => i.category === category)
  if (year) items = items.filter((i) => new Date(i.date).getFullYear().toString() === year)
  if (limit) items = items.slice(0, limit)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const data = items.map(({ content, ...rest }) => {
    const withLinks = { ...rest, links: { details: `/projects/${rest.slug}` } }
    return sparseFields(withLinks, fields)
  })

  return apiResponse(data)
}
