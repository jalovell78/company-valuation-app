'use client';

import { useRouter } from 'next/navigation';

interface BackButtonProps {
    label?: string;
    fallbackRoute?: string;
    className?: string; // Allow custom styling to match existing links
}

export default function BackButton({
    label = "Back",
    fallbackRoute = "/",
    className = "text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 inline-flex cursor-pointer"
}: BackButtonProps) {
    const router = useRouter();

    const handleBack = () => {
        if (window.history.length > 2) {
            router.back();
        } else {
            router.push(fallbackRoute);
        }
    };

    return (
        <button
            onClick={handleBack}
            className={className}
            type="button"
        >
            &larr; {label}
        </button>
    );
}
