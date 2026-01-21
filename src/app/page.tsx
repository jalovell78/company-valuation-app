'use client';

import { useState, useEffect, Suspense } from 'react';
import { searchCompaniesAction, fetchOfficers } from './actions';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompanySearchResult, OfficerSearchResult } from '@/lib/api';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = (searchParams.get('type') === 'officer') ? 'officer' : 'company';

  const [activeTab, setActiveTab] = useState<'company' | 'officer'>(initialTab);

  // Search Inputs
  const [query, setQuery] = useState(initialQuery);
  // Optional officer inputs - purely for appending to query string
  const [officerName, setOfficerName] = useState(initialQuery);
  const [officerCity, setOfficerCity] = useState('');

  // Results
  const [companyResults, setCompanyResults] = useState<CompanySearchResult[]>([]);
  const [officerResults, setOfficerResults] = useState<OfficerSearchResult[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Sync state with URL on load/change
  useEffect(() => {
    setActiveTab((searchParams.get('type') === 'officer') ? 'officer' : 'company');
    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';

    setQuery(q);
    if (activeTab === 'officer') {
      setOfficerName(q);
      setOfficerCity(city);
    }
  }, [searchParams]);

  // Initial Auto-Search
  useEffect(() => {
    if (initialQuery && !hasSearched) {
      const initialCity = searchParams.get('city') || '';
      performSearch(initialQuery, initialTab, initialCity);
    }
  }, [initialQuery, initialTab]);

  const performSearch = async (searchQuery: string, type: 'company' | 'officer', cityFilter: string = '') => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    // Clear previous results of the other type to avoid confusion
    if (type === 'company') setOfficerResults([]);
    else setCompanyResults([]);

    try {
      if (type === 'company') {
        const res = await searchCompaniesAction(searchQuery);
        if (res.success && res.data) {
          setCompanyResults(res.data.items || []);
        } else {
          setError(res.error || 'Something went wrong');
        }
      } else {
        // Pass only the name to the API
        const res = await fetchOfficers(searchQuery);
        if (res.success && res.data) {
          let items = res.data.items || [];

          // Client-side filter by city if provided
          if (cityFilter.trim()) {
            const cityLower = cityFilter.toLowerCase().trim();
            items = items.filter(item => {
              // Check address fields
              const addressStr = [
                item.address?.locality,
                item.address?.postal_code,
                item.address?.address_line_1,
                item.address?.premises
              ].filter(Boolean).join(' ').toLowerCase();

              return addressStr.includes(cityLower);
            });
          }
          setOfficerResults(items);
        } else {
          setError(res.error || 'Something went wrong');
        }
      }
    } catch (err) {
      setError('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // For officer search, we use officerName as the query, and officerCity as a filter
    // For company search, we use query
    const finalQuery = (activeTab === 'officer') ? officerName : query;
    const finalCity = (activeTab === 'officer') ? officerCity : '';

    if (!finalQuery.trim()) return;

    // Update URL
    const params = new URLSearchParams();
    params.set('q', finalQuery);
    params.set('type', activeTab);
    if (finalCity) params.set('city', finalCity);

    router.push(`/?${params.toString()}`);
    performSearch(finalQuery, activeTab, finalCity);
  };

  // Tab switcher helper
  const switchTab = (tab: 'company' | 'officer') => {
    setActiveTab(tab);
    setHasSearched(false);
    setCompanyResults([]);
    setOfficerResults([]);
    setError('');
    // Optional: Clear inputs or keep them? Keeping them feels better if just switching context
    // setQuery(''); 
  };

  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">Company Valuation Search</h1>
      <p className="text-center text-gray-500 mb-8">Search for UK Companies or Directors</p>

      {/* TABS */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm inline-flex">
          <button
            onClick={() => switchTab('company')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'company'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            🏢 Search Companies
          </button>
          <button
            onClick={() => switchTab('officer')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'officer'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            👤 Search Officers
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {activeTab === 'company' ? (
            <input
              type="text"
              className="flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Company name or number (e.g. Tesco)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : (
            <>
              <input
                type="text"
                className="flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Officer Name (e.g. John Smith)"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
              />
              <input
                type="text"
                className="md:w-1/3 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="City/Town (Optional)"
                value={officerCity}
                onChange={(e) => setOfficerCity(e.target.value)}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {activeTab === 'officer' && (
          <p className="text-xs text-gray-400 mt-2 ml-1">
            Tip: Adding a city helps narrow down common names.
          </p>
        )}
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200 text-center">
          {error}
        </div>
      )}

      {/* RESULTS List */}
      <div className="space-y-4">

        {hasSearched && !loading && !error && (
          <p className="text-sm text-gray-500 font-medium px-1">
            Found {activeTab === 'company' ? companyResults.length : officerResults.length} results
          </p>
        )}

        {/* COMPANY RESULTS */}
        {activeTab === 'company' && companyResults.map((company) => (
          <Link
            href={`/company/${company.company_number}?q=${encodeURIComponent(query)}`}
            key={company.company_number}
            className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{company.title}</h2>
                <p className="text-sm text-gray-500 mt-1 font-mono">{company.company_number}</p>
                <p className="text-gray-600 mt-2 text-sm">
                  {[company.address?.premises, company.address?.address_line_1, company.address?.locality, company.address?.postal_code].filter(Boolean).join(', ')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${company.company_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                {company.company_status}
              </span>
            </div>
          </Link>
        ))}

        {/* OFFICER RESULTS */}
        {activeTab === 'officer' && officerResults.map((officer, idx) => {
          // Extract the ID safely using Regex to avoid issues with trailing slashes
          // Expected format: /officers/{id}
          const match = officer.links?.self?.match(/\/officers\/([^/?]+)/);
          const officerId = match ? match[1] : null;

          if (!officerId) return null; // Skip if no ID found

          return (
            <Link
              href={`/officer/${officerId}?q=${encodeURIComponent(officerName)}&city=${encodeURIComponent(officerCity)}`}
              key={idx}
              className="block bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{officer.title}</h2>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    {officer.date_of_birth && (
                      <span className="flex items-center gap-1">
                        🎂 Born: <span className="font-medium text-gray-900">{officer.date_of_birth.year}-{String(officer.date_of_birth.month).padStart(2, '0')}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      🏢 Appointments: <span className="font-medium text-gray-900">{officer.appointment_count}</span>
                    </span>
                  </div>
                  <p className="text-gray-500 mt-2 text-sm">
                    {[officer.address?.premises, officer.address?.address_line_1, officer.address?.locality, officer.address?.postal_code].filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className="text-2xl opacity-10 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600">
                  &rarr;
                </span>
              </div>
            </Link>
          )
        })}

        {!loading && hasSearched && !error && (
          (activeTab === 'company' && companyResults.length === 0) ||
          (activeTab === 'officer' && officerResults.length === 0)
        ) && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No results found.</p>
              <p className="text-gray-400 text-sm">Try adjusting your spelling or location.</p>
            </div>
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
