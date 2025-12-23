
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader } from 'lucide-react';

export default function DashboardRootPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isUserLoading) {
            return;
        }
        // Always redirect from the root dashboard page to the sticky notes page
        router.replace('/dashboard/sticky-notes');
    }, [isUserLoading, user, router]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
}
