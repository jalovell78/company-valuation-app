'use client';

import dynamic from 'next/dynamic';

const TravelMap = dynamic(
    () => import('./TravelMap'),
    {
        ssr: false,
        loading: () => <div className="h-[300px] w-full bg-gray-100 rounded-xl animate-pulse flex items-center justify-center text-gray-400">Loading Map...</div>
    }
);

export default TravelMap;
