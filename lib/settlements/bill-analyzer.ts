import { GoogleGenerativeAI } from "@google/generative-ai"

export interface BillAnalysisResult {
  merchantName?: string
  items: Array<{
    name: string
    quantity?: number
    price: number
  }>
  subtotal?: number
  tax?: number
  total: number
  currency?: string
  error?: string
}

const BILL_ANALYSIS_PROMPT = `Analyze this bill/receipt image. Extract all line items with their details.
Return a JSON object with this exact structure:
{
  "merchantName": "string or null",
  "items": [
    { "name": "item description", "quantity": 1, "price": 123.45 }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "total": number,
  "currency": "INR"
}

If you cannot extract any splittable items or amounts from the image, return:
{ "error": "Could not extract bill data from this image", "items": [], "total": 0 }

Important:
- Prices should be numbers, not strings
- Include all visible line items
- If quantity is not visible, assume 1
- Total is required even if estimated from items sum
`

function parseDataUrl(input: string): { mimeType: string; base64: string } | null {
  const match = input.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

export async function analyzeBillImage(
  imageDataUrl: string,
  mimeType?: string
): Promise<BillAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  const parsed = parseDataUrl(imageDataUrl)
  if (!parsed) {
    throw new Error("Invalid image data URL")
  }

  const modelName = process.env.SAATHI_GEMINI_MODEL || "gemini-2.5-flash"
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  })

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: BILL_ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType: mimeType || parsed.mimeType,
              data: parsed.base64,
            },
          },
        ],
      },
    ],
  })

  const text = result.response.text()
  try {
    return JSON.parse(text) as BillAnalysisResult
  } catch {
    return {
      error: "Failed to parse AI analysis result",
      items: [],
      total: 0,
    }
  }
}
