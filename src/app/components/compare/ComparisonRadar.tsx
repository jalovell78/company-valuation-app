'use client';

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface ComparisonRadarProps {
    data: {
        subject: string;
        A: number; // Normalized (0-100)
        B: number; // Normalized (0-100)
        fullMark: number;
    }[];
    nameA: string;
    nameB: string;
}

export default function ComparisonRadar({ data, nameA, nameB }: ComparisonRadarProps) {
    // Truncate names for legend if too long
    const trunc = (s: string) => s.length > 15 ? s.substring(0, 12) + '...' : s;

    return (
        <div className="w-full h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                    <Radar
                        name={trunc(nameA)}
                        dataKey="A"
                        stroke="#2563eb" // High Contrast Blue
                        fill="#3b82f6"
                        fillOpacity={0.6}
                    />
                    <Radar
                        name={trunc(nameB)}
                        dataKey="B"
                        stroke="#ea580c" // High Contrast Orange
                        fill="#f97316"
                        fillOpacity={0.6}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
