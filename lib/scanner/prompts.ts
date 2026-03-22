import type { ScanTarget } from "./types"

const prompts: Record<ScanTarget, string> = {
  identity_document: `You are an expert document scanner. Analyze this identity document image and extract all relevant information.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "type": "aadhaar|pan|passport|driving_license|voter_id|other",
  "documentNumber": "the document/ID number",
  "nameOnDocument": "full name exactly as printed on the document",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male|female|other",
  "address": "full address if present",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "issuingAuthority": "name of issuing authority",
  "placeOfIssue": "place of issue"
}

Important:
- Dates must be in YYYY-MM-DD format
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine
- Extract the document number exactly as printed, preserving spaces/hyphens`,

  investment_statement: `You are an expert financial document scanner. Analyze this investment statement/document image and extract all relevant data.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "name": "investment/scheme name",
  "type": "mutual_fund|fixed_deposit|ppf|stocks|gold|epf|nps|bonds|rd|ssy|elss|nsc|kvp|scss|crypto|other",
  "institution": "bank/AMC/broker name",
  "folioNumber": "folio number if applicable",
  "accountNumber": "account number if applicable",
  "investedAmount": 0,
  "currentValue": 0,
  "nav": 0,
  "units": 0,
  "startDate": "YYYY-MM-DD",
  "maturityDate": "YYYY-MM-DD",
  "interestRate": 0,
  "sipAmount": 0,
  "sipDate": 1
}

Important:
- Dates must be in YYYY-MM-DD format
- Amounts must be plain numbers without currency symbols (e.g., 50000 not Rs. 50,000)
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine`,

  insurance_policy: `You are an expert insurance document scanner. Analyze this insurance policy document image and extract all relevant data.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "name": "policy name/plan name",
  "type": "term|health|motor_comprehensive|motor_tp|endowment|ulip|money_back|whole_life|family_floater|super_topup|critical_illness|home|travel|personal_accident|device_insurance|other",
  "insurer": "insurance company name",
  "policyNumber": "policy number",
  "premiumAmount": 0,
  "premiumFrequency": "monthly|quarterly|half_yearly|yearly|single",
  "sumAssured": 0,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "policyholderName": "name of the policyholder",
  "nomineeName": "name of the nominee",
  "nomineeRelation": "relationship of nominee to policyholder",
  "riders": ["list of riders or add-ons"]
}

Important:
- Dates must be in YYYY-MM-DD format
- Amounts must be plain numbers without currency symbols (e.g., 500000 not Rs. 5,00,000)
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine`,

  device_invoice: `You are an expert invoice scanner. Analyze this device purchase invoice/bill image and extract all relevant data.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "name": "device name (brand + model)",
  "brand": "brand/manufacturer name",
  "model": "model name/number",
  "serialNumber": "serial number",
  "imei": "IMEI number if applicable",
  "purchaseDate": "YYYY-MM-DD",
  "purchasePrice": 0,
  "storeName": "store/seller name",
  "warrantyEndDate": "YYYY-MM-DD"
}

Important:
- Dates must be in YYYY-MM-DD format
- Amounts must be plain numbers without currency symbols (e.g., 79990 not Rs. 79,990)
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine
- If warranty period is given (e.g., "1 year"), calculate the warranty end date from the purchase date`,

  vehicle_rc: `You are an expert vehicle document scanner. Analyze this vehicle Registration Certificate (RC) image and extract all relevant data.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "ownerName": "registered owner name",
  "registrationNumber": "vehicle registration number",
  "make": "manufacturer name",
  "model": "model name",
  "variant": "variant if visible",
  "yearOfManufacture": 0,
  "chassisNumber": "chassis number",
  "engineNumber": "engine number",
  "fuelType": "petrol|diesel|electric|hybrid|cng",
  "vehicleType": "car|motorcycle|scooter|auto|other",
  "color": "vehicle color",
  "registrationDate": "YYYY-MM-DD",
  "fitnessValidUntil": "YYYY-MM-DD"
}

Important:
- Dates must be in YYYY-MM-DD format
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine
- Extract registration number exactly as printed (e.g., MH02AB1234)`,

  vehicle_invoice: `You are an expert invoice scanner. Analyze this vehicle purchase invoice/bill image and extract all relevant data.

Return a JSON object with these fields (use null for any field you cannot determine):
{
  "name": "vehicle description (make + model)",
  "make": "manufacturer name",
  "model": "model name",
  "variant": "variant if visible",
  "year": 0,
  "color": "vehicle color",
  "purchasePrice": 0,
  "showroomName": "dealer/showroom name",
  "purchaseDate": "YYYY-MM-DD",
  "registrationNumber": "registration number if present",
  "engineNumber": "engine number",
  "chassisNumber": "chassis number"
}

Important:
- Dates must be in YYYY-MM-DD format
- Amounts must be plain numbers without currency symbols (e.g., 850000 not Rs. 8,50,000)
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine`,

  general: `You are an expert document scanner. Analyze this document/image and extract all identifiable structured data.

Return a JSON object with whatever structured data you can identify. Look for:
- Names of people or organizations
- Dates (in YYYY-MM-DD format)
- Monetary amounts (as plain numbers, no currency symbols)
- ID numbers, account numbers, reference numbers
- Addresses
- Phone numbers, email addresses

Format your response as:
{
  "documentType": "describe what type of document this is",
  "extractedFields": {
    "fieldName": "value"
  },
  "rawText": "all readable text content from the document",
  "notes": "any observations about the document quality or content"
}

Important:
- Dates must be in YYYY-MM-DD format
- Amounts must be plain numbers without currency symbols
- Return only valid JSON, no markdown or extra text
- Use null (not empty string) for fields you cannot determine`,
}

export function getScanPrompt(target: ScanTarget): string {
  return prompts[target] ?? prompts.general
}
