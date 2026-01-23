import CompareSearch from '@/app/components/compare/CompareSearch';
import BackButton from '@/app/components/BackButton';
import { getCompanyProfile } from '@/lib/api';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SelectCompetitorPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const { base } = await searchParams;

    if (!base || typeof base !== 'string') {
        return <div>Invalid base company</div>;
    }

    // Fetch base company name for context
    let companyName = "the company";
    try {
        const profile = await getCompanyProfile(base);
        companyName = profile.company_name;
    } catch (e) {
        // Ignore error
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-12 px-4">
            <div className="max-w-3xl mx-auto w-full">
                <BackButton label="Cancel Comparison" />

                <div className="mt-8 text-center mb-10">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wide mb-3">
                        New Comparison
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900">Choose a Competitor</h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        Who do you want to compare <strong className="text-gray-900">{companyName}</strong> against?
                    </p>
                </div>

                <CompareSearch baseCompanyId={base} />
            </div>
        </div>
    );
}
