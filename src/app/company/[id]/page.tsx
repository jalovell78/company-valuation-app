
import { getCompanyProfile, getCompanyOfficers, getFilingHistory } from '@/lib/api';
import { extractAccountsMetadata } from '@/lib/valuation';
import Link from 'next/link';
import ValuationSection from '@/app/components/ValuationSection';
import DynamicMap from '@/app/components/DynamicMap';
import BackButton from '@/app/components/BackButton';
import { FilingHistoryItem } from '@/lib/api';

// Helper to format address
function formatAddress(address: any) {
    if (!address) return "";
    const parts = [
        address.premises,
        address.address_line_1,
        address.address_line_2,
        address.locality,
        address.region,
        address.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
}

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams?.q as string | undefined;

    const backLink = query ? `/?q=${encodeURIComponent(query)}` : '/';

    // Parallel Data Fetching
    const [profile, officers, filingHistory] = await Promise.all([
        getCompanyProfile(id),
        getCompanyOfficers(id),
        getFilingHistory(id)
    ]);

    // Log the view (Fire and forget)
    // We import dynamically or use the helper which handles auth check
    const { logAction } = await import("@/lib/audit");
    logAction("VIEW_COMPANY", {
        companyNumber: profile.company_number,
        companyName: profile.company_name
    });

    const metadata = extractAccountsMetadata(profile, filingHistory.items || []);

    const latestAccountFiling = filingHistory.items?.find((f: FilingHistoryItem) =>
        f.category === 'accounts' &&
        (f.type === 'AA' || f.description.toLowerCase().includes('account'))
    );

    const documentUrl = latestAccountFiling?.links?.document_metadata;

    // Construct direct PDF viewer link for the source filing
    const transactionId = latestAccountFiling?.links?.self?.split('/').pop();
    const sourcePdfLink = transactionId && documentUrl
        ? `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}/filing-history/${transactionId}/document?format=pdf&download=0`
        : metadata.sourceLink; // Fallback to generic history page if not found

    const session = await import("@/auth").then(mod => mod.auth());
    const isLoggedIn = !!session?.user;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Navigation */}
                <BackButton label="Back" />

                {/* Header Card */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{profile.company_name}</h1>
                            <p className="text-gray-500 font-mono mt-1">{profile.company_number}</p>
                            <p className="text-gray-700 mt-4 max-w-lg">
                                {formatAddress(profile.registered_office_address)}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${profile.company_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {profile.company_status}
                            </span>
                            <p className="text-sm text-gray-500 mt-2">Incorporated: {profile.date_of_creation}</p>
                            <p className="text-sm text-gray-500">Type: {profile.type}</p>
                        </div>
                    </div>

                    {/* Travel Map Section - Moved to full width row below the header info */}
                    <div className="mt-8 border-t border-gray-100 pt-8">
                        <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">Travel & Location</h3>
                        <DynamicMap
                            destinationAddress={formatAddress(profile.registered_office_address)}
                            companyName={profile.company_name}
                        />
                    </div>
                </div>

                {/* Dynamic Valuation Section */}
                <ValuationSection
                    companyNumber={profile.company_number}
                    documentUrl={documentUrl}
                    lastAccountsDate={metadata.lastAccountsDate}
                    accountsType={metadata.accountsType}
                    sourceLink={sourcePdfLink}
                    companyStatus={profile.company_status}
                    incorporationDate={profile.date_of_creation}
                    companyType={profile.type}
                    sicCodes={profile.sic_codes}
                    dissolvedDate={profile.date_of_cessation}
                    isLoggedIn={isLoggedIn}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Directors */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Officers & Directors ({officers.active_count} Active)</h2>
                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                            {officers.items && officers.items.length > 0 ? (
                                officers.items
                                    .sort((a, b) => {
                                        // Sort by Active first (no resigned_on date), then by appointed date (newest first)
                                        if (!a.resigned_on && b.resigned_on) return -1;
                                        if (a.resigned_on && !b.resigned_on) return 1;
                                        return new Date(b.appointed_on).getTime() - new Date(a.appointed_on).getTime();
                                    })
                                    .map((officer, idx) => {
                                        const isResigned = !!officer.resigned_on;
                                        // Extract ID from /officers/{id}/appointments
                                        const match = officer.links?.officer?.appointments?.match(/\/officers\/([^/?]+)/);
                                        const officerId = match ? match[1] : null;

                                        return (
                                            <div key={idx} className={`pb-4 border-b border-gray-100 last:border-0 ${isResigned ? 'opacity-60' : ''}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        {officerId ? (
                                                            <Link href={`/officer/${officerId}`} className={`font-semibold hover:underline hover:text-blue-600 ${isResigned ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                {officer.name}
                                                            </Link>
                                                        ) : (
                                                            <p className={`font-semibold ${isResigned ? 'text-gray-500' : 'text-gray-900'}`}>{officer.name}</p>
                                                        )}
                                                        <p className="text-sm text-blue-600">{officer.officer_role}</p>
                                                    </div>
                                                    {isResigned ? (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded border border-gray-200 uppercase">Resigned</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded border border-green-200 uppercase">Active</span>
                                                    )}
                                                </div>

                                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        🗓 Appointed: <span className="font-mono text-gray-700">{officer.appointed_on}</span>
                                                    </span>
                                                    {isResigned && (
                                                        <span className="flex items-center gap-1 text-red-400">
                                                            👋 Resigned: <span className="font-mono text-red-500">{officer.resigned_on}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
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
                                filingHistory.items.slice(0, 20).map((filing, idx) => {
                                    // Construct the viewer link using the transaction ID from links.self
                                    // filing.links?.self format: /company/{number}/filing-history/{transactionId}
                                    const transactionId = filing.links?.self?.split('/').pop();
                                    const viewerLink = transactionId && filing.links?.document_metadata
                                        ? `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}/filing-history/${transactionId}/document?format=pdf&download=0`
                                        : null;

                                    return (
                                        <div key={idx} className="flex gap-3 text-sm group">
                                            <div className="text-gray-400 font-mono w-24 shrink-0">{filing.date}</div>
                                            <div>
                                                {viewerLink ? (
                                                    <a
                                                        href={viewerLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-medium text-gray-800 group-hover:text-blue-600 group-hover:underline transition-colors block"
                                                    >
                                                        {filing.description}
                                                    </a>
                                                ) : (
                                                    <p className="font-medium text-gray-800">{filing.description}</p>
                                                )}

                                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                                                    {filing.type}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
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
