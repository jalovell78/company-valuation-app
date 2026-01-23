import { fetchComparisonData, ComparisonMetric } from '@/lib/comparison';
import ComparisonHeader from '@/app/components/compare/ComparisonHeader';
import ComparisonRadar from '@/app/components/compare/ComparisonRadar';
import BackButton from '@/app/components/BackButton';
import ComparisonVerdict from '@/app/components/compare/ComparisonVerdict';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const resolvedParams = await searchParams;
    const { base, target } = resolvedParams;

    if (!base || !target || typeof base !== 'string' || typeof target !== 'string') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <h1 className="text-2xl font-bold text-gray-900">Comparison Unavailable</h1>
                    <p className="text-gray-600 mt-2">Please select two valid companies to compare.</p>
                    <BackButton label="Go Back" className="mt-6 inline-block" />
                </div>
            </div>
        );
    }

    // 1. Fetch Data (Parallel)
    let data;
    try {
        data = await fetchComparisonData(base, target);
    } catch (e) {
        return (
            <div className="p-8 text-center text-red-600">
                Failed to load comparison data. Please try again.
            </div>
        );
    }

    const { companyA, companyB, metrics } = data;

    // Helper to format values
    const formatValue = (metric: ComparisonMetric, val: any) => {
        if (metric.format === 'currency') {
            if (!val) return '£0';
            return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: "compact" }).format(val);
        }
        if (metric.format === 'date') return new Date(val).getFullYear().toString();
        return val ? val.toString() : '-';
    };

    // Helper for Metric Row (Tale of the Tape)
    const MetricRow = ({ metric }: { metric: ComparisonMetric }) => {
        // Special handling for Currency to ensure compact but readable format
        const format = (val: any) => {
            if (metric.format === 'currency') {
                if (val === null || val === undefined) return '-';
                // Short format for large numbers (e.g. £1.2M)
                return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: "compact" }).format(val);
            }
            if (metric.format === 'date') return new Date(val).getFullYear().toString();
            return val ? val.toString() : '-';
        };

        const displayA = format(metric.valueA);
        const displayB = format(metric.valueB);

        return (
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                {/* Value A */}
                <div className={`flex-1 text-left font-mono font-bold text-sm md:text-base ${metric.winner === 'A' ? 'text-green-700 bg-green-50 px-2 py-1 rounded inline-block w-fit' : 'text-gray-600 opacity-80'}`}>
                    {displayA}
                    {metric.winner === 'A' && <span className="ml-2 text-xs text-green-600">✔</span>}
                </div>

                {/* Label (Center) */}
                <div className="px-2 text-center shrink-0">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                        {metric.label}
                    </span>
                </div>

                {/* Value B */}
                <div className={`flex-1 text-right font-mono font-bold text-sm md:text-base`}>
                    <div className={`inline-block w-fit px-2 py-1 rounded ${metric.winner === 'B' ? 'text-green-700 bg-green-50' : 'text-gray-600 opacity-80'}`}>
                        {displayB}
                        {metric.winner === 'B' && <span className="ml-2 text-xs text-green-600">✔</span>}
                    </div>
                </div>
            </div>
        );
    };

    // Prepare Radar Data (Normalized 0-100)
    // We normalize each metric against the MAX of the two to create a relative shape
    const radarData = metrics.financials.map(m => {
        const valA = Number(m.valueA) || 0;
        const valB = Number(m.valueB) || 0;
        const max = Math.max(Math.abs(valA), Math.abs(valB)) || 1; // Avoid divide by zero
        return {
            subject: m.label,
            A: Math.min(100, Math.round((Math.abs(valA) / max) * 100)),
            B: Math.min(100, Math.round((Math.abs(valB) / max) * 100)),
            fullMark: 100
        };
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* 1. Sticky Header */}
            <ComparisonHeader
                nameA={companyA.company_name}
                nameB={companyB.company_name}
                idA={companyA.company_number}
                idB={companyB.company_number}
            />

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* 2. AI Verdict Section */}
                <ComparisonVerdict
                    nameA={companyA.company_name}
                    nameB={companyB.company_name}
                    metricsA={metrics.financials.map(m => `${m.label}: ${formatValue(m, m.valueA)}`)}
                    metricsB={metrics.financials.map(m => `${m.label}: ${formatValue(m, m.valueB)}`)}
                />

                {/* 3. Tale of the Tape (Financials) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-500">
                        <Link href={`/company/${companyA.company_number}`} className="flex-1 text-left text-blue-600 truncate pr-2 hover:underline">
                            {companyA.company_name}
                        </Link>
                        <span className="text-center px-2">Metric</span>
                        <Link href={`/company/${companyB.company_number}`} className="flex-1 text-right text-indigo-600 truncate pl-2 hover:underline">
                            {companyB.company_name}
                        </Link>
                    </div>
                    <div className="px-4 md:px-8">
                        {metrics.financials.map(m => <MetricRow key={m.key} metric={m} />)}
                    </div>
                </div>

                {/* 4. Visual Comparison (Chart) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest text-center mb-4">Relative Strength</h3>
                    <ComparisonRadar
                        data={radarData}
                        nameA={companyA.company_name}
                        nameB={companyB.company_name}
                    />
                    <p className="text-center text-xs text-gray-400 mt-4 italic">
                        Chart shows relative strength per metric (Outer edge = Category Leader).
                    </p>
                </div>

                {/* 5. Operational Metrics */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest text-center">Operational Stats</h3>
                    </div>
                    <div className="px-4 md:px-8">
                        {metrics.operational.map(m => <MetricRow key={m.key} metric={m} />)}
                    </div>
                </div>

            </main>
        </div>
    );
}
