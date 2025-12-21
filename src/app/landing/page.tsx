
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader } from 'lucide-react';

export default function RootPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (isUserLoading) {
            // Wait until the user status is resolved
            return;
        }

        if (user) {
            // If user is logged in, redirect to the notes page
            router.replace('/dashboard/notes');
        } else {
            // If user is not logged in, redirect to the landing page
            router.replace('/');
        }
    }, [isUserLoading, user, router]);

    // Show a full-page loader while determining the user's status
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
}
