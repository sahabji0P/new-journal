import { NextResponse } from "next/server"

export interface ParsedParams {
  featured?: boolean
  category?: string
  year?: string
  limit?: number
  fields?: string[]
}

const API_VERSION = "1.0"

const COMMON_HEADERS: Record<string, string> = {
  "X-Powered-By": "shashwat.dev",
  "X-API-Version": API_VERSION,
}

export function apiResponse(
  data: unknown,
  meta?: Record<string, unknown>,
  cacheControl = "public, max-age=3600"
): NextResponse {
  const autoMeta: Record<string, unknown> = {}

  if (Array.isArray(data)) {
    autoMeta.total = data.length
  }

  const body = {
    data,
    meta: {
      ...autoMeta,
      ...meta,
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(body, {
    headers: {
      ...COMMON_HEADERS,
      "Cache-Control": cacheControl,
    },
  })
}

export function apiError(message: string, status: number): NextResponse {
  if (status < 400 || status > 599) {
    throw new Error(`apiError called with non-error status: ${status}`)
  }

  const body = {
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(body, {
    status,
    headers: COMMON_HEADERS,
  })
}

export function parseQueryParams(searchParams: URLSearchParams): ParsedParams {
  const params: ParsedParams = {}

  const featured = searchParams.get("featured")
  if (featured !== null) {
    params.featured = featured === "true"
  }

  const category = searchParams.get("category")
  if (category !== null) {
    params.category = category
  }

  const year = searchParams.get("year")
  if (year !== null) {
    params.year = year
  }

  const limit = searchParams.get("limit")
  if (limit !== null) {
    const parsed = parseInt(limit, 10)
    if (!isNaN(parsed) && parsed > 0) {
      params.limit = parsed
    }
  }

  const fields = searchParams.get("fields")
  if (fields !== null) {
    params.fields = fields.split(",").map((f) => f.trim()).filter(Boolean)
  }

  return params
}

export function sparseFields<T extends Record<string, unknown>>(
  obj: T,
  fields?: string[]
): Partial<T> {
  if (!fields || fields.length === 0) {
    return obj
  }

  const result: Partial<T> = {}
  for (const field of fields) {
    if (field in obj) {
      result[field as keyof T] = obj[field as keyof T]
    }
  }
  return result
}
