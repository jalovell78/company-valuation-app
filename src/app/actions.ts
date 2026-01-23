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
import { auditLogs, valuations } from '@/db/schema';
import { auth } from '@/auth';
import { eq } from 'drizzle-orm';

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
        const session = await auth();
        if (!session?.user) {
            return { success: false, error: "Authentication required to generate valuation." };
        }

        // 1. Fetch Filing History to get the "Made Up To" date (Essential for Cache Validation)
        const history = await getFilingHistory(companyNumber);

        const accountFiling = history.items?.find((f: any) =>
            f.category === 'accounts' &&
            f.links?.document_metadata &&
            (f.type === 'AA' || f.description.toLowerCase().includes('account'))
        );

        if (!accountFiling) {
            return { success: false, error: "No suitable accounts filing found." };
        }

        const cacheKeyDate = accountFiling.date;

        // 2. CHECK CACHE
        try {
            const cachedParams = await db
                .select()
                .from(valuations)
                .where(eq(valuations.companyNumber, companyNumber))
                .limit(1);

            const cachedRecord = cachedParams[0];

            if (cachedRecord && cachedRecord.accountingPeriodEnd === cacheKeyDate) {
                console.log(`⚡ CACHE HIT for ${companyNumber} (${cacheKeyDate})`);
                await logAction("VALUATION_VIEW_CACHED", { companyNumber, companyStatus });
                return { success: true, data: cachedRecord.data as AIAnalysisResult };
            }

            console.log(`💨 CACHE MISS for ${companyNumber}. Fetching AI...`);

        } catch (dbError) {
            console.error("Cache Check Failed (ignoring):", dbError);
        }

        // 3. Fallback to docUrl if not provided
        const docUrl = documentMetadataUrl || accountFiling.links.document_metadata;
        if (!docUrl) return { success: false, error: "No Document URL available" };

        // 4. Run AI Analysis
        // Note: We might want to pass 'companyStatus' or context if needed, currently reusing logic
        const pdfBuffer = await fetchPdfBuffer(docUrl);
        const analysis = await analyzeValuationWithGemini(pdfBuffer, companyStatus);

        // 5. CACHE WRITE (Upsert)
        try {
            await db.insert(valuations).values({
                companyNumber,
                data: analysis,
                accountingPeriodEnd: cacheKeyDate, // Using Filing Date as version key
            }).onConflictDoUpdate({
                target: valuations.companyNumber,
                set: {
                    data: analysis,
                    accountingPeriodEnd: cacheKeyDate,
                    updatedAt: new Date()
                }
            });
            console.log(`💾 CACHE SAVED for ${companyNumber}`);
        } catch (saveError) {
            console.error("Failed to save to cache:", saveError);
        }

        // 6. Log the successful generation (only on fresh generation)
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

export async function generateComparisonVerdictAction(nameA: string, nameB: string, metricsA: string[], metricsB: string[]) {
    try {
        const { generateComparisonVerdictAI } = await import('@/lib/server/ai-valuation');
        const verdict = await generateComparisonVerdictAI(nameA, nameB, metricsA, metricsB);
        return { success: true, verdict };
    } catch (error: any) {
        console.error('Comparison Verdict Error:', error);
        return { success: false, error: 'Failed to generate verdict' };
    }
}
