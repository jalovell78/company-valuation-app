import { getCompanyProfile, getCompanyOfficers, getFilingHistory, CompanyProfile } from '@/lib/api';
import { extractAccountsMetadata } from '@/lib/valuation';
import { generateAIValuation } from '@/app/actions';
import { AIAnalysisResult } from '@/lib/server/ai-valuation';

export interface ComparisonMetric {
    label: string;
    key: string;
    format: 'currency' | 'number' | 'ratio' | 'string' | 'date';
    valueA: any;
    valueB: any;
    winner: 'A' | 'B' | 'DRAW' | null;
    description?: string;
}

export interface ComparisonData {
    companyA: CompanyProfile;
    companyB: CompanyProfile;
    metrics: {
        financials: ComparisonMetric[];
        operational: ComparisonMetric[];
    };
    metadataA: any;
    metadataB: any;
    aiResultA?: AIAnalysisResult;
    aiResultB?: AIAnalysisResult;
}

// Parallel fetcher for two companies
export async function fetchComparisonData(idA: string, idB: string): Promise<ComparisonData> {
    console.log(`⚔️ Fetching comparison: ${idA} vs ${idB}`);

    // 1. Fetch Basic API Data (Profile, Officers, History)
    // We do this to get the "Live" status and "Director Count" which AI doesn't track as actively
    const [profileA, officersA, historyA, profileB, officersB, historyB] = await Promise.all([
        getCompanyProfile(idA),
        getCompanyOfficers(idA),
        getFilingHistory(idA),
        getCompanyProfile(idB),
        getCompanyOfficers(idB),
        getFilingHistory(idB),
    ]);

    // 2. Fetch Deep AI Financials (Uses Cache if available)
    // This gets us the Net Assets, Profit, Cash, Debt, etc.
    const [aiResA, aiResB] = await Promise.all([
        generateAIValuation(idA, undefined, profileA.company_status),
        generateAIValuation(idB, undefined, profileB.company_status)
    ]);

    const financialA = aiResA.data;
    const financialB = aiResB.data;

    // Extract Basic Metadata
    const metaA = extractAccountsMetadata(profileA, historyA.items || []);
    const metaB = extractAccountsMetadata(profileB, historyB.items || []);

    // Helper to determine winner
    const getWinner = (valA: any, valB: any, lowerIsBetter = false): 'A' | 'B' | 'DRAW' | null => {
        if (valA === valB) return 'DRAW';
        if (valA === null || valA === undefined) return 'B';
        if (valB === null || valB === undefined) return 'A';

        if (typeof valA === 'number' && typeof valB === 'number') {
            if (lowerIsBetter) return valA < valB ? 'A' : 'B';
            return valA > valB ? 'A' : 'B';
        }
        return null;
    };

    // --- Build Metrics ---

    // 1. FINANCIAL HEALTH (From AI)
    const financialMetrics: ComparisonMetric[] = [
        {
            label: 'Net Assets',
            key: 'net_assets',
            format: 'currency',
            valueA: financialA?.netAssets,
            valueB: financialB?.netAssets,
            winner: getWinner(financialA?.netAssets, financialB?.netAssets)
        },
        {
            label: 'Net Profit',
            key: 'profit',
            format: 'currency',
            valueA: financialA?.profit ?? financialA?.estimatedProfit,
            valueB: financialB?.profit ?? financialB?.estimatedProfit,
            winner: getWinner(financialA?.profit ?? financialA?.estimatedProfit, financialB?.profit ?? financialB?.estimatedProfit)
        },
        {
            label: 'Cash at Bank',
            key: 'cash',
            format: 'currency',
            valueA: financialA?.cashAtBank,
            valueB: financialB?.cashAtBank,
            winner: getWinner(financialA?.cashAtBank, financialB?.cashAtBank)
        },
        {
            label: 'Debtors',
            key: 'debtors',
            format: 'currency',
            valueA: financialA?.debtors,
            valueB: financialB?.debtors,
            winner: getWinner(financialA?.debtors, financialB?.debtors)
        },
        {
            label: 'Turnover',
            key: 'turnover',
            format: 'currency',
            valueA: financialA?.turnover,
            valueB: financialB?.turnover,
            winner: getWinner(financialA?.turnover, financialB?.turnover)
        },
        {
            label: 'Creditors (< 1yr)',
            key: 'creditors_short',
            format: 'currency',
            valueA: financialA?.currentLiabilities,
            valueB: financialB?.currentLiabilities,
            winner: getWinner(financialA?.currentLiabilities, financialB?.currentLiabilities, true)
        },
        {
            label: 'Creditors (> 1yr)',
            key: 'creditors_long',
            format: 'currency',
            valueA: financialA?.longTermLiabilities,
            valueB: financialB?.longTermLiabilities,
            winner: getWinner(financialA?.longTermLiabilities, financialB?.longTermLiabilities, true)
        }
    ];

    // 2. OPERATIONAL & STATUS (From API)
    const dateA = new Date(profileA.date_of_creation).getTime();
    const dateB = new Date(profileB.date_of_creation).getTime();
    const accountsA = profileA.accounts as any;
    const accountsB = profileB.accounts as any;
    const overdueA = accountsA?.overdue || false;
    const overdueB = accountsB?.overdue || false;

    const operationalMetrics: ComparisonMetric[] = [
        {
            label: 'Company Status',
            key: 'status',
            format: 'string',
            valueA: profileA.company_status,
            valueB: profileB.company_status,
            winner: profileA.company_status === 'active' && profileB.company_status !== 'active' ? 'A' : (profileB.company_status === 'active' && profileA.company_status !== 'active' ? 'B' : 'DRAW')
        },
        {
            label: 'Established Year',
            key: 'age',
            format: 'date',
            valueA: profileA.date_of_creation,
            valueB: profileB.date_of_creation,
            winner: dateA < dateB ? 'A' : 'B' // Older is better
        },
        {
            label: 'Officer Count',
            key: 'directors',
            format: 'number',
            valueA: officersA.active_count || 0,
            valueB: officersB.active_count || 0,
            winner: getWinner(officersA.active_count || 0, officersB.active_count || 0)
        },
        {
            label: 'Employees',
            key: 'employees',
            format: 'string', // Often a range like "10-20"
            valueA: financialA?.employeeCount || 'Unknown',
            valueB: financialB?.employeeCount || 'Unknown',
            winner: null // Hard to score ranges numerically without parsing
        }
    ];

    return {
        companyA: profileA,
        companyB: profileB,
        metrics: {
            // Filter out metrics where both are null/0 to keep UI clean
            financials: financialMetrics,
            operational: operationalMetrics
        },
        metadataA: metaA,
        metadataB: metaB,
        aiResultA: financialA, // Pass full result in case UI needs more debug info
        aiResultB: financialB
    };
}
