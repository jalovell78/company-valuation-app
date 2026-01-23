'use client';

import { useState } from 'react';
import { generateAIValuation } from '@/app/actions';
import { AIAnalysisResult } from '@/lib/server/ai-valuation';

interface ValuationSectionProps {
    companyNumber: string;
    documentUrl?: string;
    lastAccountsDate: string;
    accountsType: string;
    sourceLink?: string;
    companyStatus: string;
    incorporationDate?: string;
    dissolvedDate?: string;
    companyType?: string;
    sicCodes?: string[];
    isLoggedIn?: boolean;
}

// Helper to render stars
function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-1" title={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-xl">
                    {rating >= star ? (
                        <span className="text-yellow-400">★</span> // Full
                    ) : rating >= star - 0.5 ? (
                        <span className="text-yellow-400 opacity-80">★</span> // Half
                    ) : (
                        <span className="text-gray-600">★</span> // Empty
                    )}
                </span>
            ))}
            <span className="text-sm text-indigo-200 ml-2 font-mono">({rating}/5)</span>
        </div>
    );
}

// Helper for currency formatting with fallback
function formatCurrencyOrFallback(value: number | null | undefined, currency: string) {
    if (value === null || value === undefined) {
        return <span className="text-indigo-300/50 text-base italic font-normal">Not Disclosed</span>;
    }
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency, notation: "compact" }).format(value);
}

