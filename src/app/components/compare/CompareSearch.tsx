'use client';

import { useState } from 'react';
import { searchCompaniesAction } from '@/app/actions';
import { CompanySearchResult } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface CompareSearchProps {
    baseCompanyId: string;
}

export default function CompareSearch({ baseCompanyId }: CompareSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CompanySearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        const res = await searchCompaniesAction(query);
        if (res.success && res.data) {
            setResults(res.data.items || []);
        }
        setLoading(false);
    };

    const handleSelect = (targetId: string) => {
        if (targetId === baseCompanyId) {
            alert("You cannot compare a company against itself!");
            return;
        }
        // Redirect to comparison page
        router.push(`/compare?base=${baseCompanyId}&target=${targetId}`);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        className="w-full p-4 pl-12 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg"
                        placeholder="Search for a competitor..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="absolute left-4 text-gray-400">
                        🔍
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-3 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Search'}
                    </button>
                </div>
            </form>

            <div className="space-y-3">
                {results.map((company) => (
                    <button
                        key={company.company_number}
                        onClick={() => handleSelect(company.company_number)}
                        className="w-full text-left bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{company.title}</h3>
                                <p className="text-sm text-gray-500 mt-1 font-mono">{company.company_number}</p>
                                <p className="text-gray-600 mt-2 text-sm">
                                    {[company.address?.premises, company.address?.address_line_1, company.address?.locality, company.address?.postal_code].filter(Boolean).join(', ')}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${company.company_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {company.company_status}
                                </span>
                                <span className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm mt-2">
                                    Compare →
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
