'use client';

import { useState, useEffect, Suspense } from 'react';
import { searchCompaniesAction } from './actions';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchResult {
  title: string;
  company_number: string;
  company_status: string;
  address: {
    premises?: string;
    address_line_1: string;
    locality: string;
    postal_code: string;
  };
  kind: string;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Effect to perform search if URL has query on load (and haven't searched yet)
  useEffect(() => {
    if (initialQuery && !hasSearched) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await searchCompaniesAction(searchQuery);
      if (res.success && res.data) {
        setResults(res.data.items || []);
      } else {
        setError(res.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to perform search');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Update URL without reloading
    router.push(`/?q=${encodeURIComponent(query)}`);
    performSearch(query);
  };

  return (
    <div className="w-full max-w-3xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Company Valuation Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          className="flex-1 p-4 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
          placeholder="Search for a company (e.g. Tesco)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {results.map((company) => (
          <Link
            href={`/company/${company.company_number}?q=${encodeURIComponent(query)}`}
            key={company.company_number}
            className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{company.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{company.company_number}</p>
                <p className="text-gray-600 mt-2">
                  {[company.address?.premises, company.address?.address_line_1, company.address?.locality, company.address?.postal_code].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${company.company_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                {company.company_status}
              </span>
            </div>
          </Link>
        ))}

        {!loading && results.length === 0 && hasSearched && !error && (
          <p className="text-center text-gray-500">No results found.</p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
      <Suspense fallback={<div>Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
