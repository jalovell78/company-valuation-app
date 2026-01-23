
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface AIAnalysisResult {
    netAssets: number | null;
    turnover: number | null;
    profit: number | null;
    shareholderFunds: number | null;

    debtors: number | null;
    cashAtBank: number | null;
    currentLiabilities: number | null;
    longTermLiabilities: number | null;

    valuationEstimate: number;
    valuationLow: number;
    valuationHigh: number;

    // New Valuation Meta Data
    estimatedProfit: number; // The profit used for calculation (could be imputed)
    valuationMultiplier: number; // The sector-based multiplier used
    valuationMethodology: string; // Explanation of the method

    currency: string;
    confidence: string;

    employeeCount: string;
    starRating: number;
    sector: string;
    businessDescription: string;

    keyHighlights: string[];
    executiveSummary: string;
}

export async function analyzeValuationWithGemini(pdfBuffer: Buffer, companyStatus?: string): Promise<AIAnalysisResult> {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const statusContext = companyStatus ? `The company status is currently: ${companyStatus.toUpperCase()}.` : "";
    const tenseInstruction = (companyStatus === 'dissolved' || companyStatus === 'liquidation')
        ? "IMPORTANT: The company is DISSOLVED. You MUST write the 'Executive Summary' and 'Business Description' in the PAST TENSE (e.g. 'The company was...', 'It traded in...')."
        : "Write in the present tense as usual.";

    const prompt = `
    You are an expert financial analyst. I am providing you with the Annual Accounts of a UK company.
    ${statusContext}
    ${tenseInstruction}
    
    Your task is to determine a REALISTIC MARKET VALUATION. 
    Many small companies do not disclose "Net Profit" directly. In these cases, you MUST calculate an "Imputed Profit" by looking at the change in "Retained Earnings" (Profit & Loss Account reserves) from the previous year to the current year, plus any Dividends if found.

    Step 1: Extract Financials
    - Net Assets (Total Equity)
    - Net Profit (If explicit). If NOT explicit, calculate: (Retained Earnings Current Year - Retained Earnings Previous Year). Use this as "Estimated Profit".
    - Turnover (Revenue).
    - Debtors, Cash, Creditors (<1yr), Creditors (>1yr).

    Step 2: Determine Sector & Multiplier
    - Identify the specific Industry Sector.
    - Assign a "Valuation Multiplier" based on typical UK SME standards for this sector (e.g., Construction ~3x, Retail ~4x, Technology/SaaS ~6-10x, Consulting ~4x).
    
    Step 3: Calculate Valuation
    - **Method**: (Estimated Profit * Multiplier) + Net Assets.
    - **Conservative (Low)**: Uses the base multiplier.
    - **High-End (High)**: Uses (Multiplier * 1.5) OR adds a premium for Growth/IP.
    - *Solvency Check*: If Net Assets are negative AND Profit is negative, Valuation is 0.
    
    Step 4: Generate Output
    extract/generate the following in pure JSON:

    {
        "netAssets": number | null,
        "turnover": number | null,
        "profit": number | null (The Explicit Profit figure, or null if not found),
        "shareholderFunds": number | null,
        "debtors": number | null,
        "cashAtBank": number | null,
        "currentLiabilities": number | null,
        "longTermLiabilities": number | null,
        
        "estimatedProfit": number (The figure you used for valuation - either the explicit profit or your imputed calculation),
        "valuationMultiplier": number (The multiplier you applied, e.g. 4.5),
        "valuationMethodology": "string" (Short explanation, e.g. "Applied 4.5x Sector Multiplier for 'Technology' on Imputed Profit from Retained Earnings change"),

        "valuationLow": number,
        "valuationHigh": number,
        "employeeCount": "string",
        "starRating": number,
        "sector": "string",
        "businessDescription": "string",
        "currency": "GBP",
        "confidence": "High" | "Medium" | "Low",
        "keyHighlights": ["Point 1", "Point 2"],
        "executiveSummary": "Narrative..."
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

export async function generateComparisonVerdictAI(nameA: string, nameB: string, metricsA: string[], metricsB: string[]): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a financial expert comparing two UK companies: ${nameA} and ${nameB}.
    
    ${nameA} Metrics:
    ${metricsA.join('\n')}

    ${nameB} Metrics:
    ${metricsB.join('\n')}

    Task:
    Provide a concise, 3-sentence verdict on which company appears financially stronger and why. 
    - Focus on Liquidity (Cash/Liabilities) and Asset Base.
    - Mention if one is significantly larger or older (established).
    - Use clear, professional language.
    - Highlight the winner using **bold** text (e.g. "**${nameA}** demonstrates...").
    - IMPORTANT: Do NOT refer to them as "Company A" or "Company B". Use their actual names.
    
    Output strictly the paragraph verdict. No JSON.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}
