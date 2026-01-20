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
}

export default function ValuationSection({
    companyNumber,
    documentUrl,
    lastAccountsDate,
    accountsType,
    sourceLink
}: ValuationSectionProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIAnalysisResult | null>(null);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await generateAIValuation(companyNumber, documentUrl);
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

    // 1. RESULT STATE (AI Valuation)
    if (result) {
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

                <div className="mb-8">
                    <span className="text-indigo-200 uppercase tracking-widest text-sm font-semibold">Estimated Value</span>
                    <div className="mt-2 text-5xl font-bold font-mono">
                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency: result.currency }).format(result.valuationEstimate)}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Net Assets</p>
                        <p className="text-xl font-mono font-bold mt-1">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(result.netAssets)}
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Net Profit</p>
                        <p className="text-xl font-mono font-bold mt-1">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(result.profit)}
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-lg">
                        <p className="text-xs text-indigo-200 uppercase font-semibold">Turnover</p>
                        <p className="text-xl font-mono font-bold mt-1">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(result.turnover)}
                        </p>
                    </div>
                </div>

                {/* New Key Insights Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                    <div className="bg-white/10 p-5 rounded-lg border border-white/10">
                        <h3 className="font-semibold text-lg text-indigo-50 mb-3 border-b border-white/10 pb-2">Executive Summary</h3>
                        <p className="text-sm text-indigo-100 opacity-90 leading-relaxed italic">
                            "{result.executiveSummary}"
                        </p>
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
                        Generate an accurate valuation & executive summary based on the latest filed accounts.
                    </p>

                    <div className="mt-4 flex gap-6 text-sm text-gray-600">
                        <div>
                            <span className="block text-xs uppercase text-gray-400 font-bold">Latest Accounts</span>
                            <span className="font-mono">{lastAccountsDate}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-gray-400 font-bold">Basis</span>
                            <span className="capitalize">{accountsType.replace(/-/g, ' ')}</span>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-auto">
                    {loading ? (
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
                            ✨ Calculate Valuation with AI
                        </button>
                    )}
                    {error && (
                        <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