export default function ValuationSection({
    companyNumber,
    documentUrl,
    lastAccountsDate,
    accountsType,
    sourceLink,
    companyStatus,
    incorporationDate,
    dissolvedDate,
    companyType,
    sicCodes,
    isLoggedIn = false
}: ValuationSectionProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!isLoggedIn) return; // Client-side guard

        setLoading(true);
        setError('');

        try {
            // Pass companyStatus to help AI determine tense (past/present)
            const res = await generateAIValuation(companyNumber, documentUrl, companyStatus);
            if (res.success && res.data) {
                setResult(res.data);
            } else {
                setError(res.error || "Failed to analyze");
            }
        } catch (e) {
            setError("Analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const isActive = companyStatus === 'active';
    const isDissolved = companyStatus === 'dissolved' || companyStatus === 'liquidation';
    const isDormant = accountsType.toLowerCase().includes('dormant');
    const isRateLimit = error === 'RATE_LIMIT_EXCEEDED';

    // 1. RESULT STATE (AI Valuation)
    if (result) {
        // ... (Keep existing result rendering logic) ...
        return (
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-8 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start mb-6 border-b border-white/20 pb-4">
                    <div>
                        <h2 className="text-xl font-semibold opacity-90">AI-Powered Valuation</h2>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold uppercase ${result.confidence === 'High' ? 'bg-green-400/20 text-green-100' : 'bg-yellow-400/20 text-yellow-100'
                            }`}>
                            {result.confidence} Confidence
                        </span>
                    </div>
                    {sourceLink && (
                        <a
                            href={sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            View Source Filing &rarr;
                        </a>
                    )}
                </div>

                {/* Valuation Range Logic */}
                {isDissolved ? (
                    <div className="mb-8 p-6 bg-white/5 rounded-lg border border-white/10 text-center">
                        <span className="text-red-200 uppercase tracking-widest text-sm font-semibold block mb-2">Valuation Not Applicable</span>
                        <div className="inline-block px-4 py-2 bg-red-500/20 text-red-100 rounded-lg text-sm">
                            ⚠️ This company is <strong>{companyStatus}</strong>.
                        </div>
                        <p className="text-indigo-200 text-sm mt-3 max-w-lg mx-auto">
                            The valuation model is not applicable for dissolved or liquidated companies, as they are no longer trading entities. However, you can view the historical data below.
                        </p>
                    </div>
                ) : (
                    <div className="mb-8 p-6 bg-white/10 rounded-lg border border-white/20 text-center">
                        <span className="text-indigo-200 uppercase tracking-widest text-sm font-semibold">Estimated Valuation Range</span>
                        <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
                            <div>
                                <p className="text-sm text-indigo-300 mb-1">Conservative</p>
                                <span className="text-3xl md:text-5xl font-bold font-mono">
                                    {new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency, maximumFractionDigits: 0 }).format(result.valuationLow)}
                                </span>
                            </div>
                            <span className="text-2xl text-indigo-400 font-light">—</span>
                            <div>
                                <p className="text-sm text-indigo-300 mb-1">High-End</p>
                                <span className="text-3xl md:text-5xl font-bold font-mono">
                                    {new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency, maximumFractionDigits: 0 }).format(result.valuationHigh)}
                                </span>
                            </div>
                        </div>

                        {/* Multiplier & Methodology Display */}
                        {result.valuationMultiplier && (
                            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-3 text-xs md:text-sm text-indigo-200">
                                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-100 rounded border border-indigo-500/30 font-mono">
                                    {result.valuationMultiplier}x Multiplier Applied
                                </span>
                                <span className="opacity-75 italic text-center md:text-left">
                                    {result.valuationMethodology}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Financial Pillars */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Net Assets</p>
                        <p className="text-lg font-mono font-bold mt-1">
                            {formatCurrencyOrFallback(result.netAssets, 'GBP')}
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Net Profit</p>
                        {/* Show Imputed Profit distinction if explicit profit is null but we have an estimate */}
                        <p className="text-lg font-mono font-bold mt-1">
                            {formatCurrencyOrFallback(result.profit, 'GBP')}
                        </p>
                        {!result.profit && result.estimatedProfit > 0 && (
                            <span className="text-[10px] text-green-300 bg-green-900/40 px-1 py-0.5 rounded">
                                Est: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: "compact" }).format(result.estimatedProfit)}
                            </span>
                        )}
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Turnover</p>
                        <p className="text-lg font-mono font-bold mt-1">
                            {formatCurrencyOrFallback(result.turnover, 'GBP')}
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Employees</p>
                        <p className="text-lg font-mono font-bold mt-1">
                            {result.employeeCount}
                        </p>
                    </div>
                </div>

                {/* Insight Components Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Left Column: Business Profile & Fact Sheets */}
                    <div className="space-y-6">
                        {/* Sector & Business Profile */}
                        <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                            <h3 className="font-semibold text-lg text-indigo-50 mb-3 border-b border-white/10 pb-2">About the Business</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Industry Sector</span>
                                    <p className="text-indigo-100 font-medium">{result.sector}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {sicCodes?.map(code => (
                                            <span key={code} className="text-xs bg-indigo-900/50 text-indigo-200 px-2 py-1 rounded border border-indigo-700/50">
                                                SIC: {code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-indigo-300 uppercase tracking-wider font-bold">Principal Activity</span>
                                    <p className="text-sm text-indigo-100 opacity-90 mt-1">
                                        {result.businessDescription}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Debt & Credit Position */}
                        <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                            <h3 className="font-semibold text-lg text-indigo-50 mb-3 border-b border-white/10 pb-2">Debt & Credit Position</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-xs uppercase text-green-200/70 font-bold mb-1">Cash at Bank</span>
                                    <span className="font-mono text-green-100 font-bold text-base">
                                        {formatCurrencyOrFallback(result.cashAtBank, 'GBP')}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs uppercase text-indigo-200/70 font-bold mb-1">Debtors (Owed)</span>
                                    <span className="font-mono text-indigo-100 font-bold text-base">
                                        {formatCurrencyOrFallback(result.debtors, 'GBP')}
                                    </span>
                                </div>

                                <div className="border-t border-white/10 pt-3">
                                    <span className="block text-xs uppercase text-red-200/70 font-bold mb-1">Short Term Debt</span>
                                    <span className="font-mono text-red-100 font-bold text-base">
                                        {formatCurrencyOrFallback(result.currentLiabilities, 'GBP')}
                                    </span>
                                    <span className="text-[10px] text-red-200/50 block leading-tight mt-1">Due &lt; 1 Year</span>
                                </div>
                                <div className="border-t border-white/10 pt-3">
                                    <span className="block text-xs uppercase text-red-200/70 font-bold mb-1">Long Term Debt</span>
                                    <span className="font-mono text-red-100 font-bold text-base">
                                        {formatCurrencyOrFallback(result.longTermLiabilities, 'GBP')}
                                    </span>
                                    <span className="text-[10px] text-red-200/50 block leading-tight mt-1">Due &gt; 1 Year</span>
                                </div>
                            </div>
                        </div>

                        {/* Key Info / Stats */}
                        <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                            <h3 className="font-semibold text-lg text-indigo-50 mb-3 border-b border-white/10 pb-2">Key Information</h3>
                            <div className="flex flex-col gap-3 text-sm text-indigo-200">
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="opacity-50 uppercase">Incorporated</span>
                                    <span className="font-mono text-white">{incorporationDate}</span>
                                </div>
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span className="opacity-50 uppercase">Company Type</span>
                                    <span className="text-white capitalize">{companyType?.replace(/-/g, ' ')}</span>
                                </div>
                                {/* Dissolved Date Row (Conditional) */}
                                {dissolvedDate && (
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="opacity-75 uppercase text-red-200 font-semibold">Dissolved Date</span>
                                        <span className="font-mono text-red-100">{dissolvedDate}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="opacity-50 uppercase">Data Source</span>
                                    <span className="text-white">{lastAccountsDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Financial Health & Highlights */}
                    <div className="space-y-6">
                        {/* Financial Health & Rating */}
                        <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-3">
                                <h3 className="font-semibold text-lg text-indigo-50">Financial Health</h3>
                                <StarRating rating={result.starRating || 0} />
                            </div>

                            <p className="text-sm text-indigo-100 opacity-90 leading-relaxed italic">
                                "{result.executiveSummary}"
                            </p>
                        </div>

                        {/* Key Highlights */}
                        <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                            <h3 className="font-semibold text-lg text-indigo-50 mb-3 border-b border-white/10 pb-2">Key Highlights</h3>
                            <ul className="space-y-2">
                                {result.keyHighlights.map((point, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-indigo-100 opacity-90">
                                        <span className="text-indigo-400 mt-1">•</span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        );
    }

    // 2. INITIAL STATE (Call to Action)
    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Company Valuation</h2>
                    <p className="text-gray-500 mt-1">
                        Generate an accurate valuation range & executive summary based on the latest filed accounts.
                    </p>

                    <div className="mt-4 space-y-3">
                        <div className="flex gap-6 text-sm text-gray-600">
                            <div>
                                <span className="block text-xs uppercase text-gray-400 font-bold">Latest Accounts</span>
                                <span className="font-mono">{lastAccountsDate}</span>
                            </div>
                            <div>
                                <span className="block text-xs uppercase text-gray-400 font-bold">Basis</span>
                                <span className="capitalize">{accountsType.replace(/-/g, ' ')}</span>
                            </div>
                        </div>

                        {isDormant && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 text-sm font-medium">
                                <span className="text-lg">⚠️</span>
                                <span>Dormant Company: Valuation based on Assets only.</span>
                            </div>
                        )}

                        {!isActive && !isDissolved && (
                            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded border border-gray-200 font-bold uppercase">
                                Company Status: {companyStatus}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full md:w-auto">
                    {!isActive ? (
                        <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium border border-gray-200 text-center">
                            Valuation Unavailable <br />
                            <span className="text-xs uppercase font-bold tracking-wider">(Company {companyStatus})</span>
                        </div>
                    ) : !isLoggedIn ? (
                        <div className="flex flex-col items-center gap-2">
                            <a
                                href="/login"
                                className="w-full md:w-auto bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                🔒 Sign in to Unlock Valuation
                            </a>
                            <p className="text-xs text-gray-500">Free account required for analysis</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-lg font-medium border border-indigo-100 animate-pulse">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing PDF...
                        </div>
                    ) : (
                        <button
                            onClick={handleAnalyze}
                            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            ✨ AI Company Valuation
                        </button>
                    )}

                    {/* Graceful Error Handling UI */}
                    {error && (
                        <div className={`mt-3 p-3 rounded-lg text-sm border ${isRateLimit
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {isRateLimit ? (
                                <>
                                    <p className="font-bold flex items-center gap-2">
                                        <span>⏳</span> Server Busy
                                    </p>
                                    <p className="mt-1">
                                        We are experiencing high demand (API Quota Exceeded). Please wait <strong>60 seconds</strong> and try again.
                                    </p>
                                </>
                            ) : (
                                <p>{error}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
