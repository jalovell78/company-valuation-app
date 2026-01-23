'use client';

import { useState, useEffect } from 'react';
// We'll impl the action later, just the UI for now

interface ComparisonVerdictProps {
    nameA: string;
    nameB: string;
    metricsA: string[];
    metricsB: string[];
}

export default function ComparisonVerdict({ nameA, nameB, metricsA, metricsB }: ComparisonVerdictProps) {
    const [verdict, setVerdict] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Connect to real server action
    const handleGenerate = async () => {
        setLoading(true);
        try {
            // Dynamically import to avoid server-action-in-client-component issues during build if strict
            const { generateComparisonVerdictAction } = await import('@/app/actions');
            const res = await generateComparisonVerdictAction(nameA, nameB, metricsA, metricsB);

            if (res.success && res.verdict) {
                setVerdict(res.verdict);
            } else {
                setVerdict("Could not generate analysis. Please try again.");
            }
        } catch (e) {
            setVerdict("Analysis failed.");
        } finally {
            setLoading(false);
        }
    };

    if (verdict) {
        return (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-lg text-indigo-200">AI Verdict</h3>
                </div>
                <p className="text-sm leading-relaxed opacity-90">
                    {verdict.split('**').map((chunk, i) =>
                        i % 2 === 1 ? <strong key={i} className="text-white bg-indigo-500/30 px-1 rounded">{chunk}</strong> : chunk
                    )}
                </p>
            </div>
        );
    }

    return (
        <div className="text-center">
            {loading ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-full text-gray-500 font-medium text-sm animate-pulse">
                    <span>✨</span> Analyzing Matchup...
                </div>
            ) : (
                <button
                    onClick={handleGenerate}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                    <span>✨</span> Analyze Winner with AI
                </button>
            )}
        </div>
    );
}
