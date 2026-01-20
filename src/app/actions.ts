'use server';

import { searchCompanies, getFilingHistory, getCompanyProfile } from '@/lib/api';
import { fetchPdfBuffer } from '@/lib/server/pdf-service';
import { analyzeValuationWithGemini, AIAnalysisResult } from '@/lib/server/ai-valuation';

export async function searchCompaniesAction(query: string) {
    try {
        const data = await searchCompanies(query);
        return { success: true, data };
    } catch (error) {
        console.error("Search Action Error:", error);
        return { success: false, error: "Failed to search companies" };
    }
}

export async function generateAIValuation(companyNumber: string, documentMetadataUrl?: string): Promise<{ success: boolean; data?: AIAnalysisResult; error?: string }> {
    try {
        let docUrl = documentMetadataUrl;

        // If no URL provided (e.g. from UI), try to find latest AA
        if (!docUrl) {
            const history = await getFilingHistory(companyNumber);
            const accountFiling = history.items.find((f: any) => f.category === 'accounts' && f.links?.document_metadata);

            if (!accountFiling) {
                return { success: false, error: "No accounts filing found with a document link." };
            }
            docUrl = accountFiling.links.document_metadata;
        }

        if (!docUrl) return { success: false, error: "No Document URL available" };

        // 1. Fetch PDF
        const pdfBuffer = await fetchPdfBuffer(docUrl);

        // 2. Analyze with Gemini
        const analysis = await analyzeValuationWithGemini(pdfBuffer);

        return { success: true, data: analysis };

    } catch (error: any) {
        console.error("AI Valuation Error:", error);
        return { success: false, error: error.message || "Failed to generate AI valuation" };
    }
}
