import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { GoogleGenerativeAI } from "@google/generative-ai"

function getPromptForTarget(target: string): string {
  switch (target) {
    case "investment_statement":
      return `Analyze this investment statement/document image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "name": "investment/scheme name",
  "type": "mutual_fund|fixed_deposit|ppf|epf|nps|stocks|gold|real_estate|bonds|rd|ssy|elss|nsc|kvp|scss|crypto|other",
  "institution": "bank/AMC/broker name",
  "investedAmount": number,
  "currentValue": number,
  "startDate": "YYYY-MM-DD",
  "maturityDate": "YYYY-MM-DD or null",
  "interestRate": number or null,
  "status": "active|matured|withdrawn|closed",
  "folioNumber": "string or null",
  "accountNumber": "string or null",
  "ticker": "string or null",
  "quantity": number or null,
  "buyPrice": number or null,
  "nominee": "string or null",
  "notes": "any additional relevant details"
}`

    case "insurance_policy":
      return `Analyze this insurance policy document image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "name": "policy name/plan name",
  "type": "term|endowment|ulip|money_back|whole_life|health|family_floater|super_topup|critical_illness|motor_comprehensive|motor_tp|home|travel|personal_accident|device_insurance|other",
  "insurer": "insurance company name",
  "policyNumber": "policy number",
  "premiumAmount": number,
  "premiumFrequency": "monthly|quarterly|half_yearly|yearly|single",
  "sumAssured": number,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD or null",
  "nextPremiumDate": "YYYY-MM-DD or null",
  "status": "active|lapsed|surrendered|matured|claimed",
  "nominee": "name or null",
  "nomineeRelation": "relationship or null",
  "riders": ["list of riders/add-ons"],
  "agentName": "string or null",
  "agentPhone": "string or null",
  "notes": "any additional relevant details"
}`

    case "identity_document":
      return `Analyze this identity document image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "type": "aadhaar|pan|passport|driving_license|voter_id|ration_card|other",
  "documentNumber": "document/ID number",
  "nameOnDocument": "full name as on document",
  "dateOfBirth": "YYYY-MM-DD or null",
  "gender": "male|female|other or null",
  "issueDate": "YYYY-MM-DD or null",
  "expiryDate": "YYYY-MM-DD or null",
  "issuingAuthority": "string or null",
  "placeOfIssue": "string or null",
  "address": "address if present or null",
  "notes": "any additional relevant details"
}`

    case "device_invoice":
      return `Analyze this device purchase invoice/bill image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "name": "device name",
  "category": "phone|laptop|tablet|desktop|tv|appliance|camera|wearable|audio|gaming|other",
  "brand": "brand/manufacturer",
  "model": "model name/number",
  "serialNumber": "serial number or null",
  "imeiNumber": "IMEI number or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "purchasePrice": number or null,
  "purchaseStore": "store/seller name or null",
  "warrantyEndDate": "YYYY-MM-DD or null",
  "specs": { "any": "relevant specifications" },
  "notes": "any additional relevant details"
}`

    case "vehicle_rc":
      return `Analyze this vehicle Registration Certificate (RC) image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "name": "vehicle description (make + model)",
  "type": "car|motorcycle|scooter|bicycle|auto|other",
  "make": "manufacturer name",
  "vehicleModel": "model name",
  "variant": "variant or null",
  "year": number,
  "color": "color or null",
  "fuelType": "petrol|diesel|electric|hybrid|cng or null",
  "registrationNo": "registration number",
  "chassisNumber": "chassis number or null",
  "engineNumber": "engine number or null",
  "registrationDate": "YYYY-MM-DD or null",
  "ownerName": "registered owner name or null",
  "fitnessExpiry": "YYYY-MM-DD or null",
  "notes": "any additional relevant details"
}`

    case "vehicle_invoice":
      return `Analyze this vehicle purchase invoice/bill image and extract all relevant data.
Return a JSON object with these fields (use null for fields you cannot determine):
{
  "name": "vehicle description (make + model)",
  "type": "car|motorcycle|scooter|bicycle|auto|other",
  "make": "manufacturer name",
  "vehicleModel": "model name",
  "variant": "variant or null",
  "year": number,
  "color": "color or null",
  "fuelType": "petrol|diesel|electric|hybrid|cng or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "purchasePrice": number or null,
  "showroomName": "dealer/showroom name or null",
  "registrationNo": "registration number or null",
  "chassisNumber": "chassis number or null",
  "engineNumber": "engine number or null",
  "loanAmount": number or null,
  "notes": "any additional relevant details"
}`

    case "general":
    default:
      return `Analyze this document/image and extract all relevant financial or asset-related data.
Return a JSON object with whatever structured data you can identify, including:
{
  "documentType": "describe the type of document",
  "extractedData": { all relevant fields you can identify },
  "notes": "any additional observations or details"
}`
  }
}

// POST /api/investments/scan - Scan a document image using Google AI
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()

    const { image, target } = body

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Scanner is not configured" },
        { status: 503 }
      )
    }

    const client = new GoogleGenerativeAI(apiKey)
    const model = client.getGenerativeModel({
      model: process.env.SAATHI_GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    })

    // Parse the base64 data URL
    const dataUrlMatch = image.match(/^data:([^;]+);base64,(.+)$/)
    if (!dataUrlMatch) {
      return NextResponse.json(
        { error: "Invalid image format. Expected a base64 data URL." },
        { status: 400 }
      )
    }

    const mimeType = dataUrlMatch[1]
    const base64Data = dataUrlMatch[2]

    const prompt = getPromptForTarget(target || "general")

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

    try {
      const parsed = JSON.parse(responseText)
      return NextResponse.json({ success: true, data: parsed })
    } catch {
      return NextResponse.json({
        success: true,
        data: { raw: responseText },
      })
    }
  } catch (error) {
    console.error("Error scanning document:", error)
    return NextResponse.json(
      { error: "Failed to scan document" },
      { status: 500 }
    )
  }
}
