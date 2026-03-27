import { NextRequest } from "next/server"
import { apiResponse, parseQueryParams, sparseFields } from "@/lib/api/response"
import { getAllWork } from "@/lib/work-utils"

export async function GET(request: NextRequest) {
  const { featured, year, limit, fields } = parseQueryParams(request.nextUrl.searchParams)

  let items = getAllWork()

  if (featured !== undefined) items = items.filter((i) => i.featured === featured)
  if (year) items = items.filter((i) => i.year === year)
  if (limit) items = items.slice(0, limit)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const data = items.map(({ content, ...rest }) => sparseFields(rest, fields))

  return apiResponse(data)
}
