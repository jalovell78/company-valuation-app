'use client';

import Link from 'next/link';

interface ComparisonHeaderProps {
    nameA: string;
    nameB: string;
    idA: string;
    idB: string;
}

export default function ComparisonHeader({ nameA, nameB, idA, idB }: ComparisonHeaderProps) {
    // Helper to truncate names for mobile
    const shortName = (name: string) => name.replace(/(Limited|Ltd|LLP|PLC)/gi, '').trim();

    return (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm transition-all">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

                {/* Company A (Left) */}
                <div className="flex-1 text-left">
                    <Link href={`/company/${idA}`} className="group block">
                        <h2 className="text-sm md:text-lg font-bold text-blue-700 truncate group-hover:underline" title={nameA}>
                            {shortName(nameA)}
                        </h2>
                    </Link>
                    <div className="h-1 w-8 bg-blue-600 rounded-full mt-1"></div>
                </div>

                {/* VS Badge */}
                <div className="shrink-0 px-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white font-black text-xs italic shadow-lg">
                        VS
                    </span>
                </div>

                {/* Company B (Right) */}
                <div className="flex-1 text-right">
                    <Link href={`/company/${idB}`} className="group block">
                        <h2 className="text-sm md:text-lg font-bold text-indigo-700 truncate group-hover:underline" title={nameB}>
                            {shortName(nameB)}
                        </h2>
                    </Link>
                    <div className="h-1 w-8 bg-indigo-600 rounded-full mt-1 ml-auto"></div>
                </div>

            </div>
            {/* Quick Back Link */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden md:block">
                <Link href="/" className="text-gray-400 hover:text-gray-600">← Exit</Link>
            </div>
        </div>
    );
}
