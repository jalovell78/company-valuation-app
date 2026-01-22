'use server';

import {
    searchCompanies,
    getFilingHistory,
    getCompanyProfile,
    searchOfficers,
    getOfficerAppointments
} from '@/lib/api';
import { fetchPdfBuffer } from '@/lib/server/pdf-service';
import { analyzeValuationWithGemini, AIAnalysisResult } from '@/lib/server/ai-valuation';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { auth } from '@/auth';

export async function logAction(action: string, details: any) {
    try {
        const session = await auth();
        // If no user, we might still want to log it as "anonymous" or skip
        // But for this app, we require login for valuation, so session should exist.
        const userId = session?.user?.id || null;

        await db.insert(auditLogs).values({
            userId,
            action,
            details,
        });
    } catch (e) {
        console.error("Failed to write audit log:", e);
        // Don't fail the main request just because logging failed
    }
}


export async function searchCompaniesAction(query: string) {
    try {
        const data = await searchCompanies(query);
        return { success: true, data };
    } catch (error) {
        console.error("Search Action Error:", error);
        return { success: false, error: "Failed to search companies" };
    }
}

export async function generateAIValuation(companyNumber: string, documentMetadataUrl?: string, companyStatus?: string): Promise<{ success: boolean; data?: AIAnalysisResult; error?: string }> {
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
        const analysis = await analyzeValuationWithGemini(pdfBuffer, companyStatus);

        // 3. Log the successful valuation
        await logAction("VALUATION_GENERATED", {
            companyNumber,
            companyStatus,
            docUrl,
            valuation: analysis.valuationEstimate
        });

        return { success: true, data: analysis };

    } catch (error: any) {
        console.error("AI Valuation Error:", error);

        // Detailed Rate Limit handling
        if (error.message?.includes('429') || error.message?.includes('Quota exceeded')) {
            return {
                success: false,
                error: "RATE_LIMIT_EXCEEDED" // Special code for UI
            };
        }

        return { success: false, error: error.message || "Failed to generate AI valuation" };
    }
}

// Officer Actions
export async function fetchOfficers(query: string) {
    try {
        const data = await searchOfficers(query);
        return { success: true, data };
    } catch (error: any) {
        console.error("Fetch Officers Error:", error);
        return { success: false, error: error.message };
    }
}

export async function fetchOfficerAppointments(officerId: string) {
    try {
        const data = await getOfficerAppointments(officerId);
        return { success: true, data };
    } catch (error: any) {
        console.error("Fetch Appointments Error:", error);
        return { success: false, error: error.message };
    }
}
