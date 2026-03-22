import { GoogleGenerativeAI } from "@google/generative-ai"
import { getScanPrompt } from "./prompts"
import type { ScanTarget, ScanExtractionResult } from "./types"

/**
 * Strips markdown code fences from a response string.
 * Gemini sometimes wraps JSON output in ```json ... ``` blocks.
 */
function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  return fenced ? fenced[1].trim() : text.trim()
}

/**
 * Computes a confidence level based on the number of non-null fields extracted.
 */
function computeConfidence(data: Record<string, unknown>): "high" | "medium" | "low" {
  const values = Object.values(data)
  const total = values.length
  if (total === 0) return "low"

  const filled = values.filter(
    (v) => v !== null && v !== undefined && v !== "" && v !== 0
  ).length

  const ratio = filled / total

  if (ratio >= 0.7) return "high"
  if (ratio >= 0.4) return "medium"
  return "low"
}

/**
 * Extracts structured data from a document image using Google Gemini vision.
 *
 * @param imageBase64 - Full base64 data URL (data:image/...;base64,...) of the image
 * @param target      - The type of document being scanned
 * @param apiKey      - Google AI API key
 * @returns           - Extraction result with parsed data and confidence level
 */
export async function extractFromImage(
  imageBase64: string,
  target: ScanTarget,
  apiKey: string
): Promise<ScanExtractionResult> {
  // 1. Build the prompt
  const prompt = getScanPrompt(target)

  // 2. Parse the data URL to separate mime type and raw base64
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/)
  if (!dataUrlMatch) {
    return {
      success: false,
      confidence: "low",
      data: {},
      warnings: ["Invalid image format. Expected a base64 data URL."],
    }
  }

  const mimeType = dataUrlMatch[1]
  const base64Data = dataUrlMatch[2]

  // 3. Create a Gemini client and model
  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  })

  // 4. Send the image + prompt to Gemini
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  })

  const responseText = result.response.text()

  // 5. Parse the response (handle potential code fences)
  const warnings: string[] = []
  let data: Record<string, unknown>

  try {
    const cleaned = stripCodeFences(responseText)
    data = JSON.parse(cleaned)
  } catch {
    // If JSON parsing fails entirely, return raw text
    warnings.push("Could not parse structured data from AI response")
    return {
      success: false,
      confidence: "low",
      data: {},
      rawText: responseText,
      warnings,
    }
  }

  // 6. Determine confidence based on extraction completeness
  const confidence = computeConfidence(data)

  if (confidence === "low") {
    warnings.push("Few fields were successfully extracted. Verify the data manually.")
  }

  return {
    success: true,
    confidence,
    data,
    rawText: responseText,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}
