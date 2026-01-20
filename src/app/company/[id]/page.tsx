
import { getCompanyProfile, getCompanyOfficers, getFilingHistory } from '@/lib/api';
import { extractAccountsMetadata } from '@/lib/valuation';
import Link from 'next/link';
import ValuationSection from '@/app/components/ValuationSection';
import { FilingHistoryItem } from '@/lib/api';

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Parallel Data Fetching
    const [profile, officers, filingHistory] = await Promise.all([
        getCompanyProfile(id),
        getCompanyOfficers(id),
        getFilingHistory(id)
    ]);

    const metadata = extractAccountsMetadata(profile, filingHistory.items || []);

    const latestAccountFiling = filingHistory.items?.find((f: FilingHistoryItem) =>
        f.category === 'accounts' &&
        (f.type === 'AA' || f.description.toLowerCase().includes('account'))
    );

    const documentUrl = latestAccountFiling?.links?.document_metadata;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Navigation */}
                <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
                    &larr; Back to Search
                </Link>

                {/* Header Card */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{profile.company_name}</h1>
                            <p className="text-gray-500 font-mono mt-1">{profile.company_number}</p>
                            <p className="text-gray-700 mt-4 max-w-lg">
                                {profile.registered_office_address.address_line_1}, {profile.registered_office_address.locality} {profile.registered_office_address.postal_code}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${profile.company_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {profile.company_status}
                            </span>
                            <p className="text-sm text-gray-500 mt-2">Incorporated: {profile.date_of_creation}</p>
                            <p className="text-sm text-gray-500">Type: {profile.type}</p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Valuation Section */}
                <ValuationSection
                    companyNumber={profile.company_number}
                    documentUrl={documentUrl}
                    lastAccountsDate={metadata.lastAccountsDate}
                    accountsType={metadata.accountsType}
                    sourceLink={metadata.sourceLink}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Directors */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Officers & Directors ({officers.active_count})</h2>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                            {officers.items && officers.items.length > 0 ? (
                                officers.items.map((officer, idx) => (
                                    <div key={idx} className="pb-4 border-b border-gray-100 last:border-0">
                                        <p className="font-semibold text-gray-800">{officer.name}</p>
                                        <p className="text-sm text-blue-600">{officer.officer_role}</p>
                                        <p className="text-xs text-gray-500 mt-1">Appointed: {officer.appointed_on}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">No officer data available.</p>
                            )}
                        </div>
                    </div>

                    {/* Filing History */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Recent Filing History</h2>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {filingHistory.items && filingHistory.items.length > 0 ? (
                                filingHistory.items.slice(0, 20).map((filing, idx) => (
                                    <div key={idx} className="flex gap-3 text-sm">
                                        <div className="text-gray-400 font-mono w-24 shrink-0">{filing.date}</div>
                                        <div>
                                            <p className="font-medium text-gray-800">{filing.description}</p>
                                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                                                {filing.type}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">No filing history available.</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
