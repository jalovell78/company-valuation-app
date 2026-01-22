'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import BackButton from '@/app/components/BackButton';
import { fetchOfficerAppointments } from '@/app/actions';
import { OfficerAppointmentsResponse } from '@/lib/api';

export default function OfficerPage() {
    const params = useParams();
    const officerId = params.id as string;
    const searchParams = useSearchParams();

    const [data, setData] = useState<OfficerAppointmentsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const hasLogged = useRef(false);

    useEffect(() => {
        hasLogged.current = false;
    }, [officerId]);

    useEffect(() => {
        async function load() {
            if (!officerId) return;
            const res = await fetchOfficerAppointments(officerId);
            if (res.success && res.data) {
                setData(res.data);

                // Log the view (Fire and forget) - verify we haven't logged this one yet
                if (res.data.name && !hasLogged.current) {
                    hasLogged.current = true;
                    import('@/app/actions/audit').then(mod => {
                        mod.logOfficerAppointView(officerId, res.data.name);
                    });
                }
            } else {
                setError(res.error || "Failed to load officer data");
            }
            setLoading(false);
        }
        load();
    }, [officerId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 font-medium">Loading Officer Profile...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center max-w-md">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        ⚠️
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Error Loading Profile</h3>
                    <p className="text-gray-500 mt-2">{error || "Officer not found"}</p>
                    <Link href="/" className="mt-6 inline-block bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                        &larr; Back to Search
                    </Link>
                </div>
            </div>
        );
    }

    // Get params mostly safely
    const q = searchParams.get('q') || '';
    const city = searchParams.get('city') || '';

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-gray-900 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            CV
                        </div>
                        <span className="font-bold text-lg tracking-tight">Company Valuation</span>
                    </Link>
                    <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                        New Search
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

                {/* Back Navigation */}
                <div className="mb-6">
                    <BackButton label="Back" />
                </div>

                {/* Profile Header */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
                                {data.date_of_birth && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
                                        Born: {data.date_of_birth.year}-{String(data.date_of_birth.month).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500">
                                Total Appointments: <span className="font-mono font-bold text-gray-900">{data.total_results}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Appointments List */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🏢</span> Associated Companies
                    </h2>

                    <div className="grid gap-4">
                        {data.items.map((appt, idx) => {
                            const isResigned = !!appt.resigned_on;
                            return (
                                <div key={idx} className={`bg-white p-6 rounded-xl shadow-sm border ${isResigned ? 'border-gray-200 bg-gray-50/50' : 'border-blue-100 hover:border-blue-300'} transition-all group`}>
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        {/* Company Info */}
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/company/${appt.appointed_to.company_number}`}
                                                    className={`text-lg font-bold hover:underline ${isResigned ? 'text-gray-700' : 'text-blue-600'}`}
                                                >
                                                    {appt.appointed_to.company_name}
                                                </Link>
                                                <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${appt.appointed_to.company_status === 'active'
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                    {appt.appointed_to.company_status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-mono mt-1">
                                                Company No: {appt.appointed_to.company_number}
                                            </p>
                                        </div>

                                        {/* Role Info */}
                                        <div className="md:text-right min-w-[200px]">
                                            <div className="flex items-center md:justify-end gap-2 mb-1">
                                                <span className="font-semibold text-gray-900">{appt.officer_role}</span>
                                                {isResigned ? (
                                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded font-bold uppercase">Resigned</span>
                                                ) : appt.appointed_to.company_status === 'dissolved' ? (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded font-bold uppercase border border-gray-200">Company Closed</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-bold uppercase">Active</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 opacity-90">
                                                <p>Appointed: {appt.appointed_on}</p>
                                                {isResigned && (
                                                    <p className="text-red-700/70 font-medium">Resigned: {appt.resigned_on}</p>
                                                )}
                                                {!isResigned && appt.appointed_to.company_status === 'dissolved' && (
                                                    <p className="text-gray-400 text-xs mt-1">(Role ended with company closure)</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {!isResigned && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                            <Link
                                                href={`/company/${appt.appointed_to.company_number}`}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                            >
                                                View Company Valuation &rarr;
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>
        </div>
    );
}
