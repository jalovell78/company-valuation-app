
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AIAnalysisResult {
    netAssets: number;
    turnover: number;
    profit: number;
    shareholderFunds: number;
    valuationEstimate: number;
    currency: string;
    confidence: string;
    // New Fields
    keyHighlights: string[];
    executiveSummary: string;
}

export async function analyzeValuationWithGemini(pdfBuffer: Buffer): Promise<AIAnalysisResult> {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
    You are an expert financial analyst. I am providing you with the Annual Accounts of a UK company.
    
    Please perform a deep analysis and extract/generate the following:

    1. **Financial Figures** (Use 0 if not found):
       - Net Assets (Total Assets less Current Liabilities)
       - Turnover (Revenue)
       - Net Profit (Profit/Loss for the year)
       - Shareholder Funds (Total Equity)

    2. **Valuation Calculation**:
       - Calculate an estimated COMPANY VALUATION based on this heuristic:
         - If Profitable: Valuation = (5 * Net Profit) + Net Assets
         - If Loss Making but Positive Equity: Valuation = Net Assets
         - If Negative Equity: Valuation = 0

    3. **Key Information Highlights**:
       - Extract 3-5 distinct, important facts about the company's financial health, specific debts, major assets, or director notes. Be specific.

    4. **Executive Summary / State of the Company**:
       - Write a clear, professional running commentary (2-3 sentences) summarizing the overall state of the company (e.g., "The company is solvency-challenged due to recurring losses..." or "Strong growth trajectory with healthy cash reserves...").

    Return your response in pure JSON format with no markdown formatting:
    {
        "netAssets": number,
        "turnover": number,
        "profit": number,
        "shareholderFunds": number,
        "valuationEstimate": number,
        "currency": "GBP",
        "confidence": "High" | "Medium" | "Low",
        "keyHighlights": ["Point 1", "Point 2", "Point 3"],
        "executiveSummary": "Narrative summary here..."
    }
    `;

    // Convert Buffer to Base64 for Gemini
    const pdfBase64 = pdfBuffer.toString('base64');

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf",
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    // clean markdown if present (```json ... ```)
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse Gemini JSON:", text);
        throw new Error("AI Analysis returned invalid format");
    }
}
