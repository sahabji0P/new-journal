import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import {
  SaathiCardSchema,
  SaathiStructuredResponseSchema,
  SaathiToolCallSchema,
  type SaathiToolCall,
  type SaathiStructuredResponse,
} from "@/lib/saathi/schema"

export type SaathiProvider = "gemini" | "openrouter"

export interface SaathiAttachmentPayload {
  name: string
  mimeType: string
  dataUrl: string
}

interface GenerateSaathiResponseInput {
  provider: SaathiProvider
  prompt: string
  images: SaathiAttachmentPayload[]
  audio: SaathiAttachmentPayload[]
}

const TOOL_ALIASES: Record<string, string> = {
  createparty: "create_party",
  addparty: "create_party",
  create_category: "create_category",
  addcategory: "create_category",
  add_category: "create_category",
  createcategory: "create_category",
  create_template: "create_template",
  addtemplate: "create_template",
  create_template_from_text: "create_template",
  updatetemplate: "update_template",
  edittemplate: "update_template",
  modifytemplate: "update_template",
  createtransaction: "create_transaction",
  addtransaction: "create_transaction",
  create_transaction_from_text: "create_transaction",
  updatetransaction: "update_transaction",
  edittransaction: "update_transaction",
  createfromtemplate: "create_transaction_from_template",
  create_transaction_from_existing_template: "create_transaction_from_template",
  createbudget: "create_budget",
  addbudget: "create_budget",
  updatebudget: "update_budget",
  editbudget: "update_budget",
  viewbudget: "view_budget_snapshot",
  get_budget_snapshot: "view_budget_snapshot",
  budget_snapshot: "view_budget_snapshot",
}

function extractJsonPayload(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1]

  const firstBrace = raw.indexOf("{")
  const lastBrace = raw.lastIndexOf("}")
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1)
  }

  return raw
}

function parseDataUrl(input: string): { mimeType: string; base64: string } | null {
  const match = input.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    base64: match[2],
  }
}

function normalizeToolName(input: unknown): string | null {
  if (typeof input !== "string") return null

  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[.\-/\s]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^tool_/, "")

  if (!normalized) return null
  if (normalized in TOOL_ALIASES) return TOOL_ALIASES[normalized]

  const squashed = normalized.replace(/_/g, "")
  if (squashed in TOOL_ALIASES) return TOOL_ALIASES[squashed]

  if (normalized.includes("transaction")) {
    if (/(create|add|record|save)/.test(normalized)) return "create_transaction"
    if (/(update|edit|modify)/.test(normalized)) return "update_transaction"
  }

  if (normalized.includes("template")) {
    if (/(create|add)/.test(normalized)) return "create_template"
    if (/(update|edit|modify)/.test(normalized)) return "update_template"
  }

  if (normalized.includes("budget")) {
    if (/(view|get|snapshot|status)/.test(normalized)) return "view_budget_snapshot"
    if (/(create|add)/.test(normalized)) return "create_budget"
    if (/(update|edit|modify)/.test(normalized)) return "update_budget"
  }

  if (normalized.includes("category") && /(create|add)/.test(normalized)) return "create_category"
  if (normalized.includes("party") && /(create|add)/.test(normalized)) return "create_party"

  return normalized
}

function isToolCallParseSuccess(
  result: ReturnType<typeof SaathiToolCallSchema.safeParse> | null
): result is { success: true; data: SaathiToolCall } {
  return Boolean(result?.success)
}

