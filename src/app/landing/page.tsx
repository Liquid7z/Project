
'use client';

// This page is now deprecated. 
// The logic has been moved to src/app/page.tsx to handle the root routing.
// This file can be safely deleted. For now, it will just show a loader and redirect.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function DeprecatedLandingPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
}