function normalizeStructuredPayload(payload: unknown): SaathiStructuredResponse {
  if (!payload || typeof payload !== "object") {
    return {
      assistantText: "I can help with that. Please share a bit more detail.",
      cards: [],
      toolCalls: [],
    }
  }

  const candidate = payload as Record<string, unknown>
  const assistantTextRaw =
    candidate.assistantText ??
    candidate.response ??
    candidate.answer ??
    candidate.message ??
    ""

  const assistantText = typeof assistantTextRaw === "string" && assistantTextRaw.trim()
    ? assistantTextRaw.trim()
    : "I can help with that. Please share a bit more detail."

  const cardsSource = Array.isArray(candidate.cards) ? candidate.cards : []
  const cards = cardsSource
    .map(card => SaathiCardSchema.safeParse(card))
    .filter(result => result.success)
    .map(result => result.data)
    .slice(0, 10)

  const toolSource = Array.isArray(candidate.toolCalls)
    ? candidate.toolCalls
    : Array.isArray(candidate.tools)
      ? candidate.tools
      : Array.isArray(candidate.actions)
        ? candidate.actions
        : []

  const toolCalls = toolSource
    .map(item => {
      if (!item || typeof item !== "object") return null
      const raw = item as Record<string, unknown>
      const tool = normalizeToolName(raw.tool ?? raw.name ?? raw.action)
      if (!tool) return null

      return SaathiToolCallSchema.safeParse({
        tool,
        rationale: typeof raw.rationale === "string"
          ? raw.rationale
          : typeof raw.reason === "string"
            ? raw.reason
            : undefined,
        input:
          (raw.input && typeof raw.input === "object" ? raw.input : null) ||
          (raw.args && typeof raw.args === "object" ? raw.args : null) ||
          (raw.parameters && typeof raw.parameters === "object" ? raw.parameters : null) ||
          {},
      })
    })
    .filter(isToolCallParseSuccess)
    .map(result => result.data)
    .slice(0, 4)

  return SaathiStructuredResponseSchema.parse({
    assistantText,
    cards,
    toolCalls,
  })
}

async function generateWithGemini(
  prompt: string,
  images: SaathiAttachmentPayload[],
  audio: SaathiAttachmentPayload[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const modelName = process.env.SAATHI_GEMINI_MODEL || "gemini-2.5-flash"
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  })

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ]

  for (const image of images) {
    const parsed = parseDataUrl(image.dataUrl)
    if (!parsed) continue
    parts.push({
      inlineData: {
        mimeType: image.mimeType || parsed.mimeType,
        data: parsed.base64,
      },
    })
  }

  for (const item of audio) {
    const parsed = parseDataUrl(item.dataUrl)
    if (!parsed) continue
    parts.push({
      inlineData: {
        mimeType: item.mimeType || parsed.mimeType,
        data: parsed.base64,
      },
    })
  }

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  })

  return result.response.text()
}

async function generateWithOpenRouter(
  prompt: string,
  images: SaathiAttachmentPayload[],
  audio: SaathiAttachmentPayload[]
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const model = process.env.SAATHI_OPENROUTER_MODEL || "google/gemini-2.5-flash"
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "CORE Saathi",
    },
  })

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: prompt,
    },
  ]

  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: image.dataUrl,
      },
    })
  }

  if (audio.length > 0) {
    content.push({
      type: "text",
      text: `Audio attachments were provided (${audio.map(item => item.name).join(", ")}). If the model cannot transcribe audio directly here, create a structured draft and ask the user for confirmation.`,
    })
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: content as never,
      },
    ],
  })

  const output = completion.choices[0]?.message?.content
  if (!output) {
    throw new Error("No output returned from OpenRouter")
  }

  return Array.isArray(output) ? output.map(part => part.type === "text" ? part.text : "").join("\n") : output
}

export async function generateSaathiResponse({
  provider,
  prompt,
  images,
  audio,
}: GenerateSaathiResponseInput): Promise<SaathiStructuredResponse> {
  const raw =
    provider === "openrouter"
      ? await generateWithOpenRouter(prompt, images, audio)
      : await generateWithGemini(prompt, images, audio)

  try {
    const parsedJson = JSON.parse(extractJsonPayload(raw))
    return normalizeStructuredPayload(parsedJson)
  } catch {
    return normalizeStructuredPayload({
      assistantText: raw,
      cards: [],
      toolCalls: [],
    })
  }
}
